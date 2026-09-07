/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ExecutionStatus } from '@kbn/workflows';
import type { Proposal } from '../../common/proposal';
import type { ProposalDocument, ProposalsStorageClient } from '../storage/proposals_storage';
import { ProposalConflictError, ProposalExpiredError, ProposalNotFoundError } from './errors';
import { ProposalsService, sortForQueue } from './proposals_service';

const SPACE_ID = 'default';
const EXECUTION_ID = 'exec-1';

const baseDocument = (overrides: Partial<ProposalDocument> = {}): ProposalDocument => ({
  spaceId: SPACE_ID,
  conversationId: 'conv-1',
  comment: 'Tune the noisy rule',
  actionWorkflowId: 'system-alertzero-action-create-rule',
  actionInput: { name: 'PoC rule' },
  status: 'pending',
  impact: 'low',
  confidence: 'medium',
  category: 'tune',
  targetEntities: [],
  origin: 'worker',
  workflowExecutionId: EXECUTION_ID,
  createdAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

const searchHit = (document: ProposalDocument, id = 'proposal-1') => ({
  _id: id,
  _source: document,
  _seq_no: 7,
  _primary_term: 1,
});

const createStorage = (document?: ProposalDocument) => {
  const hits = document ? [searchHit(document)] : [];
  return {
    index: jest.fn().mockResolvedValue({ _id: 'proposal-1' }),
    search: jest.fn().mockResolvedValue({
      hits: { hits, total: { value: hits.length } },
    }),
  } as unknown as jest.Mocked<ProposalsStorageClient> & {
    index: jest.Mock;
    search: jest.Mock;
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
) => ({
  service: new ProposalsService({
    storage,
    logger: loggerMock.create(),
    getWorkflowsApi: () => (workflowsApi ?? undefined) as never,
  }),
  workflowsApi: workflowsApi ?? createWorkflowsApi(),
});

const decisionContext = () => ({
  spaceId: SPACE_ID,
  request: httpServerMock.createKibanaRequest(),
  username: 'analyst',
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
          actionInput: { name: 'PoC rule' },
          impact: 'high',
          confidence: 'high',
          origin: 'worker',
          workflowExecutionId: EXECUTION_ID,
        },
        { spaceId: SPACE_ID, username: 'worker-user' }
      );

      expect(proposal.status).toBe('pending');
      expect(proposal.category).toBe('tune');
      expect(proposal.workflowExecutionId).toBe(EXECUTION_ID);
      expect(storage.index).toHaveBeenCalledWith(
        expect.objectContaining({ op_type: 'create', id: proposal.id })
      );
    });

    it('should fall back to a default category when the action declares no metadata', async () => {
      const storage = createStorage();
      const workflowsApi = createWorkflowsApi();
      workflowsApi.getWorkflow.mockResolvedValue({ definition: { consts: {} } });
      const { service } = createService(storage, workflowsApi);

      const proposal = await service.create(
        {
          conversationId: 'conv-1',
          actionWorkflowId: 'system-alertzero-action-create-rule',
          impact: 'low',
          confidence: 'low',
          origin: 'worker',
        },
        { spaceId: SPACE_ID }
      );

      expect(proposal.category).toBe('investigate');
    });

    it('should treat empty template output as absent rather than storing it', async () => {
      const storage = createStorage();
      const { service, workflowsApi } = createService(storage);

      // Liquid renders a missing workflow input as '', and `expiresAt: ''` is
      // rejected outright by the date mapping.
      const proposal = await service.create(
        {
          conversationId: 'conv-1',
          comment: '',
          actionWorkflowId: '',
          expiresAt: '',
          supersedesProposalId: '',
          targetEntities: ['', 'host.name:web-01'],
          impact: 'low',
          confidence: 'medium',
          origin: 'worker',
          workflowExecutionId: '',
        },
        { spaceId: SPACE_ID }
      );

      expect(proposal.expiresAt).toBeUndefined();
      expect(proposal.comment).toBeUndefined();
      expect(proposal.actionWorkflowId).toBeUndefined();
      expect(proposal.supersedesProposalId).toBeUndefined();
      expect(proposal.workflowExecutionId).toBeUndefined();
      expect(proposal.targetEntities).toEqual(['host.name:web-01']);
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

  describe('approve', () => {
    it('should record the decision before resuming the gate', async () => {
      const storage = createStorage(baseDocument());
      const { service, workflowsApi } = createService(storage);
      const callOrder: string[] = [];
      storage.index.mockImplementation(async () => {
        callOrder.push('index');
      });
      workflowsApi.resumeWorkflowExecution.mockImplementation(async () => {
        callOrder.push('resume');
        return { resumedBy: 'analyst' };
      });

      const proposal = await service.approve(
        'proposal-1',
        { actionInput: { name: 'PoC rule' } },
        decisionContext()
      );

      expect(proposal.status).toBe('approved');
      expect(proposal.decidedBy).toBe('analyst');
      expect(proposal.decidedAt).toEqual(expect.any(String));
      expect(callOrder).toEqual(['index', 'resume']);
    });

    it('should resume with the explicitly resolved waitForApproval step execution id', async () => {
      const storage = createStorage(baseDocument());
      const { service, workflowsApi } = createService(storage);

      await service.approve('proposal-1', {}, decisionContext());

      expect(workflowsApi.resumeWorkflowExecution).toHaveBeenCalledWith(
        EXECUTION_ID,
        SPACE_ID,
        { approved: true },
        expect.anything(),
        expect.objectContaining({ stepExecutionId: 'step-exec-1' })
      );
    });

    it('should guard the write with the loaded sequence number', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.approve('proposal-1', {}, decisionContext());

      expect(storage.index).toHaveBeenCalledWith(
        expect.objectContaining({ if_seq_no: 7, if_primary_term: 1 })
      );
    });

    it('should reject an approval whose action input no longer matches the record', async () => {
      const storage = createStorage(baseDocument());
      const { service, workflowsApi } = createService(storage);

      await expect(
        service.approve(
          'proposal-1',
          { actionInput: { name: 'something else' } },
          decisionContext()
        )
      ).rejects.toBeInstanceOf(ProposalConflictError);

      expect(storage.index).not.toHaveBeenCalled();
      expect(workflowsApi.resumeWorkflowExecution).not.toHaveBeenCalled();
    });

    it('should reject when another actor already decided', async () => {
      const storage = createStorage(baseDocument({ status: 'approved' }));
      const { service } = createService(storage);

      await expect(service.approve('proposal-1', {}, decisionContext())).rejects.toBeInstanceOf(
        ProposalConflictError
      );
    });

    it('should surface a losing concurrency race as a conflict', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);
      storage.index.mockRejectedValue(
        Object.assign(new Error('version conflict'), {
          statusCode: 409,
        })
      );

      await expect(service.approve('proposal-1', {}, decisionContext())).rejects.toBeInstanceOf(
        ProposalConflictError
      );
    });

    it('should reject a proposal past its decision deadline', async () => {
      const storage = createStorage(baseDocument({ expiresAt: '2020-01-01T00:00:00.000Z' }));
      const { service } = createService(storage);

      await expect(service.approve('proposal-1', {}, decisionContext())).rejects.toBeInstanceOf(
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

      await expect(service.approve('proposal-1', {}, decisionContext())).rejects.toBeInstanceOf(
        ProposalConflictError
      );
    });

    it('should skip the resume for a proposal with no waiting execution', async () => {
      const storage = createStorage(baseDocument({ workflowExecutionId: undefined }));
      const { service, workflowsApi } = createService(storage);

      const proposal = await service.approve('proposal-1', {}, decisionContext());

      expect(proposal.status).toBe('approved');
      expect(workflowsApi.resumeWorkflowExecution).not.toHaveBeenCalled();
    });

    it('should throw when the proposal does not exist in the space', async () => {
      const storage = createStorage();
      const { service } = createService(storage);

      await expect(service.approve('missing', {}, decisionContext())).rejects.toBeInstanceOf(
        ProposalNotFoundError
      );
    });
  });

  describe('dismiss', () => {
    it('should record the structured reason and release the gate negatively', async () => {
      const storage = createStorage(baseDocument());
      const { service, workflowsApi } = createService(storage);

      const proposal = await service.dismiss(
        'proposal-1',
        { dismissReason: 'low_value', rationale: 'Noise, not worth a rule' },
        decisionContext()
      );

      expect(proposal.status).toBe('dismissed');
      expect(proposal.dismissReason).toBe('low_value');
      expect(proposal.rationale).toBe('Noise, not worth a rule');
      expect(workflowsApi.resumeWorkflowExecution).toHaveBeenCalledWith(
        EXECUTION_ID,
        SPACE_ID,
        { approved: false },
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('recordResult', () => {
    it('should move the proposal to a terminal execution state', async () => {
      const storage = createStorage(baseDocument({ status: 'approved' }));
      const { service } = createService(storage);

      const proposal = await service.recordResult(
        { id: 'proposal-1', status: 'succeeded' },
        SPACE_ID
      );

      expect(proposal.status).toBe('succeeded');
    });

    it('should refuse a blank id without issuing an unsearchable ids query', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      // An on-failure handler that fires before creation succeeded resolves its
      // template to ''. Elasticsearch would answer with an opaque shard failure.
      await expect(
        service.recordResult({ id: '', status: 'failed' }, SPACE_ID)
      ).rejects.toBeInstanceOf(ProposalNotFoundError);

      expect(storage.search).not.toHaveBeenCalled();
    });

    it('should keep the failure detail when the action failed', async () => {
      const storage = createStorage(baseDocument({ status: 'executing' }));
      const { service } = createService(storage);

      const proposal = await service.recordResult(
        { id: 'proposal-1', status: 'failed', executionError: 'gate timed out' },
        SPACE_ID
      );

      expect(proposal.status).toBe('failed');
      expect(proposal.executionError).toBe('gate timed out');
    });
  });

  describe('resolveActionMetadata', () => {
    it('should ignore metadata that does not match the schema', async () => {
      const storage = createStorage();
      const workflowsApi = createWorkflowsApi();
      workflowsApi.getWorkflow.mockResolvedValue({
        definition: { consts: { actionMetadata: { category: 'not-a-category' } } },
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
    it('should filter by space, status and target entity', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(
        { status: 'pending', targetEntity: 'host.name:web-01', size: 50 },
        SPACE_ID
      );

      const [[searchArgs]] = storage.search.mock.calls;
      expect(searchArgs.query.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { spaceId: SPACE_ID } },
          { term: { status: 'pending' } },
          { term: { targetEntities: 'host.name:web-01' } },
        ])
      );
    });
  });
});

describe('sortForQueue', () => {
  const proposal = (overrides: Partial<Proposal>): Proposal =>
    ({
      id: 'x',
      ...baseDocument(),
      ...overrides,
    } as Proposal);

  it('should group by category before ranking by impact', () => {
    const sorted = sortForQueue([
      { ...proposal({ id: 'tune', category: 'tune', impact: 'critical' }), expired: false },
      { ...proposal({ id: 'contain', category: 'contain', impact: 'low' }), expired: false },
    ]);

    expect(sorted.map(({ id }) => id)).toEqual(['contain', 'tune']);
  });

  it('should rank impact and confidence by severity rather than alphabetically', () => {
    const sorted = sortForQueue([
      { ...proposal({ id: 'low', impact: 'low' }), expired: false },
      { ...proposal({ id: 'critical', impact: 'critical' }), expired: false },
      { ...proposal({ id: 'medium', impact: 'medium' }), expired: false },
      { ...proposal({ id: 'high', impact: 'high' }), expired: false },
    ]);

    expect(sorted.map(({ id }) => id)).toEqual(['critical', 'high', 'medium', 'low']);
  });

  it('should use the decision deadline as the tiebreak', () => {
    const sorted = sortForQueue([
      { ...proposal({ id: 'later', expiresAt: '2026-09-02T00:00:00.000Z' }), expired: false },
      { ...proposal({ id: 'sooner', expiresAt: '2026-09-01T00:00:00.000Z' }), expired: false },
    ]);

    expect(sorted.map(({ id }) => id)).toEqual(['sooner', 'later']);
  });
});
