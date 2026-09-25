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
    proposalListResult: Array<{ id: string; action?: { name?: string }; actionWorkflowId?: string }>
  ) => {
    const proposalsService = {
      list: jest.fn().mockResolvedValue({
        proposals: proposalListResult,
        total: proposalListResult.length,
      }),
    };
    const proposals = {
      getProposalsService: () => proposalsService,
      getProposalPrivileges: jest.fn(),
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
    const { service } = makeDeps([{ id: 'p-1', action: { name: 'Block IP' } }]);
    const result = await service.getPreview(request, 'conv-1');
    expect(result.pending_proposals).toEqual([{ id: 'p-1', action_name: 'Block IP' }]);
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
      releaseGate: jest.fn().mockResolvedValue({}),
    };
    const proposals = {
      getProposalsService: () => proposalsService,
      getProposalPrivileges: () => ({ assertCanManage: jest.fn().mockResolvedValue(undefined) }),
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
        dismiss_reason: 'wrong',
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
        dismiss_reason: 'wrong',
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
        dismiss_reason: 'wrong',
      })
    ).resolves.not.toThrow();
  });
});
