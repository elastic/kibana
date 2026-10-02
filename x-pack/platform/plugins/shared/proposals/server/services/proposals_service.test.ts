/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ExecutionStatus } from '@kbn/workflows';
import {
  DEFAULT_PROPOSAL_TITLE,
  PROPOSAL_ATTACHMENT_TYPE,
  type ListProposalsQuery,
} from '@kbn/proposals-common';
import type { ProposalDocument, ProposalsStorageClient } from '../storage/proposals_storage';
import {
  ProposalConflictError,
  ProposalInvalidActionInputError,
  ProposalNotFoundError,
} from './errors';
import type { ReleaseGateParams } from './proposals_service';
import { ProposalsService } from './proposals_service';

const SPACE_ID = 'default';
const EXECUTION_ID = 'exec-1';
const request = httpServerMock.createKibanaRequest();

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
  title: 'Tune the noisy rule',
  comment: 'Tune the noisy rule',
  actionWorkflowId: 'system-alertzero-action-create-rule',
  actionInput: { name: 'Suspicious PowerShell' },
  status: 'pending',
  impact: 'low',
  confidence: 'medium',
  category: 'tune',
  origin: 'alertzero',
  ranks: { impact: 3, confidence: 1 },
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
    delete: jest.fn().mockResolvedValue({ acknowledged: true, result: 'deleted' }),
    search: jest.fn().mockResolvedValue({
      hits: { hits, total: { value: hits.length } },
    }),
    esql: jest.fn().mockResolvedValue(emptyEsql()),
  } as unknown as jest.Mocked<ProposalsStorageClient> & {
    index: jest.Mock;
    delete: jest.Mock;
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
  const attachmentsClient = {
    create: jest.fn().mockResolvedValue({ id: 'attachment-1' }),
    get: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(),
    bulkCreate: jest.fn(),
  };
  const getAttachmentsClient = jest.fn().mockResolvedValue(attachmentsClient);
  return {
    getAttachmentsClient,
    service: new ProposalsService({
      storage,
      logger,
      getWorkflowsApi: () => (workflowsApi ?? undefined) as never,
      getAttachmentsClient,
    }),
    workflowsApi: workflowsApi ?? createWorkflowsApi(),
    attachmentsClient,
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
    it("titles the attachment card with the proposal's own title over the action's name", async () => {
      const storage = createStorage();
      const { service, attachmentsClient } = createService(storage);

      await service.create(
        {
          conversationId: 'conv-1',
          title: 'Tune the Okta rule',
          comment: 'Tune the noisy rule',
          actionWorkflowId: 'system-alertzero-action-create-rule',
          confidence: 'medium',
          origin: 'alertzero',
        },
        { spaceId: SPACE_ID, request }
      );

      // The caller knows the situation the proposal came out of, which the
      // action's own name cannot — the same precedence `category` follows.
      expect(attachmentsClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'Tune the Okta rule' }),
        })
      );
    });

    it('should store a pending proposal with the category resolved from the action workflow', async () => {
      const storage = createStorage();
      const { service, workflowsApi } = createService(storage);

      const proposal = await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Tune the noisy rule',
          actionWorkflowId: 'system-alertzero-action-create-rule',
          actionInput: { name: 'Suspicious PowerShell' },
          impact: 'high',
          confidence: 'high',
          origin: 'alertzero',
          workflowExecutionId: EXECUTION_ID,
        },
        { spaceId: SPACE_ID, request, user: analyst('worker-user') }
      );

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith(
        'system-alertzero-action-create-rule',
        SPACE_ID,
        request
      );
      expect(proposal.status).toBe('pending');
      expect(proposal.category).toBe('tune');
      expect(proposal.workflowExecutionId).toBe(EXECUTION_ID);
      expect(storage.index).toHaveBeenCalledWith(
        expect.objectContaining({ op_type: 'create', id: proposal.id })
      );
    });

    it('should attach the proposal to its conversation so it renders in the chat', async () => {
      const storage = createStorage();
      const { service, attachmentsClient } = createService(storage);

      const proposal = await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Tune the noisy rule',
          actionWorkflowId: 'system-alertzero-action-create-rule',
          actionInput: { name: 'Suspicious PowerShell' },
          confidence: 'medium',
          origin: 'alertzero',
        },
        { spaceId: SPACE_ID, request }
      );

      // The id, plus a title the synchronous card label cannot read live. No
      // other field: the proposal is the source of truth, so a snapshot here
      // would keep saying "pending" after the analyst had decided.
      expect(attachmentsClient.create).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        type: 'platform.proposal',
        origin: proposal.id,
        // The action's own name, so the card is distinguishable at a glance.
        data: { proposalId: proposal.id, title: 'Create detection rule' },
        render_inline: true,
      });
    });

    // Not the workflow id: an opaque id reads as a name a caller chose, where
    // a constant plainly reads as the absence of one.
    it('should name the proposal with a constant when neither the caller nor the action does', async () => {
      const storage = createStorage();
      const workflowsApi = createWorkflowsApi();
      workflowsApi.getWorkflow.mockResolvedValue({ definition: {} });
      const { service, attachmentsClient } = createService(storage, workflowsApi);

      await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Tune the noisy rule',
          actionWorkflowId: 'system-alertzero-action-create-rule',
          confidence: 'medium',
          origin: 'alertzero',
        },
        { spaceId: SPACE_ID, request }
      );

      const [[createArgs]] = storage.index.mock.calls;
      expect(createArgs.document.title).toBe(DEFAULT_PROPOSAL_TITLE);
      expect(attachmentsClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: DEFAULT_PROPOSAL_TITLE }),
        })
      );
    });

    // Resolved on write so every reader renders one field instead of re-deriving
    // the chain, and a later rename leaves the record naming what was offered.
    it('should store the action name as the title when the caller supplies none', async () => {
      const storage = createStorage();
      const { service } = createService(storage);

      await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Tune the noisy rule',
          actionWorkflowId: 'system-alertzero-action-create-rule',
          actionInput: { name: 'Suspicious PowerShell' },
          confidence: 'medium',
          origin: 'alertzero',
        },
        { spaceId: SPACE_ID, request }
      );

      const [[createArgs]] = storage.index.mock.calls;
      expect(createArgs.document.title).toBe('Create detection rule');
    });

    it("should prefer the caller's title over the action name", async () => {
      const storage = createStorage();
      const { service } = createService(storage);

      await service.create(
        {
          conversationId: 'conv-1',
          title: 'Tune the Okta rule',
          comment: 'Tune the noisy rule',
          actionWorkflowId: 'system-alertzero-action-create-rule',
          actionInput: { name: 'Suspicious PowerShell' },
          confidence: 'medium',
          origin: 'alertzero',
        },
        { spaceId: SPACE_ID, request }
      );

      const [[createArgs]] = storage.index.mock.calls;
      expect(createArgs.document.title).toBe('Tune the Okta rule');
    });

    it('should still return the proposal when the conversation attachment fails', async () => {
      const storage = createStorage();
      const { service, attachmentsClient, logger } = createService(storage);
      attachmentsClient.create.mockRejectedValue(new Error('conversation is read-only'));

      // The gate workflow is already parked on this proposal, so losing the
      // card must not lose the decision it is waiting for.
      const proposal = await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Tune the noisy rule',
          confidence: 'medium',
          origin: 'alertzero',
        },
        { spaceId: SPACE_ID, request }
      );

      expect(proposal.status).toBe('pending');
      expect(storage.index).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(proposal.id));
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
            origin: 'alertzero',
          },
          { spaceId: SPACE_ID, request }
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
          origin: 'alertzero',
        },
        { spaceId: SPACE_ID, request }
      );

      // Metadata and input validation share the one fetch.
      expect(workflowsApi.getWorkflow).toHaveBeenCalledTimes(1);
    });

    it('should return the action metadata it resolved, so a caller need not fetch it again', async () => {
      const storage = createStorage();
      const workflowsApi = createWorkflowsApi();
      workflowsApi.getWorkflow.mockResolvedValue({
        definition: {
          consts: {
            actionMetadata: {
              name: 'Isolate host',
              category: 'contain',
              approvalPolicy: 'always-gate',
            },
          },
        },
      });
      const { service } = createService(storage, workflowsApi);

      // The gate workflow has to honour `always-gate`, and the creation path
      // already read the definition that declares it.
      const proposal = await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Isolate the host',
          actionWorkflowId: 'system-alertzero-action-create-rule',
          confidence: 'high',
          origin: 'alertzero',
        },
        { spaceId: SPACE_ID, request }
      );

      expect(proposal.action?.approvalPolicy).toBe('always-gate');
      expect(workflowsApi.getWorkflow).toHaveBeenCalledTimes(1);
    });

    it('should leave the action metadata unset for a proposal with no action', async () => {
      const storage = createStorage();
      const { service, workflowsApi } = createService(storage);

      const proposal = await service.create(
        {
          conversationId: 'conv-1',
          comment: 'Rotate the credentials by hand, then approve',
          category: 'respond',
          confidence: 'medium',
          origin: 'alertzero',
        },
        { spaceId: SPACE_ID, request }
      );

      expect(proposal.action).toBeUndefined();
      expect(workflowsApi.getWorkflow).not.toHaveBeenCalled();
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
          origin: 'alertzero',
        },
        { spaceId: SPACE_ID, request }
      );

      const [[indexArgs]] = storage.index.mock.calls;
      expect(indexArgs.document).toMatchObject({
        ranks: { impact: 1, confidence: 0 },
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
          origin: 'alertzero',
        },
        { spaceId: SPACE_ID, request }
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
          origin: 'alertzero',
        },
        { spaceId: SPACE_ID, request }
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
          origin: 'alertzero',
        },
        { spaceId: SPACE_ID, request }
      );

      // The impact rank is the queue's primary sort key, so it always has a value.
      expect(proposal.impact).toBe('low');
      const [[indexArgs]] = storage.index.mock.calls;
      expect(indexArgs.document.ranks.impact).toBe(3);
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
          origin: 'alertzero',
        },
        { spaceId: SPACE_ID, request }
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
          origin: 'alertzero',
        },
        { spaceId: SPACE_ID, request }
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
          origin: 'alertzero',
        },
        { spaceId: SPACE_ID, request }
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
          origin: 'alertzero',
        },
        { spaceId: SPACE_ID, request }
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
          origin: 'alertzero',
          workflowExecutionId: '',
        },
        { spaceId: SPACE_ID, request }
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
          origin: 'alertzero',
        },
        { spaceId: SPACE_ID, request }
      );

      expect(proposal.actionWorkflowId).toBeUndefined();
      expect(workflowsApi.getWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('create — deduplicationKey', () => {
    const dedupParams = (overrides: Partial<Parameters<ProposalsService['create']>[0]> = {}) => ({
      conversationId: 'conv-1',
      comment: 'Isolate the host for this finding',
      confidence: 'medium' as const,
      origin: 'alertzero' as const,
      deduplicationKey: 'finding-abc',
      ...overrides,
    });

    it('stamps the supplied key onto the stored document', async () => {
      const storage = createStorage();
      const { service } = createService(storage);

      await service.create(dedupParams(), { spaceId: SPACE_ID, request });

      const [[createArgs]] = storage.index.mock.calls;
      expect(createArgs.document.deduplicationKey).toBe('finding-abc');
      expect(createArgs.op_type).toBe('create');
    });

    it('derives the same id from the same (spaceId, origin, deduplicationKey) every time', async () => {
      const storageA = createStorage();
      const { service: serviceA } = createService(storageA);
      const proposalA = await serviceA.create(dedupParams(), { spaceId: SPACE_ID, request });

      const storageB = createStorage();
      const { service: serviceB } = createService(storageB);
      const proposalB = await serviceB.create(dedupParams(), { spaceId: SPACE_ID, request });

      expect(proposalA.id).toBe(proposalB.id);
    });

    it('derives a different id for a different origin under the same key', async () => {
      // A key only has to be unique within one producer's own namespace: two
      // different producers using the literal same string must not collide.
      const storage = createStorage();
      const { service } = createService(storage);
      const alertzero = await service.create(dedupParams({ origin: 'alertzero' }), {
        spaceId: SPACE_ID,
        request,
      });
      const other = await service.create(dedupParams({ origin: 'nightshift' }), {
        spaceId: SPACE_ID,
        request,
      });

      expect(alertzero.id).not.toBe(other.id);
    });

    it('omitting the key behaves identically to today: a fresh random id every call', async () => {
      const storage = createStorage();
      const { service } = createService(storage);
      const first = await service.create(dedupParams({ deduplicationKey: undefined }), {
        spaceId: SPACE_ID,
        request,
      });
      const second = await service.create(dedupParams({ deduplicationKey: undefined }), {
        spaceId: SPACE_ID,
        request,
      });

      expect(first.id).not.toBe(second.id);
    });

    it("reuses the existing chain, not the new call's own params, when the id already exists", async () => {
      const existing = baseDocument({
        comment: 'Original comment from the first call',
        title: 'Original title',
        deduplicationKey: 'finding-abc',
      });
      const storage = createStorage();
      // The id is deterministic, so the conflict (and the subsequent load) can
      // be scripted without knowing it in advance: `index` always conflicts,
      // and `search` always answers with the one existing document, regardless
      // of which id either call asks for — there is only ever one in this test.
      storage.index.mockRejectedValue(
        Object.assign(new Error('version conflict'), { statusCode: 409 })
      );
      storage.search.mockResolvedValue({
        hits: { hits: [searchHit(existing, 'existing-id')], total: { value: 1 } },
      });
      const { service, attachmentsClient } = createService(storage);

      const reused = await service.create(
        dedupParams({ comment: 'A second, different comment the caller happened to pass' }),
        { spaceId: SPACE_ID, request }
      );

      // The existing chain's own state, not anything derived from this call.
      expect(reused.id).toBe('existing-id');
      expect(reused.comment).toBe('Original comment from the first call');
      expect(reused.title).toBe('Original title');
      // Already attached when the chain was first created; a replay must not
      // post a second card into the conversation.
      expect(attachmentsClient.create).not.toHaveBeenCalled();
    });

    it('does not run a precondition check before attempting the create', async () => {
      // The atomicity this relies on comes from `op_type: 'create'` itself, not
      // from a check-then-create pair in application code — a separate lookup
      // first would reopen exactly the race window a deduplication key exists
      // to close. Asserting the call order (not just that `search` was never
      // called at all — `load()`'s search after a conflict is legitimate and
      // covered by the test above) is what actually proves there is no
      // precondition check preceding the create attempt.
      const storage = createStorage();
      const { service } = createService(storage);
      const calls: string[] = [];
      storage.index.mockImplementation(async () => {
        calls.push('index');
        return { _id: 'whatever' };
      });
      storage.search.mockImplementation(async () => {
        calls.push('search');
        return { hits: { hits: [], total: { value: 0 } } };
      });

      await service.create(dedupParams(), { spaceId: SPACE_ID, request });

      expect(calls[0]).toBe('index');
    });

    /**
     * A true multi-request race can only be fully proven against real
     * Elasticsearch, where `op_type: 'create'` is actually atomic — that would
     * need a `jest_integration` suite against a live cluster, which this plugin
     * does not have today. What a unit test *can* prove, and what this does: two
     * `create()` calls fired together, racing against a storage fake that
     * faithfully enforces the same "only the first `create` to reach a given id
     * wins, every other throws a conflict" contract real Elasticsearch
     * documents, resolve to the same single chain rather than two — with the
     * fake's own check-and-set forced apart by a real `await` boundary so the
     * two calls actually interleave at that point instead of just running one
     * after the other in call order.
     */
    it('lets only one of two concurrent calls with the same key create the chain', async () => {
      const documents = new Map<string, ProposalDocument>();
      let created = 0;
      const storage = {
        index: jest.fn(
          async ({
            id,
            document,
            op_type,
          }: {
            id: string;
            document: ProposalDocument;
            op_type?: string;
          }) => {
            if (op_type === 'create') {
              // Forces both callers to reach the check below only after both
              // have already started, so whichever wins is decided by this
              // race, not by which call happened to be issued first.
              await new Promise((resolve) => setImmediate(resolve));
              if (documents.has(id)) {
                throw Object.assign(new Error('version conflict'), { statusCode: 409 });
              }
              created += 1;
            }
            documents.set(id, document);
            return { _id: id };
          }
        ),
        search: jest.fn(
          async ({ query }: { query: { bool: { filter: Array<Record<string, any>> } } }) => {
            const idClause = query.bool.filter.find((clause) => 'ids' in clause);
            const id = idClause?.ids.values[0];
            const document = id ? documents.get(id) : undefined;
            return {
              hits: {
                hits: document
                  ? [{ _id: id, _source: document, _seq_no: 1, _primary_term: 1 }]
                  : [],
                total: { value: document ? 1 : 0 },
              },
            };
          }
        ),
      } as unknown as ReturnType<typeof createStorage>;
      const { service: serviceA, attachmentsClient: attachmentsA } = createService(storage);
      const { service: serviceB, attachmentsClient: attachmentsB } = createService(storage);

      const [resultA, resultB] = await Promise.all([
        serviceA.create(dedupParams(), { spaceId: SPACE_ID, request }),
        serviceB.create(dedupParams(), { spaceId: SPACE_ID, request }),
      ]);

      expect(resultA.id).toBe(resultB.id);
      expect(created).toBe(1);
      expect(documents.size).toBe(1);
      // Exactly one of the two actually created the chain and attached it; the
      // other reused the winner's chain rather than posting a second card.
      expect(attachmentsA.create.mock.calls.length + attachmentsB.create.mock.calls.length).toBe(1);
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

      const params = releaseParams();
      await service.releaseGate('proposal-1', params);
      expect(workflowsApi.getWorkflowExecution).toHaveBeenCalledWith(EXECUTION_ID, SPACE_ID, {
        request: params.request,
      });

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
      // the deadline passes.
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
          dismissReason: 'risk_accepted',
          rationale: 'Noise, not worth a rule',
        })
      );

      const [[indexArgs]] = storage.index.mock.calls;
      expect(indexArgs.document).toEqual(
        expect.objectContaining({
          dismissReason: 'risk_accepted',
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
          releaseParams({ approved: false, dismissReason: 'risk_accepted' })
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
          releaseParams({ approved: false, dismissReason: 'risk_accepted' })
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

    it('should refuse to move a proposal to superseded, which only revise() establishes', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      // A terminal row with no successor would still read as live.
      await expect(
        service.update({ id: 'proposal-1', status: 'superseded' }, SPACE_ID)
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

  describe.each(['clone', 'revise'] as const)('%s attachments', (operation) => {
    const original = () =>
      baseDocument(operation === 'clone' ? { decision: 'approved', status: 'failed' } : {});

    it('attaches the successor with its proposal title after linking it', async () => {
      const storage = createStorage(original());
      const { service, attachmentsClient, getAttachmentsClient } = createService(storage);
      attachmentsClient.create.mockImplementation(async () => {
        expect(storage.index).toHaveBeenCalledTimes(2);
        return { id: 'attachment-2' };
      });

      const result = await service[operation]({ id: 'proposal-1' }, SPACE_ID, request);
      const proposalId = typeof result === 'string' ? result : result.proposalId;
      expect(getAttachmentsClient).toHaveBeenCalledWith(request);
      expect(attachmentsClient.create).toHaveBeenCalledTimes(1);
      expect(attachmentsClient.create).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        type: PROPOSAL_ATTACHMENT_TYPE,
        origin: proposalId,
        data: { proposalId, title: 'Tune the noisy rule' },
        render_inline: true,
      });
    });

    it('keeps the successor when attachment creation fails', async () => {
      const { service, attachmentsClient, logger } = createService(createStorage(original()));
      attachmentsClient.create.mockRejectedValue(new Error('attachment unavailable'));
      await expect(
        service[operation]({ id: 'proposal-1' }, SPACE_ID, request)
      ).resolves.toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to attach proposal')
      );
    });

    it('does not attach an invalid successor', async () => {
      const { service, attachmentsClient } = createService(
        createStorage(baseDocument({ decision: 'dismissed', status: 'no_action' }))
      );
      await expect(
        service[operation]({ id: 'proposal-1' }, SPACE_ID, request)
      ).rejects.toBeInstanceOf(ProposalConflictError);
      expect(attachmentsClient.create).not.toHaveBeenCalled();
    });

    it.each([409, 503])('does not attach after a failed link write (%s)', async (statusCode) => {
      const storage = createStorage(original());
      const { service, attachmentsClient } = createService(storage);
      storage.index
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(Object.assign(new Error('link failed'), { statusCode }));
      await expect(service[operation]({ id: 'proposal-1' }, SPACE_ID, request)).rejects.toThrow();
      expect(attachmentsClient.create).not.toHaveBeenCalled();
    });
  });

  describe('clone', () => {
    it('inherits the origin, so a retry stays in the queue that raised it', async () => {
      const storage = createStorage(
        baseDocument({ origin: 'nightshift', decision: 'approved', status: 'failed' })
      );
      const { service } = createService(storage);

      await service.clone({ id: 'proposal-1' }, SPACE_ID, request);

      const [[cloneArgs]] = storage.index.mock.calls;
      expect(cloneArgs.document.origin).toBe('nightshift');
    });

    it('carries the failure it re-offers onto the clone, so the queue need not fetch the predecessor', async () => {
      const storage = createStorage(baseDocument({ decision: 'approved', status: 'failed' }));
      const { service } = createService(storage);

      await service.clone(
        { id: 'proposal-1', executionError: 'rule API rejected it' },
        SPACE_ID,
        request
      );

      const [[cloneArgs]] = storage.index.mock.calls;
      expect(cloneArgs.document).toMatchObject({
        status: 'pending',
        previousExecutionError: 'rule API rejected it',
        // Its own error is the *next* attempt's, which has not happened yet.
        executionError: undefined,
      });
    });

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

      const cloneId = await service.clone({ id: 'proposal-1' }, SPACE_ID, request);

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

      await service.clone({ id: 'proposal-1' }, SPACE_ID, request);

      const [[cloneArgs]] = storage.index.mock.calls;
      expect(cloneArgs.document).toMatchObject({
        conversationId: 'conv-1',
        comment: 'Tune the noisy rule',
        actionWorkflowId: 'system-alertzero-action-create-rule',
        actionInput: { name: 'Suspicious PowerShell' },
        impact: 'low',
        confidence: 'medium',
        category: 'tune',
        origin: 'alertzero',
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
        SPACE_ID,
        request
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
      await expect(service.clone({ id: 'proposal-1' }, SPACE_ID, request)).rejects.toBeInstanceOf(
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

      await expect(service.clone({ id: 'proposal-1' }, SPACE_ID, request)).rejects.toBeInstanceOf(
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

      await expect(service.clone({ id: 'missing' }, SPACE_ID, request)).rejects.toBeInstanceOf(
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

      await expect(service.clone({ id: 'proposal-1' }, SPACE_ID, request)).rejects.toBeInstanceOf(
        ProposalConflictError
      );
      expect(storage.index).not.toHaveBeenCalled();
    });
  });

  describe('revise', () => {
    it('inherits the origin, so a chain cannot split across two queues', async () => {
      const storage = createStorage(baseDocument({ origin: 'nightshift' }));
      const { service } = createService(storage);

      await service.revise({ id: 'proposal-1', comment: 'Revised' }, SPACE_ID, request);

      // No revise input can move it, and consumers filter on exact equality:
      // a revision that relabelled itself would vanish from the queue showing
      // its predecessor.
      const [[reviseArgs]] = storage.index.mock.calls;
      expect(reviseArgs.document.origin).toBe('nightshift');
    });

    it('keeps the predecessor title when the override is blank', async () => {
      const storage = createStorage(baseDocument({ title: 'Tune the Okta rule' }));
      const { service } = createService(storage);

      await service.revise({ id: 'proposal-1', title: '   ' }, SPACE_ID, request);

      // The revision is written first; the second call marks the predecessor.
      const [[revisionArgs]] = storage.index.mock.calls;
      // A blank is not a rename: clearing the title would strip the proposal of
      // the name `create()` resolved for it, leaving the queue a generic row.
      expect(revisionArgs.document.title).toBe('Tune the Okta rule');
    });

    it('applies a title override, since renaming is exactly what produces a revision', async () => {
      const storage = createStorage(baseDocument({ title: 'Tune noisy rule' }));
      const { service } = createService(storage);

      await service.revise({ id: 'proposal-1', title: 'Tune the Okta rule' }, SPACE_ID, request);

      const [[reviseArgs]] = storage.index.mock.calls;
      expect(reviseArgs.document).toMatchObject({ title: 'Tune the Okta rule' });
    });

    it('keeps the failure the predecessor was re-offered for', async () => {
      // The predecessor is pending, so it never ran: whatever failure it was
      // itself created to re-offer is not this revision's predecessor error.
      const storage = createStorage(
        baseDocument({ previousExecutionError: 'rule API rejected it' })
      );
      const { service } = createService(storage);

      await service.revise({ id: 'proposal-1' }, SPACE_ID, request);

      const [[reviseArgs]] = storage.index.mock.calls;
      // A revision corrects a proposal without running anything, so the
      // retry warning an analyst is about to act on must survive the edit.
      expect(reviseArgs.document.previousExecutionError).toBe('rule API rejected it');
    });

    it('creates a new pending revision and marks the original superseded', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      const result = await service.revise(
        { id: 'proposal-1', comment: 'Tightened the match' },
        SPACE_ID,
        request
      );

      expect(result).toEqual({ proposalId: expect.any(String), revision: 2 });
      expect(result.proposalId).not.toBe('proposal-1');

      expect(storage.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: result.proposalId,
          op_type: 'create',
          document: expect.objectContaining({
            rootProposalId: 'proposal-1',
            supersedes: 'proposal-1',
            revision: 2,
            status: 'pending',
            comment: 'Tightened the match',
            supersededBy: undefined,
            decision: undefined,
          }),
        })
      );
      expect(storage.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'proposal-1',
          document: expect.objectContaining({
            status: 'superseded',
            supersededBy: result.proposalId,
          }),
        })
      );
    });

    it('creates the new revision before marking the original, mirroring clone()', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.revise({ id: 'proposal-1' }, SPACE_ID, request);

      const newRevisionCallOrder = storage.index.mock.invocationCallOrder[0];
      const supersedeCallOrder = storage.index.mock.invocationCallOrder[1];
      expect(newRevisionCallOrder).toBeLessThan(supersedeCallOrder);
    });

    it('inherits createdAt and expiresAt from the original unchanged', async () => {
      const storage = createStorage(
        baseDocument({
          createdAt: '2026-09-01T00:00:00.000Z',
          expiresAt: '2099-01-01T00:00:00.000Z',
        })
      );
      const { service } = createService(storage);

      await service.revise({ id: 'proposal-1' }, SPACE_ID, request);

      expect(storage.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            createdAt: '2026-09-01T00:00:00.000Z',
            expiresAt: '2099-01-01T00:00:00.000Z',
          }),
        })
      );
    });

    it('carries rootProposalId forward unchanged across a multi-hop chain', async () => {
      // Revision 3 of a chain whose root is proposal-1 — revising it must not
      // start a new root, only extend the existing chain.
      const storage = createStorage(
        baseDocument({ rootProposalId: 'proposal-1', supersedes: 'proposal-2', revision: 3 })
      );
      const { service } = createService(storage);

      const result = await service.revise({ id: 'proposal-3' }, SPACE_ID, request);

      expect(result.revision).toBe(4);
      expect(storage.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            rootProposalId: 'proposal-1',
            supersedes: 'proposal-3',
            revision: 4,
          }),
        })
      );
    });

    it('treats an undefined revision on the original as revision 1 (pre-existing records)', async () => {
      const storage = createStorage(
        baseDocument({ revision: undefined, rootProposalId: undefined })
      );
      const { service } = createService(storage);

      const result = await service.revise({ id: 'proposal-1' }, SPACE_ID, request);

      expect(result.revision).toBe(2);
      expect(storage.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({ rootProposalId: 'proposal-1', revision: 2 }),
        })
      );
    });

    it('rejects revising a proposal that is already superseded', async () => {
      const storage = createStorage(
        baseDocument({ status: 'superseded', supersededBy: 'proposal-2' })
      );
      const { service } = createService(storage);

      await expect(service.revise({ id: 'proposal-1' }, SPACE_ID, request)).rejects.toBeInstanceOf(
        ProposalConflictError
      );
      expect(storage.index).not.toHaveBeenCalled();
    });

    it('rejects revising a proposal that already has a decision', async () => {
      const storage = createStorage(baseDocument({ decision: 'approved', status: 'executing' }));
      const { service } = createService(storage);

      await expect(service.revise({ id: 'proposal-1' }, SPACE_ID, request)).rejects.toBeInstanceOf(
        ProposalConflictError
      );
      expect(storage.index).not.toHaveBeenCalled();
    });

    it('rejects revising a proposal that is not pending (e.g. executing)', async () => {
      const storage = createStorage(baseDocument({ status: 'executing' }));
      const { service } = createService(storage);

      await expect(service.revise({ id: 'proposal-1' }, SPACE_ID, request)).rejects.toBeInstanceOf(
        ProposalConflictError
      );
      expect(storage.index).not.toHaveBeenCalled();
    });

    it('does not resume or release the waitForApproval gate', async () => {
      const storage = createStorage(baseDocument());
      const { service, workflowsApi } = createService(storage);

      await service.revise({ id: 'proposal-1' }, SPACE_ID, request);

      expect(workflowsApi.resumeWorkflowExecution).not.toHaveBeenCalled();
    });

    it('merges an actionInput override over the original instead of replacing it', async () => {
      const storage = createStorage(
        baseDocument({ actionInput: { name: 'Suspicious PowerShell', severity: 'medium' } })
      );
      const { service } = createService(storage);

      await service.revise(
        { id: 'proposal-1', actionInput: { severity: 'high' } },
        SPACE_ID,
        request
      );

      // The stored input keeps the keys the caller did not mention: a
      // replacement would silently drop `name`, which the action requires.
      expect(storage.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            actionInput: { name: 'Suspicious PowerShell', severity: 'high' },
          }),
        })
      );
    });

    it('validates the merged actionInput against the original action workflow', async () => {
      const storage = createStorage(
        baseDocument({ actionInput: { name: 'Suspicious PowerShell' } })
      );
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

      // The original input was valid; only the override makes it unrunnable.
      // Caught here rather than after the analyst approves the revision.
      await expect(
        service.revise({ id: 'proposal-1', actionInput: { name: 123 } }, SPACE_ID, request)
      ).rejects.toThrow(ProposalInvalidActionInputError);
      expect(storage.index).not.toHaveBeenCalled();
    });

    it('recomputes the sort ranks when the rating overrides change', async () => {
      const storage = createStorage(
        baseDocument({ impact: 'low', confidence: 'medium', ranks: { impact: 3, confidence: 1 } })
      );
      const { service } = createService(storage);

      await service.revise(
        { id: 'proposal-1', impact: 'critical', confidence: 'low' },
        SPACE_ID,
        request
      );

      // Without the recompute the revision would read `critical` while still
      // sorting as `low`, because the queue orders on the rank mirrors.
      expect(storage.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            impact: 'critical',
            confidence: 'low',
            ranks: { impact: 0, confidence: 2 },
          }),
        })
      );
    });

    it('keeps the inherited rating rank when only the other rating is overridden', async () => {
      const storage = createStorage(
        baseDocument({ impact: 'low', confidence: 'medium', ranks: { impact: 3, confidence: 1 } })
      );
      const { service } = createService(storage);

      await service.revise({ id: 'proposal-1', confidence: 'high' }, SPACE_ID, request);

      expect(storage.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            impact: 'low',
            confidence: 'high',
            ranks: { impact: 3, confidence: 0 },
          }),
        })
      );
    });

    it('retires the revision it created when the predecessor write loses its race', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);
      storage.index
        .mockResolvedValueOnce({ _id: 'revision-1' })
        .mockRejectedValueOnce(Object.assign(new Error('version conflict'), { statusCode: 409 }));

      await expect(service.revise({ id: 'proposal-1' }, SPACE_ID, request)).rejects.toBeInstanceOf(
        ProposalConflictError
      );

      // The losing side must not leave a live, unreferenced second head behind.
      const createdId = storage.index.mock.calls[0][0].id;
      expect(storage.delete).toHaveBeenCalledWith({ id: createdId });
    });

    it('leaves the created revision in place when the predecessor write fails ambiguously', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);
      storage.index
        .mockResolvedValueOnce({ _id: 'revision-1' })
        .mockRejectedValueOnce(new Error('connection reset'));

      // A non-conflict failure does not prove the predecessor write did not land,
      // so the ambiguous case keeps both rows rather than risk orphaning it.
      await expect(service.revise({ id: 'proposal-1' }, SPACE_ID, request)).rejects.toThrow(
        'connection reset'
      );
      expect(storage.delete).not.toHaveBeenCalled();
    });
  });

  describe('getLatestRevision', () => {
    it('returns the proposal itself when it is the live revision', async () => {
      const storage = createStorage(baseDocument({ rootProposalId: 'proposal-1', revision: 1 }));
      const { service } = createService(storage);

      const result = await service.getLatestRevision('proposal-1', SPACE_ID);

      expect(result).toEqual({
        proposalId: 'proposal-1',
        revision: 1,
        status: 'pending',
        decision: undefined,
        actionInput: { name: 'Suspicious PowerShell' },
      });
    });

    it('resolves to the current live revision when asked about an older, superseded one', async () => {
      // The hit's document determines the "live" answer regardless of which id in
      // the chain was asked about — this is what makes the query O(1).
      const rootDocument = baseDocument({
        rootProposalId: 'proposal-1',
        supersededBy: 'proposal-2',
      });
      const liveDocument = baseDocument({
        rootProposalId: 'proposal-1',
        supersedes: 'proposal-1',
        revision: 2,
        status: 'pending',
        // Deliberately different from the root's: a caller resolving the head has to
        // run these parameters, not the ones the analyst revised away.
        actionInput: { name: 'Revised PowerShell' },
      });
      const storage = createStorage(rootDocument);
      // Dispatch on the query, not call order, so the asked-about row and the head
      // are genuinely different documents: answering both with the head would let a
      // read of the wrong document pass unnoticed.
      storage.search.mockImplementation(async (searchRequest: { query?: unknown }) => {
        const filter =
          (
            searchRequest.query as
              | {
                  bool?: {
                    filter?: Array<{ term?: Record<string, unknown>; ids?: { values: string[] } }>;
                  };
                }
              | undefined
          )?.bool?.filter ?? [];
        const asksForRoot = filter.some((clause) => clause.term?.rootProposalId !== undefined);
        const askedForId = filter.find((clause) => clause.ids !== undefined)?.ids?.values[0];

        if (asksForRoot) {
          return { hits: { hits: [searchHit(liveDocument, 'proposal-2')], total: { value: 1 } } };
        }
        return askedForId === 'proposal-2'
          ? { hits: { hits: [searchHit(liveDocument, 'proposal-2')], total: { value: 1 } } }
          : { hits: { hits: [searchHit(rootDocument, 'proposal-1')], total: { value: 1 } } };
      });
      const { service } = createService(storage);

      const result = await service.getLatestRevision('proposal-1', SPACE_ID);

      expect(result).toEqual({
        proposalId: 'proposal-2',
        revision: 2,
        status: 'pending',
        decision: undefined,
        actionInput: { name: 'Revised PowerShell' },
      });
      expect(storage.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([{ term: { rootProposalId: 'proposal-1' } }]),
              must_not: [{ exists: { field: 'supersededBy' } }],
            }),
          }),
        })
      );
    });

    it('falls back to the asked-about proposal if the chain query finds no live revision', async () => {
      const document = baseDocument({ rootProposalId: 'proposal-1', revision: 1 });
      const storage = createStorage(document);
      // First call is the internal load(); second is the chain query — only
      // the chain query should come back empty, otherwise this is testing a
      // different failure (load() itself finding nothing).
      storage.search
        .mockResolvedValueOnce({
          hits: { hits: [searchHit(document, 'proposal-1')], total: { value: 1 } },
        })
        .mockResolvedValueOnce({ hits: { hits: [], total: { value: 0 } } });
      const { service } = createService(storage);

      const result = await service.getLatestRevision('proposal-1', SPACE_ID);

      expect(result).toEqual({
        proposalId: 'proposal-1',
        revision: 1,
        status: 'pending',
        decision: undefined,
        actionInput: { name: 'Suspicious PowerShell' },
      });
    });

    it('follows supersededBy pointers for a chain written before rootProposalId existed', async () => {
      // No `rootProposalId` on either row: the term query cannot find this
      // chain, so the pointer walk is the only way to the live head.
      const legacyRoot = baseDocument({ supersededBy: 'proposal-2' });
      const live = baseDocument({
        supersedes: 'proposal-1',
        revision: 2,
        status: 'pending',
        actionInput: { name: 'Revised PowerShell' },
      });
      const storage = createStorage(legacyRoot);
      // Dispatch on the query, not call order. A legacy row carries no
      // `rootProposalId`, so the chain query answers empty and the pointer walk is
      // forced; answering it elsewhere would pass without the walk ever running.
      interface QueryClause {
        term?: Record<string, unknown>;
        ids?: { values: string[] };
      }
      const queryFilter = (searchRequest: { query?: unknown }): QueryClause[] =>
        (searchRequest.query as { bool?: { filter?: QueryClause[] } } | undefined)?.bool?.filter ??
        [];
      storage.search.mockImplementation(async (searchRequest) => {
        const filter = queryFilter(searchRequest);
        if (filter.some((clause) => clause.term?.rootProposalId !== undefined)) {
          return { hits: { hits: [], total: { value: 0 } } };
        }
        const requestedId = filter.find((clause) => clause.ids !== undefined)?.ids?.values[0];
        return requestedId === 'proposal-2'
          ? { hits: { hits: [searchHit(live, 'proposal-2')], total: { value: 1 } } }
          : { hits: { hits: [searchHit(legacyRoot, 'proposal-1')], total: { value: 1 } } };
      });
      const { service } = createService(storage);

      const result = await service.getLatestRevision('proposal-1', SPACE_ID);

      // Answering with the stale member would hand a parked gate an id whose
      // decision write `update()` then refuses.
      expect(result).toEqual({
        proposalId: 'proposal-2',
        revision: 2,
        status: 'pending',
        decision: undefined,
        actionInput: { name: 'Revised PowerShell' },
      });
      // The successor is reached by following its pointer, not by the root
      // term — a chain query for this row would be an empty answer.
      expect(storage.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [{ ids: { values: ['proposal-2'] } }, { term: { spaceId: SPACE_ID } }],
            },
          },
        })
      );
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
        service.resolveActionMetadata('system-alertzero-action-create-rule', SPACE_ID, request)
      ).resolves.toBeUndefined();
    });

    it('should not fail when the workflows API is unavailable', async () => {
      const storage = createStorage();
      const { service } = createService(storage, null);

      await expect(
        service.resolveActionMetadata('system-alertzero-action-create-rule', SPACE_ID, request)
      ).resolves.toBeUndefined();
    });
  });

  describe('list', () => {
    it('should filter by space, status and conversation', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(
        listQuery({ status: 'pending', conversationId: 'conv-1' }),
        SPACE_ID,
        request
      );

      const [[searchArgs]] = storage.search.mock.calls;
      expect(searchArgs.query.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { spaceId: SPACE_ID } },
          { term: { status: 'pending' } },
          { term: { conversationId: 'conv-1' } },
        ])
      );
    });

    // The only thing keeping another producer's proposals out of a solution's
    // queue, and the callers that rely on it assert against a mocked `list` —
    // so nothing else checks that the filter reaches Elasticsearch at all.
    it('should filter by origin, which is what scopes a queue to its producer', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(listQuery({ origin: 'alertzero' }), SPACE_ID, request);

      const [[searchArgs]] = storage.search.mock.calls;
      expect(searchArgs.query.bool.filter).toEqual(
        expect.arrayContaining([{ term: { origin: 'alertzero' } }])
      );
    });

    it('should order by rank in Elasticsearch rather than after the fetch', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(listQuery(), SPACE_ID, request);

      const [[searchArgs]] = storage.search.mock.calls;
      // The keyword enums sort alphabetically, so the queue's order comes from
      // the numeric ranks written at creation.
      expect(searchArgs.sort).toEqual([
        { 'ranks.impact': { order: 'asc' } },
        { 'ranks.confidence': { order: 'asc' } },
        { expiresAt: { order: 'asc', missing: '_last' } },
        { createdAt: { order: 'desc' } },
      ]);
    });

    it('should page in Elasticsearch, so the queue is not capped at a single fetch', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(listQuery({ size: 25, from: 50 }), SPACE_ID, request);

      const [[searchArgs]] = storage.search.mock.calls;
      expect(searchArgs.size).toBe(25);
      expect(searchArgs.from).toBe(50);
      expect(searchArgs.track_total_hits).toBe(true);
    });

    it('should keep proposals with no deadline when excluding expired ones', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(listQuery({ excludeExpired: true }), SPACE_ID, request);

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

      await service.list(listQuery(), SPACE_ID, request);

      const [[searchArgs]] = storage.search.mock.calls;
      expect(JSON.stringify(searchArgs.query.bool.filter)).not.toContain('expiresAt');
    });

    it('should express awaiting a decision as the pending status alone', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(listQuery({ status: 'pending' }), SPACE_ID, request);

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

      await service.list(listQuery({ decision: 'dismissed' }), SPACE_ID, request);

      const [[searchArgs]] = storage.search.mock.calls;
      expect(searchArgs.query.bool.filter).toEqual(
        expect.arrayContaining([{ term: { decision: 'dismissed' } }])
      );
    });

    it('should drop superseded proposals so a retried chain shows only its head', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(listQuery({ excludeSuperseded: true }), SPACE_ID, request);

      const [[searchArgs]] = storage.search.mock.calls;
      expect(searchArgs.query.bool.filter).toEqual(
        expect.arrayContaining([{ bool: { must_not: { exists: { field: 'supersededBy' } } } }])
      );
    });

    it('should bound the closed queue to the requested recency window', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(listQuery({ decidedWithinHours: 72 }), SPACE_ID, request);

      const [[searchArgs]] = storage.search.mock.calls;
      expect(searchArgs.query.bool.filter).toEqual(
        expect.arrayContaining([{ range: { decidedAt: { gte: 'now-72h' } } }])
      );
    });

    it('should not bound on decidedAt when no window is requested', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(listQuery(), SPACE_ID, request);

      const [[searchArgs]] = storage.search.mock.calls;
      expect(JSON.stringify(searchArgs.query.bool.filter)).not.toContain('decidedAt');
    });

    it('should not filter on decision or supersession by default', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      await service.list(listQuery(), SPACE_ID, request);

      const [[searchArgs]] = storage.search.mock.calls;
      const filter = JSON.stringify(searchArgs.query.bool.filter);
      expect(filter).not.toContain('decision');
      expect(filter).not.toContain('supersededBy');
    });

    it('should not leak the storage-only sort ranks into the response', async () => {
      const storage = createStorage(baseDocument());
      const { service } = createService(storage);

      const { proposals } = await service.list(listQuery(), SPACE_ID, request);

      expect(proposals[0]).not.toHaveProperty('ranks');
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

      await service.list(listQuery(), SPACE_ID, request);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledTimes(1);
    });
  });

  describe('count', () => {
    it('returns the total without fetching a page of hits or resolving action metadata', async () => {
      const storage = createStorage(baseDocument());
      storage.search.mockResolvedValue({
        hits: { hits: [], total: { value: 7 } },
      });
      const { service, workflowsApi } = createService(storage);

      const total = await service.count(listQuery({ status: 'pending' }), SPACE_ID);

      expect(total).toBe(7);
      const [[searchArgs]] = storage.search.mock.calls;
      expect(searchArgs.size).toBe(0);
      expect(searchArgs.query.bool.filter).toEqual(
        expect.arrayContaining([{ term: { spaceId: SPACE_ID } }, { term: { status: 'pending' } }])
      );
      expect(workflowsApi.getWorkflow).not.toHaveBeenCalled();
    });

    it('applies the same filter vocabulary as list', async () => {
      const storage = createStorage();
      storage.search.mockResolvedValue({ hits: { hits: [], total: { value: 0 } } });
      const { service } = createService(storage);

      await service.count(listQuery({ origin: 'alertzero', excludeSuperseded: true }), SPACE_ID);

      const [[searchArgs]] = storage.search.mock.calls;
      expect(searchArgs.query.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { origin: 'alertzero' } },
          { bool: { must_not: { exists: { field: 'supersededBy' } } } },
        ])
      );
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

    const scalar = (field: string, count: number) => ({
      columns: [{ name: field }],
      values: [[count]],
    });

    /** The four queries resolve in the order the service issues them. */
    const mockEsql = (
      storage: ReturnType<typeof createStorage>,
      {
        anchor,
        opens,
        closes,
        currentOpen,
      }: {
        anchor?: object;
        opens?: object;
        closes?: object;
        currentOpen?: object;
      }
    ) => {
      storage.esql
        .mockResolvedValueOnce(anchor ?? emptyEsql())
        .mockResolvedValueOnce(opens ?? emptyEsql())
        .mockResolvedValueOnce(closes ?? emptyEsql())
        .mockResolvedValueOnce(currentOpen ?? emptyEsql());
    };

    const issuedQueries = (storage: ReturnType<typeof createStorage>): string[] =>
      storage.esql.mock.calls.map(([args]) => args.pipeline.toRequest().query as string);

    /** Excludes the `currentOpen` scalar, which has neither a COALESCE(category) nor a LIMIT. */
    const bucketQueries = (storage: ReturnType<typeof createStorage>): string[] =>
      issuedQueries(storage).slice(0, 3);

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

      // Bucket 3 holds the close and still counts it; the decrement lands in bucket 4.
      expect(buckets.map((b) => b.counts.contain)).toEqual([2, 5, 5, 5, 4]);
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

    // An expiry reaches the running sum through `closes`, keyed on COALESCE(decidedAt,
    // expiresAt), so it needs no stream of its own.
    it('should keep a proposal counted in the bucket it closed in, and drop it after', async () => {
      const storage = createStorage();
      mockEsql(storage, {
        anchor: byCategory('anchor', [['contain', 1]]),
        closes: byIdxAndCategory('closes', [[2, 'contain', 1]]),
      });
      const { service } = createService(storage);

      const { buckets } = await service.chartsSummary(chartsQuery, SPACE_ID);

      expect(buckets.map((b) => b.counts.contain)).toEqual([1, 1, 1, 0, 0]);
    });

    // Netted +1 −1 = 0 under the old end-of-bucket snapshot, so it never appeared.
    it('should count a proposal that opened and closed within the same bucket', async () => {
      const storage = createStorage();
      mockEsql(storage, {
        opens: byIdxAndCategory('opens', [[2, 'contain', 1]]),
        closes: byIdxAndCategory('closes', [[2, 'contain', 1]]),
      });
      const { service } = createService(storage);

      const { buckets } = await service.chartsSummary(chartsQuery, SPACE_ID);

      // Normalised: a category carries no key until its first event.
      expect(buckets.map((b) => b.counts.contain ?? 0)).toEqual([0, 0, 1, 0, 0]);
    });

    it('should report currentOpen from the scalar query', async () => {
      const storage = createStorage();
      mockEsql(storage, { currentOpen: scalar('currentOpen', 7) });
      const { service } = createService(storage);

      const { currentOpen } = await service.chartsSummary(chartsQuery, SPACE_ID);

      expect(currentOpen).toBe(7);
    });

    it('should report currentOpen as zero when the scalar query comes back empty', async () => {
      const storage = createStorage();
      const { service } = createService(storage);

      const { currentOpen } = await service.chartsSummary(chartsQuery, SPACE_ID);

      expect(currentOpen).toBe(0);
    });

    // The header count sits directly above queues that filter on `origin`, so
    // an unscoped chart would contradict the rows beneath it the moment another
    // solution writes into the same space.
    it('should scope every query to the origin when one is given', async () => {
      const storage = createStorage();
      const { service } = createService(storage);

      await service.chartsSummary({ ...chartsQuery, origin: 'alertzero' }, SPACE_ID);

      const queries = issuedQueries(storage);
      expect(queries).toHaveLength(4);
      for (const query of queries) {
        expect(query).toContain('origin == "alertzero"');
      }
    });

    it('should count every producer when no origin is given', async () => {
      const storage = createStorage();
      const { service } = createService(storage);

      await service.chartsSummary(chartsQuery, SPACE_ID);

      for (const query of issuedQueries(storage)) {
        expect(query).not.toContain('origin ==');
      }
    });

    it('should count only pending, non-superseded proposals as currently open', async () => {
      const storage = createStorage();
      const { service } = createService(storage);

      await service.chartsSummary(chartsQuery, SPACE_ID);

      const currentOpenQuery = issuedQueries(storage)[3];
      expect(currentOpenQuery).toContain('status == "pending"');
      expect(currentOpenQuery).toContain('supersededBy IS NULL');
    });

    /**
     * Openness is read from `status`, never from comparing a deadline to the clock.
     * A request-time predicate would erase an expired proposal from the buckets in
     * which it was genuinely open, so a past bucket would answer differently on
     * every refetch.
     */
    it('should not compare a deadline against the clock in any query', async () => {
      const storage = createStorage();
      const { service } = createService(storage);

      await service.chartsSummary(chartsQuery, SPACE_ID);

      for (const query of issuedQueries(storage)) {
        expect(query).not.toMatch(/NOW\(\)/i);
      }
    });

    /**
     * The regression this guards: a superseded proposal has no `decidedAt` —
     * being revised is not a decision — and inherits its predecessor's
     * `expiresAt`, so without this term the anchor, opens and closes queries
     * all count it as still open alongside the revision that replaced it.
     */
    it('should exclude superseded proposals from every query', async () => {
      const storage = createStorage();
      const { service } = createService(storage);

      await service.chartsSummary(chartsQuery, SPACE_ID);

      const queries = issuedQueries(storage);
      expect(queries).toHaveLength(4);
      for (const query of queries) {
        expect(query).toMatch(/supersededBy\s+IS\s+NULL/i);
      }
    });

    /**
     * The whole reason `expiries` is no longer a stream of its own: a decision and a
     * deadline are the same event, so one column expresses both close moments.
     */
    it('should close on decidedAt, falling back to expiresAt', async () => {
      const storage = createStorage();
      const { service } = createService(storage);

      await service.chartsSummary(chartsQuery, SPACE_ID);

      const closes = issuedQueries(storage)[2];
      expect(closes).toContain('COALESCE(decidedAt, expiresAt)');
      expect(closes).toContain('status != "pending"');
    });

    it('should give action-less proposals a category so they are counted', async () => {
      const storage = createStorage();
      mockEsql(storage, { anchor: byCategory('anchor', [['uncategorized', 4]]) });
      const { service } = createService(storage);

      const { buckets } = await service.chartsSummary(chartsQuery, SPACE_ID);

      for (const query of bucketQueries(storage)) {
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
      for (const query of bucketQueries(storage)) {
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
