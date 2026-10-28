/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import {
  InvestigationStatusService,
  assertNoUnexpectedProposals,
  ProposalDismissFailedError,
} from './investigation_status_service';
import { CloseTargetsChangedError } from './close_targets_changed_error';
import { INVESTIGATION_TEMPLATE_ID } from '../../../common/escalations/constants';

const logger = loggingSystemMock.createLogger();
const request = httpServerMock.createKibanaRequest();
const SPACE_ID = 'default';

const MOCK_CONVERSATION = {
  id: 'conv-1',
  title: 'Test investigation',
  template_id: INVESTIGATION_TEMPLATE_ID,
};

// ---------------------------------------------------------------------------
// assertNoUnexpectedProposals (pure helper)
// ---------------------------------------------------------------------------

describe('assertNoUnexpectedProposals', () => {
  const pending = [
    { id: 'p-1', action_name: null },
    { id: 'p-2', action_name: 'Block IP' },
  ];

  it('does nothing when expectedIds is undefined (backwards compat)', () => {
    expect(() => assertNoUnexpectedProposals(pending, undefined)).not.toThrow();
  });

  it('does nothing when all pending ids are in the expected set', () => {
    expect(() =>
      assertNoUnexpectedProposals(pending, ['p-1', 'p-2', 'p-already-decided'])
    ).not.toThrow();
  });

  it('throws CloseTargetsChangedError when a pending id was not expected', () => {
    expect(() => assertNoUnexpectedProposals(pending, ['p-1'])).toThrow(CloseTargetsChangedError);
  });

  it('passes when pending is empty regardless of the expected set', () => {
    expect(() => assertNoUnexpectedProposals([], ['p-1'])).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// InvestigationStatusService.getPreview
// ---------------------------------------------------------------------------

describe('InvestigationStatusService.getPreview', () => {
  const makeDeps = (
    proposalListResult: Array<{
      id: string;
      action?: { name?: string };
      actionWorkflowId?: string;
    }>,
    runningCount = 0
  ) => {
    const proposalsService = {
      // The pending read and the running read share this method and differ by `status`.
      list: jest
        .fn()
        .mockImplementation(async ({ status }: { status: string }) =>
          status === 'executing'
            ? { proposals: [], total: runningCount }
            : { proposals: proposalListResult, total: proposalListResult.length }
        ),
    };
    const proposals = {
      getProposalsService: () => proposalsService,
      getProposalPrivileges: () => ({
        assertCanRead: jest.fn().mockResolvedValue(undefined),
        assertCanManage: jest.fn().mockResolvedValue(undefined),
      }),
    };
    const client = {
      get: jest.fn().mockResolvedValue(MOCK_CONVERSATION),
      patchMetadata: jest.fn(),
    };
    const getConversationClient = jest.fn().mockResolvedValue(client);
    const getProposals = jest.fn().mockReturnValue(proposals);
    const getSpaceId = jest.fn().mockReturnValue(SPACE_ID);

    const service = new InvestigationStatusService({
      getConversationClient,
      getProposals,
      getSpaceId,
      logger,
    });

    return { service, proposalsService };
  };

  it('maps action name from action.name', async () => {
    const { service, proposalsService } = makeDeps([{ id: 'p-1', action: { name: 'Block IP' } }]);
    const result = await service.getPreview(request, 'conv-1');
    expect(result.pending_proposals).toEqual([{ id: 'p-1', action_name: 'Block IP' }]);
    expect(proposalsService.list).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'conv-1', status: 'pending' }),
      SPACE_ID,
      request
    );
  });

  it('counts the approved proposals whose action is still running', async () => {
    const { service } = makeDeps([], 2);
    const result = await service.getPreview(request, 'conv-1');
    expect(result.running_proposal_count).toBe(2);
    expect(result.pending_proposal_count).toBe(0);
  });

  it('reads the running proposals without the deadline filter, since a running one keeps its deadline', async () => {
    const { service, proposalsService } = makeDeps([], 1);
    await service.getPreview(request, 'conv-1');
    expect(proposalsService.list).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv-1',
        status: 'executing',
        excludeSuperseded: true,
        excludeExpired: false,
      }),
      SPACE_ID,
      request
    );
  });

  it('reports no running proposals when none are running', async () => {
    const { service } = makeDeps([{ id: 'p-1' }]);
    const result = await service.getPreview(request, 'conv-1');
    expect(result.running_proposal_count).toBe(0);
  });

  it('falls back to actionWorkflowId when action is absent', async () => {
    const { service } = makeDeps([{ id: 'p-2', actionWorkflowId: 'wf-123' }]);
    const result = await service.getPreview(request, 'conv-1');
    expect(result.pending_proposals).toEqual([{ id: 'p-2', action_name: 'wf-123' }]);
  });

  it('sets action_name to null when neither action nor actionWorkflowId is present', async () => {
    const { service } = makeDeps([{ id: 'p-3' }]);
    const result = await service.getPreview(request, 'conv-1');
    expect(result.pending_proposals).toEqual([{ id: 'p-3', action_name: null }]);
  });

  it('includes pending_proposal_count matching the list length', async () => {
    const { service } = makeDeps([
      { id: 'p-1', action: { name: 'A' } },
      { id: 'p-2', action: { name: 'B' } },
    ]);
    const result = await service.getPreview(request, 'conv-1');
    expect(result.pending_proposal_count).toBe(2);
    expect(result.pending_proposals).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// InvestigationStatusService.setStatus — expected_proposal_ids check
// ---------------------------------------------------------------------------

describe('InvestigationStatusService.setStatus — expected_proposal_ids', () => {
  const makeService = (pendingIds: string[]) => {
    const proposalsService = {
      list: jest.fn().mockResolvedValue({
        proposals: pendingIds.map((id) => ({ id })),
        total: pendingIds.length,
      }),
      bulkDismiss: jest.fn().mockResolvedValue({ released: pendingIds, skipped: [], failed: [] }),
    };
    const proposals = {
      getProposalsService: () => proposalsService,
      getProposalPrivileges: () => ({
        assertCanRead: jest.fn().mockResolvedValue(undefined),
        assertCanManage: jest.fn().mockResolvedValue(undefined),
      }),
    };
    const client = {
      get: jest.fn().mockResolvedValue(MOCK_CONVERSATION),
      patchMetadata: jest.fn().mockResolvedValue({ conversation: MOCK_CONVERSATION }),
    };
    const service = new InvestigationStatusService({
      getConversationClient: jest.fn().mockResolvedValue(client),
      getProposals: jest.fn().mockReturnValue(proposals),
      getSpaceId: jest.fn().mockReturnValue(SPACE_ID),
      logger,
    });
    return { service, proposalsService, client };
  };

  it('throws CloseTargetsChangedError when a pending proposal was not expected', async () => {
    const { service } = makeService(['p-1', 'p-surprise']);
    await expect(
      service.setStatus(request, 'conv-1', {
        status: 'closed',
        dismiss_reason: 'no_reason',
        expected_proposal_ids: ['p-1'],
      })
    ).rejects.toBeInstanceOf(CloseTargetsChangedError);
  });

  it('succeeds when an expected proposal is no longer pending', async () => {
    // Only p-1 is still pending; p-2 was decided elsewhere.
    const { service } = makeService(['p-1']);
    await expect(
      service.setStatus(request, 'conv-1', {
        status: 'closed',
        dismiss_reason: 'no_reason',
        expected_proposal_ids: ['p-1', 'p-2'],
      })
    ).resolves.not.toThrow();
  });

  it('skips the check when expected_proposal_ids is absent', async () => {
    const { service } = makeService(['p-surprise']);
    // No expected list → pre-flight is skipped; it still closes.
    await expect(
      service.setStatus(request, 'conv-1', {
        status: 'closed',
        dismiss_reason: 'no_reason',
      })
    ).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// InvestigationStatusService.setStatus — dismissing the pending proposals
// ---------------------------------------------------------------------------

describe('InvestigationStatusService.setStatus — dismissing the pending proposals', () => {
  const makeDismissService = (
    bulkDismissResult:
      | {
          released: string[];
          skipped: Array<{ id: string; reason: string }>;
          failed: Array<{ id: string; error: string }>;
        }
      | Error
  ) => {
    const proposalsService = {
      list: jest.fn().mockResolvedValue({ proposals: [{ id: 'p-1' }, { id: 'p-2' }], total: 2 }),
      bulkDismiss:
        bulkDismissResult instanceof Error
          ? jest.fn().mockRejectedValue(bulkDismissResult)
          : jest.fn().mockResolvedValue(bulkDismissResult),
    };
    const proposals = {
      getProposalsService: () => proposalsService,
      getProposalPrivileges: () => ({
        assertCanRead: jest.fn().mockResolvedValue(undefined),
        assertCanManage: jest.fn().mockResolvedValue(undefined),
      }),
    };
    const client = {
      get: jest.fn().mockResolvedValue(MOCK_CONVERSATION),
      patchMetadata: jest.fn().mockResolvedValue({ conversation: MOCK_CONVERSATION }),
    };
    const service = new InvestigationStatusService({
      getConversationClient: jest.fn().mockResolvedValue(client),
      getProposals: jest.fn().mockReturnValue(proposals),
      getSpaceId: jest.fn().mockReturnValue(SPACE_ID),
      logger,
    });
    return {
      service,
      bulkDismiss: proposalsService.bulkDismiss,
      patchMetadata: client.patchMetadata,
    };
  };

  it('dismisses every pending proposal in one call, with the reason and rationale', async () => {
    const { service, bulkDismiss, patchMetadata } = makeDismissService({
      released: ['p-1', 'p-2'],
      skipped: [],
      failed: [],
    });

    const result = await service.setStatus(request, 'conv-1', {
      status: 'closed',
      dismiss_reason: 'false_positive',
      rationale: 'Benign admin activity',
    });

    expect(bulkDismiss).toHaveBeenCalledTimes(1);
    expect(bulkDismiss).toHaveBeenCalledWith(
      {
        ids: ['p-1', 'p-2'],
        dismissReason: 'false_positive',
        rationale: 'Benign admin activity',
      },
      { spaceId: SPACE_ID, request }
    );
    expect(patchMetadata).toHaveBeenCalled();
    expect(result.dismissed_proposal_ids).toEqual(['p-1', 'p-2']);
    expect(result.failed_proposal_ids).toEqual([]);
  });

  it('closes when the proposals it did not dismiss were already beyond dismissing', async () => {
    const { service, patchMetadata } = makeDismissService({
      released: ['p-2'],
      skipped: [{ id: 'p-1', reason: 'decided' }],
      failed: [],
    });

    const result = await service.setStatus(request, 'conv-1', {
      status: 'closed',
      dismiss_reason: 'no_reason',
    });

    expect(patchMetadata).toHaveBeenCalled();
    expect(result.dismissed_proposal_ids).toEqual(['p-2']);
    expect(result.failed_proposal_ids).toEqual([]);
  });

  it('does not close when a proposal could not be dismissed', async () => {
    const { service, patchMetadata } = makeDismissService({
      released: ['p-2'],
      skipped: [],
      failed: [{ id: 'p-1', error: 'Proposal [p-1] was modified by another actor first' }],
    });

    const closing = service.setStatus(request, 'conv-1', {
      status: 'closed',
      dismiss_reason: 'no_reason',
    });

    await expect(closing).rejects.toBeInstanceOf(ProposalDismissFailedError);
    await expect(closing).rejects.toMatchObject({ failedProposalIds: ['p-1'] });
    expect(patchMetadata).not.toHaveBeenCalled();
  });

  it('does not close, and reports every pending proposal, when none could be dismissed', async () => {
    const { service, patchMetadata } = makeDismissService(new Error('cluster unavailable'));

    const closing = service.setStatus(request, 'conv-1', {
      status: 'closed',
      dismiss_reason: 'no_reason',
    });

    await expect(closing).rejects.toBeInstanceOf(ProposalDismissFailedError);
    await expect(closing).rejects.toMatchObject({ failedProposalIds: ['p-1', 'p-2'] });
    expect(patchMetadata).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// InvestigationStatusService.setSeverity
// ---------------------------------------------------------------------------

describe('InvestigationStatusService.setSeverity', () => {
  const makeService = (conversation: Record<string, unknown> = MOCK_CONVERSATION) => {
    const client = {
      get: jest.fn().mockResolvedValue(conversation),
      patchMetadata: jest.fn().mockResolvedValue({ conversation, changedFields: ['severity'] }),
      addEvents: jest.fn().mockResolvedValue([]),
    };
    const service = new InvestigationStatusService({
      getConversationClient: jest.fn().mockResolvedValue(client),
      getProposals: jest.fn().mockReturnValue(undefined),
      getSpaceId: jest.fn().mockReturnValue(SPACE_ID),
      logger,
    });
    return { service, client };
  };

  it('writes the severity and records the change with the previous one', async () => {
    const { service, client } = makeService({
      ...MOCK_CONVERSATION,
      metadata: { severity: 'high' },
    });

    const result = await service.setSeverity(request, 'conv-1', { severity: 'low' });

    expect(client.patchMetadata).toHaveBeenCalledWith(
      'conv-1',
      { severity: 'low' },
      { access: 'converse' }
    );
    expect(client.addEvents).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      events: [
        {
          type: 'investigation_severity_changed',
          data: { severity: 'low', previous_severity: 'high' },
        },
      ],
    });
    expect(result).toEqual({
      conversation_id: 'conv-1',
      severity: 'low',
      previous_severity: 'high',
    });
  });

  it('omits the previous severity when none was set', async () => {
    const { service, client } = makeService();

    await service.setSeverity(request, 'conv-1', { severity: 'critical' });

    expect(client.addEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        events: [{ type: 'investigation_severity_changed', data: { severity: 'critical' } }],
      })
    );
  });

  it('does nothing when the severity is unchanged', async () => {
    const { service, client } = makeService({
      ...MOCK_CONVERSATION,
      metadata: { severity: 'medium' },
    });

    await service.setSeverity(request, 'conv-1', { severity: 'medium' });

    expect(client.patchMetadata).not.toHaveBeenCalled();
    expect(client.addEvents).not.toHaveBeenCalled();
  });

  it('still succeeds when the timeline event cannot be written', async () => {
    const { service, client } = makeService();
    client.addEvents.mockRejectedValue(new Error('boom'));

    await expect(service.setSeverity(request, 'conv-1', { severity: 'low' })).resolves.toEqual(
      expect.objectContaining({ severity: 'low' })
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  it('rejects a conversation on another template', async () => {
    const { service, client } = makeService({ ...MOCK_CONVERSATION, template_id: 'escalation' });

    await expect(service.setSeverity(request, 'conv-1', { severity: 'low' })).rejects.toThrow();
    expect(client.patchMetadata).not.toHaveBeenCalled();
  });
});
