/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ExecutionStatus } from '@kbn/workflows';
import type { ListProposalsQuery } from '../../../common/proposals/proposal';
import type { ProposalDocument, ProposalsStorageClient } from '../storage/proposals_storage';
import {
  ProposalConflictError,
  ProposalExpiredError,
  ProposalInvalidActionInputError,
  ProposalNotFoundError,
} from './errors';
import type { ReleaseGateParams } from './proposals_service';
import { ProposalsService } from './proposals_service';

const SPACE_ID = 'default';
const EXECUTION_ID = 'exec-1';

/** The resolved actor, in the shape the service stores. */
const analyst = (username: string, profileUid = `${username}-uid`) => ({
  username,
  fullName: null,
  email: null,
  profileUid,
});

const baseDocument = (overrides: Partial<ProposalDocument> = {}): ProposalDocument => ({
  spaceId: SPACE_ID,
  conversationId: 'conv-1',
  comment: 'Tune the noisy rule',
  actionWorkflowId: 'system-alertzero-action-create-rule',
  actionInput: { name: 'Suspicious PowerShell' },
  status: 'pending',
  impact: 'low',
  confidence: 'medium',
  category: 'tune',
  origin: 'worker',
  impactRank: 3,
  confidenceRank: 1,
  workflowExecutionId: EXECUTION_ID,
  createdAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

/** The full query shape, so a test only states the filters it cares about. */
const listQuery = (overrides: Partial<ListProposalsQuery> = {}): ListProposalsQuery => ({
  excludeSuperseded: false,
  excludeExpired: false,
  size: 50,
  from: 0,
  ...overrides,
});

const searchHit = (document: ProposalDocument, id = 'proposal-1') => ({
  _id: id,
  _source: document,
  _seq_no: 7,
  _primary_term: 1,
});

/** An empty ES|QL result, which every `chartsSummary` query defaults to. */
const emptyEsql = () => ({ columns: [], values: [] });

const createStorage = (document?: ProposalDocument) => {
  const hits = document ? [searchHit(document)] : [];
  return {
    index: jest.fn().mockResolvedValue({ _id: 'proposal-1' }),
    search: jest.fn().mockResolvedValue({
      hits: { hits, total: { value: hits.length } },
    }),
    esql: jest.fn().mockResolvedValue(emptyEsql()),
  } as unknown as jest.Mocked<ProposalsStorageClient> & {
    index: jest.Mock;
    search: jest.Mock;
    esql: jest.Mock;
  };
};

const createWorkflowsApi = () => ({
  getWorkflow: jest.fn().mockResolvedValue({
    definition: {
      consts: {
        actionMetadata: {
          name: 'Create detection rule',
          category: 'tune',
          impact: 'low',
          reversible: true,
          approvalPolicy: 'always-gate',
        },
      },
    },
  }),
  getWorkflowExecution: jest.fn().mockResolvedValue({
    id: EXECUTION_ID,
    status: ExecutionStatus.WAITING_FOR_INPUT,
    finishedAt: undefined,
    stepExecutions: [
      {
        id: 'step-exec-1',
        stepType: 'waitForApproval',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        startedAt: '2026-09-01T00:01:00.000Z',
      },
    ],
  }),
  resumeWorkflowExecution: jest.fn().mockResolvedValue({ resumedBy: 'analyst' }),
});

/** Pass `null` for `workflowsApi` to simulate the API being unavailable. */
const createService = (
  storage: ReturnType<typeof createStorage>,
  workflowsApi: ReturnType<typeof createWorkflowsApi> | null = createWorkflowsApi()
) => {
  const logger = loggerMock.create();
  return {
    service: new ProposalsService({
      storage,
      logger,
      getWorkflowsApi: () => (workflowsApi ?? undefined) as never,
    }),
    workflowsApi: workflowsApi ?? createWorkflowsApi(),
    logger,
  };
};

const releaseParams = (overrides: Partial<ReleaseGateParams> = {}): ReleaseGateParams => ({
  approved: true,
  spaceId: SPACE_ID,
  request: httpServerMock.createKibanaRequest(),
  ...overrides,
});

describe('ProposalsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should store a pending proposal with the category resolved from the action workflow', async () => {
      const storage = createStorage();
      const { service } = createService(storage);

      const proposal = await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Tune the noisy rule',
          actionWorkflowId: 'system-alertzero-action-create-rule',
          actionInput: { name: 'Suspicious PowerShell' },
          impact: 'high',
          confidence: 'high',
          origin: 'worker',
          workflowExecutionId: EXECUTION_ID,
        },
        { spaceId: SPACE_ID, user: analyst('worker-user') }
      );

      expect(proposal.status).toBe('pending');
      expect(proposal.category).toBe('tune');
      expect(proposal.workflowExecutionId).toBe(EXECUTION_ID);
      expect(storage.index).toHaveBeenCalledWith(
        expect.objectContaining({ op_type: 'create', id: proposal.id })
      );
    });

    it('should reject an actionInput the action could never accept', async () => {
      const storage = createStorage();
      const workflowsApi = createWorkflowsApi();
      workflowsApi.getWorkflow.mockResolvedValue({
        definition: {
          consts: { actionMetadata: { name: 'Create rule', category: 'tune' } },
          triggers: [
            {
              type: 'manual',
              inputs: {
                properties: {
                  actionInput: {
                    type: 'object',
                    properties: { name: { type: 'string' } },
                    required: ['name'],
                  },
                },
              },
            },
          ],
        },
      });
      const { service } = createService(storage, workflowsApi);

      // Caught here rather than after an analyst approves something unrunnable.
      await expect(
        service.create(
          {
            conversationId: 'conv-1',
            comment: 'Tune the noisy rule',
            actionWorkflowId: 'system-alertzero-action-create-rule',
            actionInput: {},
            impact: 'low',
            confidence: 'medium',
            origin: 'worker',
          },
          { spaceId: SPACE_ID }
        )
      ).rejects.toThrow(ProposalInvalidActionInputError);
      expect(storage.index).not.toHaveBeenCalled();
    });

    it('should fetch the action definition only once while creating', async () => {
      const storage = createStorage();
      const workflowsApi = createWorkflowsApi();
      workflowsApi.getWorkflow.mockResolvedValue({
        definition: { consts: { actionMetadata: { name: 'Create rule', category: 'tune' } } },
      });
      const { service } = createService(storage, workflowsApi);

      await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Tune the noisy rule',
          actionWorkflowId: 'system-alertzero-action-create-rule',
          impact: 'low',
          confidence: 'medium',
          origin: 'worker',
        },
        { spaceId: SPACE_ID }
      );

      // Metadata and input validation share the one fetch.
      expect(workflowsApi.getWorkflow).toHaveBeenCalledTimes(1);
    });

    it('should write the sort ranks so Elasticsearch can order the queue', async () => {
      const storage = createStorage();
      const workflowsApi = createWorkflowsApi();
      workflowsApi.getWorkflow.mockResolvedValue({
        definition: {
          consts: { actionMetadata: { name: 'Contain host', category: 'contain', impact: 'high' } },
        },
      });
      const { service } = createService(storage, workflowsApi);

      await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Contain the host',
          actionWorkflowId: 'system-alertzero-action-create-rule',
          confidence: 'high',
          origin: 'worker',
        },
        { spaceId: SPACE_ID }
      );

      const [[indexArgs]] = storage.index.mock.calls;
      expect(indexArgs.document).toMatchObject({
        impactRank: 1,
        confidenceRank: 0,
      });
    });

    it('should prefer the caller impact over the action metadata', async () => {
      const storage = createStorage();
      const workflowsApi = createWorkflowsApi();
      workflowsApi.getWorkflow.mockResolvedValue({
        definition: {
          consts: { actionMetadata: { name: 'Create rule', category: 'tune', impact: 'high' } },
        },
      });
      const { service } = createService(storage, workflowsApi);

      const proposal = await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Tune the noisy rule',
          actionWorkflowId: 'system-alertzero-action-create-rule',
          // A caller that states the impact knows the situation the proposal
          // came out of, which the action's own metadata cannot.
          impact: 'critical',
          confidence: 'medium',
          origin: 'worker',
        },
        { spaceId: SPACE_ID }
      );

      expect(proposal.impact).toBe('critical');
      expect(proposal.category).toBe('tune');
    });

    it('should fall back to the action impact when the caller omits one', async () => {
      const storage = createStorage();
      const workflowsApi = createWorkflowsApi();
      workflowsApi.getWorkflow.mockResolvedValue({
        definition: {
          consts: { actionMetadata: { name: 'Create rule', category: 'tune', impact: 'high' } },
        },
      });
      const { service } = createService(storage, workflowsApi);

      const proposal = await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Tune the noisy rule',
          actionWorkflowId: 'system-alertzero-action-create-rule',
          confidence: 'medium',
          origin: 'worker',
        },
        { spaceId: SPACE_ID }
      );

      expect(proposal.impact).toBe('high');
    });

    it('should default impact to low when neither the caller nor the action supplies one', async () => {
      const storage = createStorage();
      const workflowsApi = createWorkflowsApi();
      workflowsApi.getWorkflow.mockResolvedValue({
        definition: { consts: { actionMetadata: { name: 'Create rule', category: 'tune' } } },
      });
      const { service } = createService(storage, workflowsApi);

      const proposal = await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Tune the noisy rule',
          actionWorkflowId: 'system-alertzero-action-create-rule',
          confidence: 'medium',
          origin: 'worker',
        },
        { spaceId: SPACE_ID }
      );

      // impactRank is the queue's primary sort key, so it always has a value.
      expect(proposal.impact).toBe('low');
      const [[indexArgs]] = storage.index.mock.calls;
      expect(indexArgs.document.impactRank).toBe(3);
    });

    it('should treat a blank caller value as absent rather than as a value', async () => {
      // A workflow reaches this through Liquid, which renders an absent input
      // as `''` — and `??` cannot tell that from a real value. Unblanked, the
      // caller always wins with an empty string: the action's own metadata is
      // never consulted, no default fires, and the queue drops a proposal it
      // cannot group by category.
      const storage = createStorage();
      const workflowsApi = createWorkflowsApi();
      workflowsApi.getWorkflow.mockResolvedValue({
        definition: { consts: { actionMetadata: { name: 'Create rule', category: 'tune' } } },
      });
      const { service } = createService(storage, workflowsApi);

      const proposal = await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Tune the noisy rule',
          actionWorkflowId: 'system-alertzero-action-create-rule',
          impact: '' as never,
          category: '' as never,
          confidence: '' as never,
          origin: 'worker',
        },
        { spaceId: SPACE_ID }
      );

      expect(proposal.category).toBe('tune');
      expect(proposal.impact).toBe('low');
      // Required on the stored document, so a blank resolves to the default
      // rather than to an omission.
      expect(proposal.confidence).toBe('medium');
    });

    it('should prefer the caller category over the action metadata', async () => {
      const storage = createStorage();
      const workflowsApi = createWorkflowsApi();
      workflowsApi.getWorkflow.mockResolvedValue({
        definition: { consts: { actionMetadata: { name: 'Create rule', category: 'tune' } } },
      });
      const { service } = createService(storage, workflowsApi);

      const proposal = await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Tune the noisy rule',
          actionWorkflowId: 'system-alertzero-action-create-rule',
          category: 'contain',
          confidence: 'medium',
          origin: 'worker',
        },
        { spaceId: SPACE_ID }
      );

      expect(proposal.category).toBe('contain');
    });

    it('should give a proposal with no action the category its caller supplied', async () => {
      const storage = createStorage();
      const { service, workflowsApi } = createService(storage);

      // The only way such a proposal gets one: there is no action metadata to
      // resolve it from, and consumers group the queue by category — so
      // without this it would have nowhere to appear.
      const proposal = await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Rotate the credentials by hand, then approve',
          category: 'contain',
          confidence: 'high',
          origin: 'worker',
        },
        { spaceId: SPACE_ID }
      );

      expect(proposal.category).toBe('contain');
      expect(workflowsApi.getWorkflow).not.toHaveBeenCalled();
    });

    it('should leave the category unset when the action declares no metadata', async () => {
      const storage = createStorage();
      const workflowsApi = createWorkflowsApi();
      workflowsApi.getWorkflow.mockResolvedValue({ definition: { consts: {} } });
      const { service } = createService(storage, workflowsApi);

      const proposal = await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Tune the noisy rule',
          actionWorkflowId: 'system-alertzero-action-create-rule',
          impact: 'low',
          confidence: 'low',
          origin: 'worker',
        },
        { spaceId: SPACE_ID }
      );

      // The category vocabulary belongs to the solution that authored the
      // action, so there is no default for this plugin to invent.
      expect(proposal.category).toBeUndefined();
    });

    it('should treat empty template output as absent rather than storing it', async () => {
      const storage = createStorage();
      const { service, workflowsApi } = createService(storage);

      // Liquid renders a missing workflow input as '', and `expiresAt: ''` is
      // rejected outright by the date mapping.
      const proposal = await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Tune the noisy rule',
          actionWorkflowId: '',
          expiresAt: '',
          impact: 'low',
          confidence: 'medium',
          origin: 'worker',
          workflowExecutionId: '',
        },
        { spaceId: SPACE_ID }
      );

      expect(proposal.expiresAt).toBeUndefined();
      expect(proposal.actionWorkflowId).toBeUndefined();
      expect(proposal.workflowExecutionId).toBeUndefined();
      // An empty action id must not look action-bearing.
      expect(workflowsApi.getWorkflow).not.toHaveBeenCalled();
    });

    it('should create a proposal that carries no action', async () => {
      const storage = createStorage();
      const { service, workflowsApi } = createService(storage);

      const proposal = await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Rotate the credentials by hand, then approve',
          impact: 'medium',
          confidence: 'high',
          origin: 'worker',
        },
        { spaceId: SPACE_ID }
      );

      expect(proposal.actionWorkflowId).toBeUndefined();
      expect(workflowsApi.getWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('releaseGate', () => {
    it('should release the gate without writing anything', async () => {
      const storage = createStorage(baseDocument());
      const { service, workflowsApi } = createService(storage);

      const proposal = await service.releaseGate(
        'proposal-1',
        releaseParams({ actionInput: { name: 'Suspicious PowerShell' } })
      );

      // The decision is written by the workflow behind the gate, so there is
      // nothing durable here to roll back when a resume fails.
      expect(storage.index).not.toHaveBeenCalled();
      expect(workflowsApi.resumeWorkflowExecution).toHaveBeenCalled();
      expect(proposal.decision).toBeUndefined();
      expect(proposal.status).toBe('pending');
    });

    it('should resume with the explicitly resolved waitForApproval step execution id', async () => {
      const storage = createStorage(baseDocument());
      const { service, workflowsApi } = createService(storage);

      await service.releaseGate('proposal-1', releaseParams());

      expect(workflowsApi.resumeWorkflowExecution).toHaveBeenCalledWith(
        EXECUTION_ID,
        SPACE_ID,
        { approved: true },
        expect.anything(),
        expect.objectContaining({ stepExecutionId: 'step-exec-1' })
      );
    });

    it('should release down the negative branch for a dismissal', async () => {
      const storage = createStorage(baseDocument());
      const { service, workflowsApi } = createService(storage);

      await service.releaseGate('proposal-1', releaseParams({ approved: false }));

      expect(workflowsApi.resumeWorkflowExecution).toHaveBeenCalledWith(
        EXECUTION_ID,
        SPACE_ID,
        { approved: false },
        expect.anything(),
        expect.anything()
      );
    });

    it('should reject an approval whose action input no longer matches the record', async () => {
      const storage = createStorage(baseDocument());
      const { service, workflowsApi } = createService(storage);

      await expect(
        service.releaseGate(
          'proposal-1',
          releaseParams({ actionInput: { name: 'something else' } })
        )
      ).rejects.toBeInstanceOf(ProposalConflictError);

      expect(workflowsApi.resumeWorkflowExecution).not.toHaveBeenCalled();
    });

    it('should accept an approval whose action input matches under a different key order', async () => {
      const storage = createStorage(
        baseDocument({ actionInput: { name: 'PowerShell', tag: 'a' } })
      );
      const { service, workflowsApi } = createService(storage);

      await service.releaseGate(
        'proposal-1',
        releaseParams({ actionInput: { tag: 'a', name: 'PowerShell' } })
      );

      expect(workflowsApi.resumeWorkflowExecution).toHaveBeenCalled();
    });

    it('should not compare the action input on a dismissal', async () => {
      const storage = createStorage(baseDocument());
      const { service, workflowsApi } = createService(storage);

      // Dismissing does not run the action, so a stale rendering of its input
      // is not a reason to refuse the decision.
      await service.releaseGate(
        'proposal-1',
        releaseParams({ approved: false, actionInput: { name: 'something else' } })
      );

      expect(workflowsApi.resumeWorkflowExecution).toHaveBeenCalled();
    });

    it('should reject when another actor already decided', async () => {
      const storage = createStorage(baseDocument({ decision: 'approved' }));
      const { service } = createService(storage);

      await expect(service.releaseGate('proposal-1', releaseParams())).rejects.toBeInstanceOf(
        ProposalConflictError
      );
    });

    it('should allow a decision while the status is still pending behind the gate', async () => {
      // An approved proposal stays at `pending` until the post-gate steps run,
      // so the guard has to read the decision rather than the status.
      const storage = createStorage(baseDocument({ status: 'pending', decision: undefined }));
      const { service, workflowsApi } = createService(storage);

      await service.releaseGate('proposal-1', releaseParams());

      expect(workflowsApi.resumeWorkflowExecution).toHaveBeenCalled();
    });

    it('should reject a proposal the workflow already settled without a decision', async () => {
      // Attempt exhaustion and a failure before anyone decided both settle the
      // record as `expired` with no decision on it, and can do so long before
      // the deadline — so the date check alone would still read it as live.
      const storage = createStorage(
        baseDocument({
          status: 'expired',
          decision: undefined,
          expiresAt: '2099-01-01T00:00:00.000Z',
        })
      );
      const { service } = createService(storage);

      await expect(service.releaseGate('proposal-1', releaseParams())).rejects.toBeInstanceOf(
        ProposalConflictError
      );
    });

    it('should reject a proposal past its decision deadline', async () => {
      const storage = createStorage(baseDocument({ expiresAt: '2020-01-01T00:00:00.000Z' }));
      const { service } = createService(storage);

      await expect(service.releaseGate('proposal-1', releaseParams())).rejects.toBeInstanceOf(
        ProposalExpiredError
      );
    });

    it('should reject when the execution is no longer waiting for input', async () => {
      const storage = createStorage(baseDocument());
      const { service, workflowsApi } = createService(storage);
      workflowsApi.getWorkflowExecution.mockResolvedValue({
        id: EXECUTION_ID,
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [],
      });

      await expect(service.releaseGate('proposal-1', releaseParams())).rejects.toBeInstanceOf(
        ProposalConflictError
      );
    });

    it('should refuse a proposal with no gate execution rather than report success', async () => {
      // Only the gate workflow's create step makes a proposal, and it stamps
      // its own execution id — but a record without one could never be
      // decided, since the decision is written behind the gate. Answering the
      // caller with a 200 would be the worst of the options.
      const storage = createStorage(baseDocument({ workflowExecutionId: undefined }));
      const { service, workflowsApi } = createService(storage);

      await expect(service.releaseGate('proposal-1', releaseParams())).rejects.toBeInstanceOf(
        ProposalConflictError
      );
      expect(workflowsApi.resumeWorkflowExecution).not.toHaveBeenCalled();
    });

    it('should throw when the proposal does not exist in the space', async () => {
      const storage = createStorage();
      const { service } = createService(storage);

      await expect(service.releaseGate('missing', releaseParams())).rejects.toBeInstanceOf(
        ProposalNotFoundError
      );
    });
  });

  describe('releaseGate annotations', () => {
    it('should write only the reason and the rationale', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.releaseGate(
        'proposal-1',
        releaseParams({
          approved: false,
          dismissReason: 'low_value',
          rationale: 'Noise, not worth a rule',
        })
      );

      const [[indexArgs]] = storage.index.mock.calls;
      expect(indexArgs.document).toEqual(
        expect.objectContaining({
          dismissReason: 'low_value',
          rationale: 'Noise, not worth a rule',
          // The decision is the workflow's to write, not the route's.
          status: 'pending',
        })
      );
      expect(indexArgs.document.decision).toBeUndefined();
      expect(indexArgs.document.decidedAt).toBeUndefined();
    });

    it('should guard the write with the loaded sequence number', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.releaseGate('proposal-1', releaseParams({ rationale: 'Looks right' }));

      expect(storage.index).toHaveBeenCalledWith(
        expect.objectContaining({ if_seq_no: 7, if_primary_term: 1 })
      );
    });

    it('should not write at all when neither annotation was supplied', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.releaseGate('proposal-1', releaseParams());

      expect(storage.index).not.toHaveBeenCalled();
    });

    it('should leave nothing written when the action input no longer matches', async () => {
      const storage = createStorage(baseDocument());
      const { service, workflowsApi } = createService(storage);

      await expect(
        service.releaseGate(
          'proposal-1',
          releaseParams({
            actionInput: { name: 'something else' },
            rationale: 'Looks right',
          })
        )
      ).rejects.toBeInstanceOf(ProposalConflictError);

      // Every refusal precedes the annotation, so a rejected approval cannot
      // leave a rationale behind for a decision that never happened.
      expect(storage.index).not.toHaveBeenCalled();
      expect(workflowsApi.resumeWorkflowExecution).not.toHaveBeenCalled();
    });

    it('should leave nothing written when someone else already decided', async () => {
      const storage = createStorage(baseDocument({ decision: 'approved' }));
      const { service } = createService(storage);

      await expect(
        service.releaseGate(
          'proposal-1',
          releaseParams({ approved: false, dismissReason: 'low_value' })
        )
      ).rejects.toBeInstanceOf(ProposalConflictError);
      expect(storage.index).not.toHaveBeenCalled();
    });

    it('should surface a losing concurrency race as a conflict', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);
      storage.index.mockRejectedValue(
        Object.assign(new Error('version conflict'), { statusCode: 409 })
      );

      await expect(
        service.releaseGate(
          'proposal-1',
          releaseParams({ approved: false, dismissReason: 'low_value' })
        )
      ).rejects.toBeInstanceOf(ProposalConflictError);
    });
  });

  describe('update', () => {
    it('should record the decision and stamp who and when', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      // The decision and its status land in one call: `approved` + `pending` is
      // not a legal pair, so an approval always says what happens next.
      const proposal = await service.update(
        {
          id: 'proposal-1',
          decision: 'approved',
          status: 'executing',
          decidedBy: analyst('analyst'),
        },
        SPACE_ID
      );

      expect(proposal.decision).toBe('approved');
      expect(proposal.decidedBy).toEqual(
        expect.objectContaining({ username: 'analyst', profileUid: 'analyst-uid' })
      );
      // Stamped by the service, so the recorded moment is the moment written.
      expect(proposal.decidedAt).toEqual(expect.any(String));
    });

    it('should move an approved proposal to a terminal execution state', async () => {
      const storage = createStorage(baseDocument({ decision: 'approved', status: 'executing' }));
      const { service } = createService(storage);

      const proposal = await service.update({ id: 'proposal-1', status: 'succeeded' }, SPACE_ID);

      expect(proposal.status).toBe('succeeded');
    });

    it.each([
      ['succeeded', 'failed'],
      ['failed', 'succeeded'],
      ['expired', 'no_action'],
      ['no_action', 'succeeded'],
    ] as const)(
      'should refuse to move a proposal that already settled as %s to %s',
      async (settled, target) => {
        const storage = createStorage(baseDocument({ decision: 'approved', status: settled }));
        const { service } = createService(storage);

        // A late on-failure handler must not rewrite an outcome that already
        // happened, so the guard lives here rather than in the workflow YAML.
        // The target differs from the settled status on purpose: re-writing the
        // same one is the idempotent case, covered separately below.
        await expect(
          service.update({ id: 'proposal-1', status: target }, SPACE_ID)
        ).rejects.toThrow(ProposalConflictError);
        expect(storage.index).not.toHaveBeenCalled();
      }
    );

    it('should stamp decidedAt when the workflow settles a proposal nobody decided', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      // `chartsSummary` reads `decidedAt` as the "closed" event. A malfunction
      // settling a proposal `expired` while its deadline is still in the future
      // would otherwise read as open until that deadline arrived.
      const proposal = await service.update({ id: 'proposal-1', status: 'expired' }, SPACE_ID);

      expect(proposal.decidedAt).toEqual(expect.any(String));
      // Settled, but nobody decided it.
      expect(proposal.decision).toBeUndefined();
      expect(proposal.decidedBy).toBeUndefined();
    });

    it('should not stamp decidedAt while the proposal is still awaiting', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      const proposal = await service.update({ id: 'proposal-1', rationale: 'Noted' }, SPACE_ID);

      expect(proposal.decidedAt).toBeUndefined();
    });

    it('should never move decidedAt once it is set', async () => {
      const storage = createStorage(
        baseDocument({
          decision: 'approved',
          status: 'executing',
          decidedAt: '2026-09-02T00:00:00.000Z',
        })
      );
      const { service } = createService(storage);

      const proposal = await service.update({ id: 'proposal-1', status: 'succeeded' }, SPACE_ID);

      // Write-once: the moment it stopped awaiting does not change because the
      // action later finished.
      expect(proposal.decidedAt).toBe('2026-09-02T00:00:00.000Z');
    });

    it('should accept re-writing the same terminal status, so the failure handler is idempotent', async () => {
      const storage = createStorage(baseDocument({ decision: 'approved', status: 'failed' }));
      const { service } = createService(storage);

      // Reachable on the normal failure path: the loop records `failed`, the
      // clone then throws, and the workflow-level handler records `failed`
      // again. Refusing that would replace the real error with a conflict
      // about recording it.
      const proposal = await service.update(
        { id: 'proposal-1', status: 'failed', executionError: 'clone unavailable' },
        SPACE_ID
      );

      expect(proposal.status).toBe('failed');
      expect(proposal.executionError).toBe('clone unavailable');
    });

    it('should reject a decision written without the status it implies', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      // `approved` + `pending` is not a legal pair, so an approval has to say
      // what happens next in the same call.
      await expect(
        service.update({ id: 'proposal-1', decision: 'approved' }, SPACE_ID)
      ).rejects.toThrow(ProposalConflictError);
      expect(storage.index).not.toHaveBeenCalled();
    });

    it('should accept a dismissal written with its status in one call', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      const proposal = await service.update(
        { id: 'proposal-1', decision: 'dismissed', status: 'no_action' },
        SPACE_ID
      );

      expect(proposal.decision).toBe('dismissed');
      expect(proposal.status).toBe('no_action');
    });

    it('should refuse to overwrite a decision that was already recorded', async () => {
      const storage = createStorage(baseDocument({ decision: 'approved', status: 'pending' }));
      const { service } = createService(storage);

      // Independent of the status guard: this proposal is still `pending`, so
      // only the decision's own immutability can refuse a second approver.
      await expect(
        service.update({ id: 'proposal-1', decision: 'dismissed' }, SPACE_ID)
      ).rejects.toThrow(ProposalConflictError);
      expect(storage.index).not.toHaveBeenCalled();
    });

    it('should still annotate a proposal whose status already settled', async () => {
      const storage = createStorage(baseDocument({ decision: 'approved', status: 'failed' }));
      const { service } = createService(storage);

      // Only status transitions and the decision are guarded, which is what
      // lets `clone` mark a failed original as superseded.
      const proposal = await service.update(
        { id: 'proposal-1', rationale: 'Retried as a new proposal' },
        SPACE_ID
      );

      expect(proposal.rationale).toBe('Retried as a new proposal');
      expect(proposal.status).toBe('failed');
    });

    it.each([
      [undefined, 'pending'],
      [undefined, 'expired'],
      ['dismissed', 'no_action'],
      ['approved', 'no_action'],
      ['approved', 'executing'],
      ['approved', 'succeeded'],
      ['approved', 'failed'],
    ] as const)('should accept the valid pair %s + %s', async (decision, status) => {
      const storage = createStorage(baseDocument({ decision, status: 'pending' }));
      const { service } = createService(storage);

      const proposal = await service.update({ id: 'proposal-1', status }, SPACE_ID);

      expect(proposal.status).toBe(status);
      expect(proposal.decision).toBe(decision);
    });

    it.each([
      [undefined, 'executing'],
      [undefined, 'succeeded'],
      [undefined, 'failed'],
      [undefined, 'no_action'],
      ['dismissed', 'executing'],
      ['dismissed', 'succeeded'],
      ['dismissed', 'failed'],
      ['dismissed', 'expired'],
      ['approved', 'expired'],
    ] as const)('should reject the invalid pair %s + %s', async (decision, status) => {
      const storage = createStorage(baseDocument({ decision, status: 'pending' }));
      const { service } = createService(storage);

      // `dismissed` + `executing` would claim an action is running for a
      // proposal that was declined; `expired` means nobody answered, which a
      // decision contradicts.
      await expect(service.update({ id: 'proposal-1', status }, SPACE_ID)).rejects.toThrow(
        ProposalConflictError
      );
      expect(storage.index).not.toHaveBeenCalled();
    });

    it('should refuse a blank id without issuing an unsearchable ids query', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      // An on-failure handler that fires before creation succeeded resolves its
      // template to ''. Elasticsearch would answer with an opaque shard failure.
      await expect(service.update({ id: '', status: 'expired' }, SPACE_ID)).rejects.toBeInstanceOf(
        ProposalNotFoundError
      );

      expect(storage.search).not.toHaveBeenCalled();
    });

    it('should keep the failure detail when the action failed', async () => {
      const storage = createStorage(baseDocument({ decision: 'approved', status: 'executing' }));
      const { service } = createService(storage);

      const proposal = await service.update(
        { id: 'proposal-1', status: 'failed', executionError: 'action exploded' },
        SPACE_ID
      );

      expect(proposal.status).toBe('failed');
      expect(proposal.executionError).toBe('action exploded');
    });

    it('should leave untouched fields alone rather than clearing them', async () => {
      const storage = createStorage(
        baseDocument({ decision: 'approved', status: 'executing', rationale: 'Looks right' })
      );
      const { service } = createService(storage);

      const proposal = await service.update({ id: 'proposal-1', status: 'succeeded' }, SPACE_ID);

      expect(proposal.rationale).toBe('Looks right');
    });
  });

  describe('clone', () => {
    it('should inherit the deadline and creation time from the original', async () => {
      const storage = createStorage(
        baseDocument({
          decision: 'approved',
          status: 'failed',
          createdAt: '2026-09-01T00:00:00.000Z',
          expiresAt: '2026-09-04T00:00:00.000Z',
        })
      );
      const { service } = createService(storage);

      const cloneId = await service.clone({ id: 'proposal-1' }, SPACE_ID);

      const [[cloneArgs]] = storage.index.mock.calls;
      expect(cloneArgs.id).toBe(cloneId);
      expect(cloneArgs.op_type).toBe('create');
      // The deadline belongs to the analyst, not the attempt: restarting it
      // would let a chain of retries outlive any deadline the queue showed.
      expect(cloneArgs.document).toMatchObject({
        createdAt: '2026-09-01T00:00:00.000Z',
        expiresAt: '2026-09-04T00:00:00.000Z',
      });
    });

    it('should carry the subject over and reset the decision', async () => {
      const storage = createStorage(
        baseDocument({
          decision: 'approved',
          status: 'failed',
          decidedBy: analyst('analyst'),
          decidedAt: '2026-09-02T00:00:00.000Z',
          executionError: 'action exploded',
          rationale: 'Looks right',
        })
      );
      const { service } = createService(storage);

      await service.clone({ id: 'proposal-1' }, SPACE_ID);

      const [[cloneArgs]] = storage.index.mock.calls;
      expect(cloneArgs.document).toMatchObject({
        conversationId: 'conv-1',
        comment: 'Tune the noisy rule',
        actionWorkflowId: 'system-alertzero-action-create-rule',
        actionInput: { name: 'Suspicious PowerShell' },
        impact: 'low',
        confidence: 'medium',
        category: 'tune',
        origin: 'worker',
        status: 'pending',
        // The clone points at the same still-parked gate execution, so
        // approving it resumes that execution rather than stranding.
        workflowExecutionId: EXECUTION_ID,
      });
      expect(cloneArgs.document.decision).toBeUndefined();
      expect(cloneArgs.document.decidedBy).toBeUndefined();
      expect(cloneArgs.document.decidedAt).toBeUndefined();
      expect(cloneArgs.document.executionError).toBeUndefined();
      expect(cloneArgs.document.rationale).toBeUndefined();
    });

    it('should mark the original as superseded by the clone', async () => {
      const storage = createStorage(baseDocument({ decision: 'approved', status: 'failed' }));
      const { service } = createService(storage);

      const cloneId = await service.clone(
        { id: 'proposal-1', executionError: 'action exploded' },
        SPACE_ID
      );

      const [, [supersedeArgs]] = storage.index.mock.calls;
      expect(supersedeArgs.id).toBe('proposal-1');
      // Permitted on a proposal that already settled as `failed`, because
      // neither the status nor the decision moves here.
      expect(supersedeArgs.document).toMatchObject({
        supersededBy: cloneId,
        status: 'failed',
        executionError: 'action exploded',
      });
    });

    it('should refuse to clone a proposal that was already superseded', async () => {
      const storage = createStorage(
        baseDocument({ decision: 'approved', status: 'failed', supersededBy: 'proposal-2' })
      );
      const { service } = createService(storage);

      // Overwriting the pointer would orphan the first clone: it would stay
      // live and undecided with nothing referring to it.
      await expect(service.clone({ id: 'proposal-1' }, SPACE_ID)).rejects.toBeInstanceOf(
        ProposalConflictError
      );
      expect(storage.index).not.toHaveBeenCalled();
    });

    it('should create the clone before marking the original, so a lost race shows both', async () => {
      const storage = createStorage(baseDocument({ decision: 'approved', status: 'failed' }));
      const { service } = createService(storage);
      storage.index
        .mockResolvedValueOnce({ _id: 'clone' })
        .mockRejectedValueOnce(Object.assign(new Error('version conflict'), { statusCode: 409 }));

      await expect(service.clone({ id: 'proposal-1' }, SPACE_ID)).rejects.toBeInstanceOf(
        ProposalConflictError
      );

      // Marking first would leave a pointer to a clone that does not exist,
      // hiding the original with nothing live in its place.
      const [[cloneArgs]] = storage.index.mock.calls;
      expect(cloneArgs.op_type).toBe('create');
      expect(cloneArgs.id).not.toBe('proposal-1');
    });

    it('should throw when the original does not exist in the space', async () => {
      const storage = createStorage();
      const { service } = createService(storage);

      await expect(service.clone({ id: 'missing' }, SPACE_ID)).rejects.toBeInstanceOf(
        ProposalNotFoundError
      );
    });

    // Reachable as a registered step, so any workflow could otherwise re-open
    // a settled proposal as `pending` and hide the real one behind
    // `supersededBy`. A failed action is the only thing there is to re-offer.
    it.each([
      ['a proposal nobody has decided', { decision: undefined, status: 'pending' as const }],
      [
        'an approval that has not run yet',
        { decision: 'approved' as const, status: 'executing' as const },
      ],
      ['an action that succeeded', { decision: 'approved' as const, status: 'succeeded' as const }],
      ['a dismissal', { decision: 'dismissed' as const, status: 'no_action' as const }],
      ['an expired proposal', { decision: undefined, status: 'expired' as const }],
    ])('should refuse to clone %s', async (_label, overrides) => {
      const storage = createStorage(baseDocument(overrides));
      const { service } = createService(storage);

      await expect(service.clone({ id: 'proposal-1' }, SPACE_ID)).rejects.toBeInstanceOf(
        ProposalConflictError
      );
      expect(storage.index).not.toHaveBeenCalled();
    });
  });

  describe('resolveActionMetadata', () => {
    it('should ignore metadata that does not match the schema', async () => {
      const storage = createStorage();
      const workflowsApi = createWorkflowsApi();
      workflowsApi.getWorkflow.mockResolvedValue({
        // `name` is required; `category` is any keyword, so it cannot be the
        // thing that fails here.
        definition: { consts: { actionMetadata: { category: 'tune' } } },
      });
      const { service } = createService(storage, workflowsApi);

      await expect(
        service.resolveActionMetadata('system-alertzero-action-create-rule', SPACE_ID)
      ).resolves.toBeUndefined();
    });

    it('should not fail when the workflows API is unavailable', async () => {
      const storage = createStorage();
      const { service } = createService(storage, null);

      await expect(
        service.resolveActionMetadata('system-alertzero-action-create-rule', SPACE_ID)
      ).resolves.toBeUndefined();
    });
  });

  describe('list', () => {
    it('should filter by space, status and conversation', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(listQuery({ status: 'pending', conversationId: 'conv-1' }), SPACE_ID);

      const [[searchArgs]] = storage.search.mock.calls;
      expect(searchArgs.query.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { spaceId: SPACE_ID } },
          { term: { status: 'pending' } },
          { term: { conversationId: 'conv-1' } },
        ])
      );
    });

    it('should order by rank in Elasticsearch rather than after the fetch', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(listQuery(), SPACE_ID);

      const [[searchArgs]] = storage.search.mock.calls;
      // The keyword enums sort alphabetically, so the queue's order comes from
      // the numeric ranks written at creation.
      expect(searchArgs.sort).toEqual([
        { impactRank: { order: 'asc' } },
        { confidenceRank: { order: 'asc' } },
        { expiresAt: { order: 'asc', missing: '_last' } },
        { createdAt: { order: 'desc' } },
      ]);
    });

    it('should page in Elasticsearch, so the queue is not capped at a single fetch', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(listQuery({ size: 25, from: 50 }), SPACE_ID);

      const [[searchArgs]] = storage.search.mock.calls;
      expect(searchArgs.size).toBe(25);
      expect(searchArgs.from).toBe(50);
      expect(searchArgs.track_total_hits).toBe(true);
    });

    it('should keep proposals with no deadline when excluding expired ones', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(listQuery({ excludeExpired: true }), SPACE_ID);

      const [[searchArgs]] = storage.search.mock.calls;
      // A proposal without a deadline never expires, so it has to survive.
      expect(searchArgs.query.bool.filter).toEqual(
        expect.arrayContaining([
          {
            bool: {
              should: [
                { bool: { must_not: { exists: { field: 'expiresAt' } } } },
                { range: { expiresAt: { gt: 'now' } } },
              ],
              minimum_should_match: 1,
            },
          },
        ])
      );
    });

    it('should not filter on expiry by default', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(listQuery(), SPACE_ID);

      const [[searchArgs]] = storage.search.mock.calls;
      expect(JSON.stringify(searchArgs.query.bool.filter)).not.toContain('expiresAt');
    });

    it('should express awaiting a decision as the pending status alone', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(listQuery({ status: 'pending' }), SPACE_ID);

      // `pending` is only ever valid while undecided, so no separate
      // decision-absence clause is needed to say "awaiting".
      const [[searchArgs]] = storage.search.mock.calls;
      expect(searchArgs.query.bool.filter).toEqual(
        expect.arrayContaining([{ term: { status: 'pending' } }])
      );
      expect(JSON.stringify(searchArgs.query.bool.filter)).not.toContain('decision');
    });

    it('should filter by decision when one is requested', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(listQuery({ decision: 'dismissed' }), SPACE_ID);

      const [[searchArgs]] = storage.search.mock.calls;
      expect(searchArgs.query.bool.filter).toEqual(
        expect.arrayContaining([{ term: { decision: 'dismissed' } }])
      );
    });

    it('should drop superseded proposals so a retried chain shows only its head', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(listQuery({ excludeSuperseded: true }), SPACE_ID);

      const [[searchArgs]] = storage.search.mock.calls;
      expect(searchArgs.query.bool.filter).toEqual(
        expect.arrayContaining([{ bool: { must_not: { exists: { field: 'supersededBy' } } } }])
      );
    });

    it('should not filter on decision or supersession by default', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(listQuery(), SPACE_ID);

      const [[searchArgs]] = storage.search.mock.calls;
      const filter = JSON.stringify(searchArgs.query.bool.filter);
      expect(filter).not.toContain('decision');
      expect(filter).not.toContain('supersededBy');
    });

    it('should not leak the storage-only sort ranks into the response', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      const { proposals } = await service.list(listQuery(), SPACE_ID);

      expect(proposals[0]).not.toHaveProperty('impactRank');
      expect(proposals[0]).not.toHaveProperty('confidenceRank');
    });
  });

  describe('listByWindow', () => {
    const activityQuery = (decidedWithinHours = 24) => ({
      decidedWithinHours,
      excludeSuperseded: true,
      excludeExpired: false,
    });

    it('includes proposals awaiting a decision regardless of age', async () => {
      const storage = createStorage(baseDocument({ status: 'pending' }));
      const { service } = createService(storage);

      const { proposals } = await service.listByWindow(activityQuery(), SPACE_ID);

      expect(proposals).toHaveLength(1);
    });

    it('unions awaiting with decided-within-window', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.listByWindow(activityQuery(48), SPACE_ID);

      const [[searchArgs]] = storage.search.mock.calls;
      const { bool } = searchArgs.query;
      expect(bool.minimum_should_match).toBe(1);
      // `pending` is only ever valid while undecided, so the status is the
      // whole awaiting condition.
      expect(bool.should).toEqual([
        { term: { status: 'pending' } },
        { range: { decidedAt: { gte: 'now-48h' } } },
      ]);
    });

    it('applies the shared filters exactly as list does', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.listByWindow(
        { ...activityQuery(), conversationId: 'conv-1', excludeExpired: true },
        SPACE_ID
      );
      await service.list(
        listQuery({ conversationId: 'conv-1', excludeExpired: true, excludeSuperseded: true }),
        SPACE_ID
      );

      // Both reads translate the vocabulary through the same builder, so a
      // filter cannot come to mean one thing here and another there.
      const [[windowArgs], [listArgs]] = storage.search.mock.calls;
      expect(windowArgs.query.bool.filter).toEqual(listArgs.query.bool.filter);
    });

    it('drops superseded proposals so a retried chain appears once', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.listByWindow(activityQuery(), SPACE_ID);

      const [[searchArgs]] = storage.search.mock.calls;
      expect(searchArgs.query.bool.filter).toEqual(
        expect.arrayContaining([{ bool: { must_not: { exists: { field: 'supersededBy' } } } }])
      );
    });

    it('reaches a recently expired proposal through the decided leg, not the awaiting one', async () => {
      // `update` stamps `decidedAt` when it settles a proposal nobody decided,
      // so an expired one does match the decided-recently leg — deliberately,
      // because "you missed this" is activity worth surfacing. It carries no
      // decision, so a consumer has to classify on the status rather than the
      // decision or it lands back in the open queue.
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.listByWindow(activityQuery(), SPACE_ID);

      const [[searchArgs]] = storage.search.mock.calls;
      expect(searchArgs.query.bool.should).toEqual([
        { term: { status: 'pending' } },
        { range: { decidedAt: { gte: 'now-24h' } } },
      ]);
    });

    it('returns truncated=true when total exceeds the cap', async () => {
      const doc = baseDocument();
      const storage = {
        ...createStorage(doc),
        search: jest.fn().mockResolvedValue({
          hits: { hits: [searchHit(doc)], total: { value: 9999 } },
        }),
      } as unknown as ReturnType<typeof createStorage>;
      const { service } = createService(storage);

      const { truncated, total } = await service.listByWindow(activityQuery(), SPACE_ID);

      expect(truncated).toBe(true);
      expect(total).toBe(9999);
    });

    it('returns truncated=false when total is within the cap', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      const { truncated } = await service.listByWindow(activityQuery(), SPACE_ID);

      expect(truncated).toBe(false);
    });

    it('fetches action metadata only once for proposals sharing an actionWorkflowId', async () => {
      const doc = baseDocument({ actionWorkflowId: 'shared-action' });
      const storage = {
        ...createStorage(doc),
        search: jest.fn().mockResolvedValue({
          hits: {
            hits: [searchHit(doc, 'p1'), searchHit(doc, 'p2'), searchHit(doc, 'p3')],
            total: { value: 3 },
          },
        }),
      } as unknown as ReturnType<typeof createStorage>;
      const workflowsApi = createWorkflowsApi();
      const { service } = createService(storage, workflowsApi);

      await service.listByWindow(activityQuery(), SPACE_ID);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledTimes(1);
    });

    it('does not leak sort ranks into the response', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      const { proposals } = await service.listByWindow(activityQuery(), SPACE_ID);

      expect(proposals[0]).not.toHaveProperty('categoryRank');
      expect(proposals[0]).not.toHaveProperty('impactRank');
      expect(proposals[0]).not.toHaveProperty('confidenceRank');
    });
  });

  describe('chartsSummary', () => {
    /**
     * A 2h window at 30m granularity anchored to a fixed clock: five buckets at
     * 10:00, 10:30, 11:00, 11:30 and 12:00, the last one still open at 12:10.
     */
    const NOW = '2026-09-11T12:10:00.000Z';
    const WINDOW_START = Date.parse('2026-09-11T10:00:00.000Z');
    const BUCKET_MS = 30 * 60 * 1000;
    const chartsQuery = { windowHours: 2, bucketMinutes: 30 };

    /** Column order deliberately differs from the STATS order, to exercise by-name lookup. */
    const byCategory = (field: string, rows: Array<[string, number]>) => ({
      columns: [{ name: field }, { name: 'category' }],
      values: rows.map(([category, count]) => [count, category]),
    });

    const byIdxAndCategory = (field: string, rows: Array<[number, string, number]>) => ({
      columns: [{ name: field }, { name: 'idx' }, { name: 'category' }],
      values: rows.map(([idx, category, count]) => [count, idx, category]),
    });

    /** The four queries resolve in the order the service issues them. */
    const mockEsql = (
      storage: ReturnType<typeof createStorage>,
      {
        anchor,
        opens,
        closes,
        expiries,
      }: {
        anchor?: object;
        opens?: object;
        closes?: object;
        expiries?: object;
      }
    ) => {
      storage.esql
        .mockResolvedValueOnce(anchor ?? emptyEsql())
        .mockResolvedValueOnce(opens ?? emptyEsql())
        .mockResolvedValueOnce(closes ?? emptyEsql())
        .mockResolvedValueOnce(expiries ?? emptyEsql());
    };

    const issuedQueries = (storage: ReturnType<typeof createStorage>): string[] =>
      storage.esql.mock.calls.map(([args]) => args.pipeline.toRequest().query as string);

    const esqlError = (type: string, reason: string) =>
      Object.assign(new Error(reason), { meta: { body: { error: { type, reason } } } });

    beforeEach(() => {
      jest.useFakeTimers({ now: new Date(NOW) });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should seed a running sum from the anchor and move it with opens and closes', async () => {
      const storage = createStorage();
      mockEsql(storage, {
        anchor: byCategory('anchor', [['contain', 2]]),
        opens: byIdxAndCategory('opens', [[1, 'contain', 3]]),
        closes: byIdxAndCategory('closes', [[3, 'contain', 1]]),
      });
      const { service } = createService(storage);

      const { buckets } = await service.chartsSummary(chartsQuery, SPACE_ID);

      expect(buckets.map((b) => b.counts.contain)).toEqual([2, 5, 5, 4, 4]);
    });

    it('should include the current partial bucket', async () => {
      const storage = createStorage();
      const { service } = createService(storage);

      const { buckets } = await service.chartsSummary(chartsQuery, SPACE_ID);

      expect(buckets).toHaveLength(5);
      expect(buckets.map((b) => b.timestamp)).toEqual(
        [0, 1, 2, 3, 4].map((i) => WINDOW_START + i * BUCKET_MS)
      );
    });

    it('should clamp at zero rather than report a negative count', async () => {
      const storage = createStorage();
      mockEsql(storage, { closes: byIdxAndCategory('closes', [[0, 'contain', 2]]) });
      const { service } = createService(storage);

      const { buckets } = await service.chartsSummary(chartsQuery, SPACE_ID);

      expect(buckets.map((b) => b.counts.contain)).toEqual([0, 0, 0, 0, 0]);
    });

    it('should close a proposal at the bucket it expired in', async () => {
      const storage = createStorage();
      mockEsql(storage, {
        anchor: byCategory('anchor', [['contain', 1]]),
        expiries: byIdxAndCategory('expiries', [[2, 'contain', 1]]),
      });
      const { service } = createService(storage);

      const { buckets } = await service.chartsSummary(chartsQuery, SPACE_ID);

      expect(buckets.map((b) => b.counts.contain)).toEqual([1, 1, 0, 0, 0]);
    });

    /**
     * The regression this guards: a request-time `expiresAt > NOW()` filter would
     * erase an expired proposal from the buckets in which it was genuinely open,
     * so the same past bucket would answer differently on every refetch.
     */
    it('should not filter any query on request-time expiry', async () => {
      const storage = createStorage();
      const { service } = createService(storage);

      await service.chartsSummary(chartsQuery, SPACE_ID);

      for (const query of issuedQueries(storage)) {
        expect(query).not.toMatch(/expiresAt\s*>\s*NOW\(\)/i);
      }
    });

    it('should give action-less proposals a category so they are counted', async () => {
      const storage = createStorage();
      mockEsql(storage, { anchor: byCategory('anchor', [['uncategorized', 4]]) });
      const { service } = createService(storage);

      const { buckets } = await service.chartsSummary(chartsQuery, SPACE_ID);

      for (const query of issuedQueries(storage)) {
        expect(query).toContain('COALESCE(category');
      }
      expect(buckets.at(-1)?.counts).toEqual({ uncategorized: 4 });
    });

    it('should ask for no more rows than Elasticsearch will return', async () => {
      const storage = createStorage();
      const { service } = createService(storage);

      await service.chartsSummary(chartsQuery, SPACE_ID);

      // A larger LIMIT is capped to the truncation max rather than honoured, so
      // asking for one only hides that the newest buckets were dropped.
      for (const query of issuedQueries(storage)) {
        const limit = Number(query.match(/LIMIT\s+(\d+)\s*$/)?.[1]);
        expect(limit).toBeLessThanOrEqual(10000);
      }
    });

    it('should warn when a query comes back at the truncation ceiling', async () => {
      const storage = createStorage();
      mockEsql(storage, {
        opens: {
          columns: [{ name: 'opens' }, { name: 'idx' }, { name: 'category' }],
          values: Array.from({ length: 10000 }, () => [1, 0, 'contain']),
        },
      });
      const { service, logger } = createService(storage);

      await service.chartsSummary(chartsQuery, SPACE_ID);

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('truncation ceiling'));
    });

    it('should return zero buckets when the mapping has not caught up', async () => {
      const storage = createStorage();
      storage.esql.mockRejectedValue(
        esqlError('verification_exception', 'line 1:20: Unknown column [expiresAt]')
      );
      const { service, logger } = createService(storage);

      const { buckets } = await service.chartsSummary(chartsQuery, SPACE_ID);

      expect(buckets).toHaveLength(5);
      expect(buckets.every((b) => Object.keys(b.counts).length === 0)).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('unknown column'));
    });

    /**
     * Swallowing these would render a flat line of zeroes with a 200, which reads
     * as a healthy empty dashboard rather than as the broken query it is.
     */
    it('should rethrow a verification error that is not an unknown column', async () => {
      const storage = createStorage();
      storage.esql.mockRejectedValue(
        esqlError('verification_exception', 'line 1:8: Unknown function [DATE_DIFFF]')
      );
      const { service } = createService(storage);

      await expect(service.chartsSummary(chartsQuery, SPACE_ID)).rejects.toThrow(
        'Unknown function'
      );
    });

    it('should rethrow an infrastructure error', async () => {
      const storage = createStorage();
      storage.esql.mockRejectedValue(
        esqlError('search_phase_execution_exception', 'all shards failed')
      );
      const { service } = createService(storage);

      await expect(service.chartsSummary(chartsQuery, SPACE_ID)).rejects.toThrow(
        'all shards failed'
      );
    });
  });
});
