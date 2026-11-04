/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, of, Subject, throwError, toArray } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';
import {
  InferenceConnectorType,
  InferenceTaskErrorCode,
  type InferenceConnector,
} from '@kbn/inference-common';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { ChatEvent } from '@kbn/agent-builder-common';
import {
  AgentBuilderErrorCode,
  AgentExecutionMode,
  CONVERSATION_SCHEMA_VERSION,
  ChatEventType,
  ChatTriggerMode,
  ConversationOriginType,
  ConversationParentRelation,
  ConversationRoundStatus,
  EventActorType,
  ExecutionStatus,
  TimelineEventType,
  createConversationBusyError,
  createConversationWriteConflictError,
  createRequestAbortedError,
  isBadRequestError,
  isConversationBusyError,
  isConversationWriteConflictError,
} from '@kbn/agent-builder-common';
import { AGENT_BUILDER_INFERENCE_FEATURE_ID } from '@kbn/agent-builder-common/constants';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import type { AgentExecutionClient } from './persistence';
import type { AttachmentServiceStart } from '../attachments';
import {
  createAgentsServiceStartMock,
  createConversationClientMock,
  createEmptyConversation,
  createMockedAgentRegistry,
  createMockedInternalAgent,
  createRound,
} from '../../test_utils';
import { findConversationEvent } from './utils/chat_response';

// Mock persistence module
const mockExecutionClient: jest.Mocked<AgentExecutionClient> = {
  create: jest.fn(),
  get: jest.fn(),
  updateStatus: jest.fn(),
  appendEvents: jest.fn(),
  updateHeartbeat: jest.fn(),
  peek: jest.fn(),
  delete: jest.fn(),
  readEvents: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
};

jest.mock('./persistence', () => ({
  createAgentExecutionClient: () => mockExecutionClient,
}));

const conflictError = () =>
  Object.assign(new Error('version conflict'), {
    statusCode: 409,
  });

// Mock execution_runner module
const mockHandleAgentExecution = jest.fn();
const mockCollectAndWriteEvents = jest.fn();

jest.mock('./execution_runner', () => ({
  handleAgentExecution: (...args: any[]) => mockHandleAgentExecution(...args),
  collectAndWriteEvents: (...args: any[]) => mockCollectAndWriteEvents(...args),
}));

// Mock abort monitor
jest.mock('./task/abort_monitor', () => ({
  AbortMonitor: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    getSignal: jest.fn().mockReturnValue(new AbortController().signal),
  })),
}));

// Mock heartbeat reporter
jest.mock('./task/heartbeat_reporter', () => ({
  HeartbeatReporter: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));

const mockTaskManagerSchedule = jest.fn();
const mockTaskManagerRunSoon = jest.fn();

import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { createAgentExecutionService } from './execution_service';
import { CallbackDeliveryService } from './callback';
import { ABORT_WAIT_FOR_TERMINAL_TIMEOUT_MS } from './constants';

describe('AgentExecutionService', () => {
  const logger = loggerMock.create();
  const elasticsearch = elasticsearchServiceMock.createStart();
  const taskManager = {
    schedule: mockTaskManagerSchedule,
    runSoon: mockTaskManagerRunSoon,
  } as any;

  const uiSettings = {
    asScopedToClient: jest.fn(),
  } as any;

  const savedObjects = {
    getScopedClient: jest.fn(),
  } as any;

  const meteringService = {
    reportExecution: jest.fn(),
  } as any;

  const attachmentsService: AttachmentServiceStart = {
    validateAttachmentInputs: jest.fn().mockImplementation(async (attachments) =>
      attachments?.map((attachment: { type: string; data: unknown }) => ({
        id: 'attachment-1',
        type: attachment.type,
        data: attachment.data,
      }))
    ),
    getTypeDefinition: jest.fn(),
    getRegisteredTypeIds: jest.fn().mockReturnValue([]),
    createStateManager: jest.fn(),
    mergeAttachmentInputs: jest.fn(),
  };

  const conversationClient = createConversationClientMock();
  const conversationService = {
    getScopedClient: jest.fn().mockImplementation(async () => conversationClient),
    getScopedClientAsUser: jest.fn().mockImplementation(async () => conversationClient),
  };

  const inference = inferenceMock.createStartContract();
  const getForFeature: jest.MockedFn<
    SearchInferenceEndpointsPluginStart['endpoints']['getForFeature']
  > = jest.fn();
  const searchInferenceEndpoints: SearchInferenceEndpointsPluginStart = {
    features: {
      register: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      updateRecommendedEndpoints: jest.fn(),
    },
    endpoints: { getForFeature },
  };

  const agentRegistry = createMockedAgentRegistry();
  const agentService = createAgentsServiceStartMock();
  const callbackDeliveryService = new CallbackDeliveryService({
    actions: actionsMock.createSetup(),
    logger,
  });
  const resolveConversation = jest.spyOn(callbackDeliveryService, 'resolveConversation');

  const service = createAgentExecutionService({
    logger,
    elasticsearch,
    security: {} as any,
    taskManager,
    inference,
    conversationService: conversationService as any,
    agentService,
    runAgent: jest.fn(),
    attachmentsService,
    uiSettings,
    savedObjects,
    meteringService,
    searchInferenceEndpoints,
    callbackDeliveryService,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resolveConversation.mockResolvedValue(undefined);
    getForFeature.mockResolvedValue({ endpoints: [], warnings: [], soEntryFound: false });
    agentService.getRegistry.mockResolvedValue(agentRegistry);
    agentRegistry.get.mockResolvedValue(createMockedInternalAgent({ id: 'agent-1' }));
    (attachmentsService.validateAttachmentInputs as jest.Mock).mockImplementation(
      async (attachments) =>
        attachments?.map((attachment: { type: string; data: unknown }) => ({
          id: 'attachment-1',
          type: attachment.type,
          data: attachment.data,
        }))
    );
    mockExecutionClient.create.mockResolvedValue({
      executionId: 'test-id',
      '@timestamp': new Date().toISOString(),
      status: ExecutionStatus.scheduled,
      agentId: 'agent-1',
      executionMode: AgentExecutionMode.conversation,
      spaceId: 'default',
      agentParams: {
        nextInput: { message: 'hello' },
        conversationId: 'conv-1',
        roundId: 'round-1',
        conversationOperation: 'UPDATE',
        receivedAt: '2024-01-01T00:00:00.000Z',
      },
      eventCount: 0,
      events: [],
    });
  });

  describe('executeAgent with an agent bound to a service account', () => {
    const boundAgent = createMockedInternalAgent({ id: 'agent-1', service_account_id: 'sa-1' });
    const checkPrivileges = jest.fn();
    const securityPlugin = {
      authz: {
        checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(checkPrivileges),
        actions: { api: { get: (privilege: string) => `api:${privilege}` } },
      },
    } as any;
    const createBoundService = ({
      serviceAccountsEnabled = true,
      principalServiceAccountId,
    }: { serviceAccountsEnabled?: boolean; principalServiceAccountId?: string } = {}) =>
      createAgentExecutionService({
        logger,
        elasticsearch,
        security: {
          serviceAccounts: { isEnabled: () => serviceAccountsEnabled },
          authc: {
            getPrincipal: () =>
              principalServiceAccountId
                ? { type: 'service_account', serviceAccountId: principalServiceAccountId }
                : undefined,
          },
        } as any,
        taskManager,
        securityPlugin,
        inference,
        conversationService: conversationService as any,
        agentService,
        runAgent: jest.fn(),
        attachmentsService,
        uiSettings,
        savedObjects,
        meteringService,
        searchInferenceEndpoints,
        callbackDeliveryService,
      });
    const converse = (
      boundService: ReturnType<typeof createBoundService>,
      useTaskManager?: boolean,
      request = httpServerMock.createKibanaRequest()
    ) =>
      boundService.executeAgent({
        mode: AgentExecutionMode.conversation,
        request,
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
        useTaskManager,
      });

    beforeEach(() => {
      agentRegistry.get.mockResolvedValue(boundAgent);
      checkPrivileges.mockResolvedValue({ hasAllRequested: true });
      mockExecutionClient.create.mockImplementation(async (params) => ({
        '@timestamp': new Date().toISOString(),
        status: ExecutionStatus.scheduled,
        eventCount: 0,
        events: [],
        ...params,
        agentParams: {
          ...params.agentParams,
          conversationId: 'conv-1',
          roundId: 'round-1',
          conversationOperation: 'UPDATE',
          receivedAt: '2024-01-01T00:00:00.000Z',
        },
      }));
    });

    it('checks the caller can use the agent before anything else', async () => {
      await converse(createBoundService(), true);

      expect(agentRegistry.get).toHaveBeenCalledWith('agent-1', { access: 'use' });
      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: ['api:agentBuilder:invokeBoundAgents'],
      });
    });

    it('refuses a caller without the invoke privilege before creating anything', async () => {
      checkPrivileges.mockResolvedValue({ hasAllRequested: false });

      await expect(converse(createBoundService(), true)).rejects.toMatchObject({
        meta: { statusCode: 403 },
        message: expect.stringContaining('service account "sa-1"'),
      });

      expect(mockExecutionClient.create).not.toHaveBeenCalled();
      expect(mockTaskManagerSchedule).not.toHaveBeenCalled();
    });

    it('checks the privilege for the agent the conversation resolves to, not the requested one', async () => {
      resolveConversation.mockResolvedValueOnce({
        conversationId: 'investigation-1',
        agentId: 'agent-1',
      });
      conversationClient.get.mockResolvedValueOnce(
        createEmptyConversation({
          id: 'investigation-1',
          agent_id: 'agent-1',
          schema_version: CONVERSATION_SCHEMA_VERSION,
        })
      );
      agentRegistry.get.mockImplementation(async (agentId: string) =>
        agentId === 'agent-1' ? boundAgent : createMockedInternalAgent({ id: agentId })
      );
      checkPrivileges.mockResolvedValue({ hasAllRequested: false });

      await expect(
        createBoundService().executeAgent({
          mode: AgentExecutionMode.conversation,
          request: httpServerMock.createKibanaRequest(),
          params: {
            agentId: 'unbound-agent',
            origin: { type: ConversationOriginType.Slack, external_conversation_id: 'thread-1' },
            nextInput: { message: 'hello' },
          },
          useTaskManager: true,
        })
      ).rejects.toMatchObject({ meta: { statusCode: 403 } });

      expect(agentRegistry.get).toHaveBeenCalledWith('agent-1', { access: 'use' });
      expect(conversationClient.create).not.toHaveBeenCalled();
      expect(conversationClient.appendEvents).not.toHaveBeenCalled();
      expect(mockExecutionClient.create).not.toHaveBeenCalled();
    });

    it('refuses to run a bound agent while service accounts are disabled', async () => {
      await expect(
        converse(createBoundService({ serviceAccountsEnabled: false }), true)
      ).rejects.toMatchObject({
        meta: { statusCode: 403 },
        message: expect.stringContaining('disabled'),
      });

      expect(mockExecutionClient.create).not.toHaveBeenCalled();
    });

    it('records the service account on the execution and schedules the task with runAs', async () => {
      const result = await converse(createBoundService(), true);

      expect(mockExecutionClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: { id: 'user-1', username: 'alice' },
          runAs: { type: 'service_account', serviceAccountId: 'sa-1' },
        })
      );
      expect(mockTaskManagerSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { executionId: result.executionId },
          runAs: {
            workloadType: 'agent',
            workloadId: 'agent-1',
            spaceId: 'default',
            expectedServiceAccountId: 'sa-1',
          },
        }),
        undefined
      );
    });

    it('runs through Task Manager even when local execution was requested', async () => {
      await converse(createBoundService(), false);

      expect(mockTaskManagerSchedule).toHaveBeenCalledWith(
        expect.objectContaining({ runAs: expect.objectContaining({ workloadId: 'agent-1' }) }),
        undefined
      );
    });

    it('refuses runtime configuration overrides on a bound agent before creating anything', async () => {
      await expect(
        createBoundService().executeAgent({
          mode: AgentExecutionMode.conversation,
          request: httpServerMock.createKibanaRequest(),
          params: {
            agentId: 'agent-1',
            nextInput: { message: 'hello' },
            configurationOverrides: { tools: [{ tool_ids: ['*'] }] },
          },
          useTaskManager: true,
        })
      ).rejects.toMatchObject({
        meta: { statusCode: 403 },
        message: expect.stringContaining('configuration overrides'),
      });

      expect(mockExecutionClient.create).not.toHaveBeenCalled();
      expect(mockTaskManagerSchedule).not.toHaveBeenCalled();
    });

    it('accepts runtime configuration overrides from a request already running as the account', async () => {
      await createBoundService({ principalServiceAccountId: 'sa-1' }).executeAgent({
        mode: AgentExecutionMode.conversation,
        request: httpServerMock.createKibanaRequest(),
        params: {
          agentId: 'agent-1',
          nextInput: { message: 'hello' },
          configurationOverrides: { instructions: 'be brief' },
        },
        useTaskManager: true,
      });

      expect(mockExecutionClient.create).toHaveBeenCalledWith(
        expect.objectContaining({ runAs: { type: 'service_account', serviceAccountId: 'sa-1' } })
      );
    });

    describe('when the request already runs as the bound service account', () => {
      const sameAccount = () => createBoundService({ principalServiceAccountId: 'sa-1' });

      it('runs inline instead of nesting a Task Manager task when local execution was requested', async () => {
        mockHandleAgentExecution.mockResolvedValue(of());
        mockCollectAndWriteEvents.mockResolvedValue(undefined);
        const request = httpServerMock.createKibanaRequest();

        const result = await converse(sameAccount(), false, request);

        expect(mockTaskManagerSchedule).not.toHaveBeenCalled();
        expect(mockExecutionClient.create).toHaveBeenCalledWith(
          expect.objectContaining({
            runAs: { type: 'service_account', serviceAccountId: 'sa-1' },
          })
        );
        expect(mockHandleAgentExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            request,
            execution: expect.objectContaining({ executionId: result.executionId }),
          })
        );
      });

      it('runs inline for a fake request, as an unbound agent would', async () => {
        mockHandleAgentExecution.mockResolvedValue(of());
        mockCollectAndWriteEvents.mockResolvedValue(undefined);
        const fakeRequest = Object.assign(httpServerMock.createKibanaRequest(), {
          isFakeRequest: true,
        });

        await converse(sameAccount(), undefined, fakeRequest);

        expect(mockTaskManagerSchedule).not.toHaveBeenCalled();
        expect(mockHandleAgentExecution).toHaveBeenCalled();
      });

      it('still schedules with runAs and without the request when Task Manager is used', async () => {
        await converse(sameAccount(), true);

        expect(mockTaskManagerSchedule).toHaveBeenCalledWith(
          expect.objectContaining({ runAs: expect.objectContaining({ workloadId: 'agent-1' }) }),
          undefined
        );
      });

      it('still forces Task Manager for a request of another service account', async () => {
        await converse(createBoundService({ principalServiceAccountId: 'sa-other' }), false);

        expect(mockTaskManagerSchedule).toHaveBeenCalledWith(
          expect.objectContaining({ runAs: expect.objectContaining({ workloadId: 'agent-1' }) }),
          undefined
        );
        expect(mockHandleAgentExecution).not.toHaveBeenCalled();
      });
    });

    it('leaves an unbound agent on the caller credentials', async () => {
      agentRegistry.get.mockResolvedValue(createMockedInternalAgent({ id: 'agent-1' }));
      const request = httpServerMock.createKibanaRequest();

      await createBoundService().executeAgent({
        mode: AgentExecutionMode.conversation,
        request,
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
        useTaskManager: true,
      });

      expect(checkPrivileges).not.toHaveBeenCalled();
      expect(mockExecutionClient.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ runAs: expect.anything() })
      );
      expect(mockTaskManagerSchedule).toHaveBeenCalledWith(expect.anything(), {
        request,
        cloneApiKey: true,
      });
    });
  });

  describe('executeAgent (TM mode)', () => {
    it('should create an execution document and schedule a task', async () => {
      const request = httpServerMock.createKibanaRequest();

      const result = await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request,
        params: {
          agentId: 'agent-1',
          nextInput: { message: 'hello' },
        },
        useTaskManager: true,
      });

      expect(result.executionId).toBeDefined();
      expect(result.events$).toBeDefined();

      expect(mockExecutionClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'agent-1',
          spaceId: 'default',
          owner: { id: 'user-1', username: 'alice' },
          agentParams: expect.objectContaining({
            agentId: 'agent-1',
            nextInput: { message: 'hello' },
          }),
        })
      );

      expect(mockTaskManagerSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          taskType: 'agent-builder:run-agent',
          params: { executionId: result.executionId },
          scope: ['agent-builder'],
        }),
        { request, cloneApiKey: true }
      );
      expect(mockTaskManagerRunSoon).not.toHaveBeenCalled();
    });

    it('requests an immediate claim of the scheduled task when asked to', async () => {
      mockTaskManagerRunSoon.mockResolvedValue({ id: 'task-id' });

      const result = await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request: httpServerMock.createKibanaRequest(),
        params: {
          agentId: 'agent-1',
          nextInput: { message: 'hello' },
        },
        useTaskManager: true,
        requestImmediateClaim: true,
      });

      expect(mockTaskManagerRunSoon).toHaveBeenCalledWith(`agent-${result.executionId}`, {
        requestImmediateClaim: true,
      });
      expect(mockTaskManagerRunSoon.mock.invocationCallOrder[0]).toBeGreaterThan(
        mockTaskManagerSchedule.mock.invocationCallOrder[0]
      );
    });

    it('does not fail the execution when the immediate claim request fails', async () => {
      mockTaskManagerRunSoon.mockRejectedValue(new Error('task is already running'));

      const result = await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request: httpServerMock.createKibanaRequest(),
        params: {
          agentId: 'agent-1',
          nextInput: { message: 'hello' },
        },
        useTaskManager: true,
        requestImmediateClaim: true,
      });
      await new Promise(process.nextTick);

      expect(result.executionId).toBeDefined();
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Could not request an immediate claim')
      );
    });
  });

  describe('owner attribution', () => {
    it('pins a service account owner with its principal type on the execution', async () => {
      conversationClient.getUser.mockReturnValueOnce({
        id: 'service_account:kibana/automation',
        username: 'kibana/automation',
        type: 'service_account',
        isAdmin: true,
      });
      const request = httpServerMock.createKibanaRequest();

      await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request,
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
        useTaskManager: true,
      });

      expect(mockExecutionClient.create.mock.calls[0][0].owner).toEqual({
        id: 'service_account:kibana/automation',
        username: 'kibana/automation',
        type: 'service_account',
      });
    });
  });

  describe('executeAgent with a caller-provided executionId', () => {
    it('throws when an execution with the same id already exists, regardless of its status', async () => {
      mockExecutionClient.create.mockRejectedValueOnce(conflictError());
      const request = httpServerMock.createKibanaRequest();

      await expect(
        service.executeAgent({
          mode: AgentExecutionMode.conversation,
          request,
          executionId: 'exec-1',
          params: {
            agentId: 'agent-1',
            nextInput: { message: 'hello' },
          },
          useTaskManager: true,
        })
      ).rejects.toThrow('Execution with id exec-1 already exists');
      expect(mockTaskManagerSchedule).not.toHaveBeenCalled();
    });
  });

  describe('executeAgent (local mode)', () => {
    it('should create an execution document and execute locally', async () => {
      const request = httpServerMock.createKibanaRequest();
      const fakeEvent: ChatEvent = {
        type: 'message_chunk',
        data: { message_id: 'm1', text_chunk: 'hello' },
      } as any;

      mockHandleAgentExecution.mockResolvedValue(of(fakeEvent));
      mockCollectAndWriteEvents.mockResolvedValue(undefined);

      const result = await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request,
        params: {
          agentId: 'agent-1',
          nextInput: { message: 'hello' },
        },
        useTaskManager: false,
      });

      expect(result.executionId).toBeDefined();
      expect(result.events$).toBeDefined();

      // Should have created the execution doc
      expect(mockExecutionClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'agent-1',
        })
      );

      // Should NOT have scheduled a TM task
      expect(mockTaskManagerSchedule).not.toHaveBeenCalled();

      // Should have updated status to running
      expect(mockExecutionClient.updateStatus).toHaveBeenCalledWith(
        result.executionId,
        ExecutionStatus.running
      );

      // Should have called handleAgentExecution
      expect(mockHandleAgentExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          request,
          execution: expect.objectContaining({
            executionId: result.executionId,
            agentId: 'agent-1',
          }),
        })
      );
    });

    it("stores the workflow execution id with the execution's params, for round telemetry", async () => {
      const request = httpServerMock.createKibanaRequest();
      mockHandleAgentExecution.mockResolvedValue(of());
      mockCollectAndWriteEvents.mockResolvedValue(undefined);

      await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request,
        params: {
          agentId: 'agent-1',
          nextInput: { message: 'hello' },
          workflowExecutionId: 'workflow-run-1',
        },
        useTaskManager: false,
      });

      expect(mockExecutionClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agentParams: expect.objectContaining({ workflowExecutionId: 'workflow-run-1' }),
        })
      );
    });

    it('validates attachments and throws on invalid attachment', async () => {
      (attachmentsService.validateAttachmentInputs as jest.Mock).mockRejectedValue(
        new Error('Attachment validation failed: boom')
      );

      const request = httpServerMock.createKibanaRequest();

      await expect(
        service.executeAgent({
          mode: AgentExecutionMode.conversation,
          request,
          params: {
            agentId: 'agent-1',
            nextInput: {
              message: 'hello',
              attachments: [{ type: 'some_type', data: { foo: 'bar' } }],
            },
          },
        })
      ).rejects.toThrow('Attachment validation failed: boom');

      expect(attachmentsService.validateAttachmentInputs).toHaveBeenCalledWith(
        [{ type: 'some_type', data: { foo: 'bar' } }],
        request
      );
      expect(mockExecutionClient.create).not.toHaveBeenCalled();
    });

    it('should return a live observable that emits events from the agent stream', async () => {
      const request = httpServerMock.createKibanaRequest();
      const eventsSubject = new Subject<ChatEvent>();
      const fakeEvent: ChatEvent = {
        type: 'message_chunk',
        data: { message_id: 'm1', text_chunk: 'hello' },
      } as any;

      mockHandleAgentExecution.mockResolvedValue(eventsSubject.asObservable());
      mockCollectAndWriteEvents.mockImplementation(({ events$ }: { events$: any }) => {
        return new Promise<void>((resolve) => {
          events$.subscribe({ complete: () => resolve() });
        });
      });

      const { events$, conversationId } = await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request,
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
        useTaskManager: false,
      });

      const receivedEvents: ChatEvent[] = [];
      events$.subscribe({ next: (e) => receivedEvents.push(e) });

      eventsSubject.next(fakeEvent);
      eventsSubject.complete();

      // Allow microtasks to settle
      await new Promise((resolve) => setTimeout(resolve, 10));

      // The request created the conversation, so its id is reported before the run's own events.
      expect(receivedEvents).toEqual([
        { type: ChatEventType.conversationIdSet, data: { conversation_id: conversationId } },
        fakeEvent,
      ]);
    });

    it('does not report a conversation id for a run that continues an existing conversation', async () => {
      const request = httpServerMock.createKibanaRequest();
      const eventsSubject = new Subject<ChatEvent>();

      const existing = createEmptyConversation({ id: 'conversation-1', agent_id: 'agent-1' });
      conversationClient.exists.mockResolvedValue(true);
      conversationClient.get.mockResolvedValue(existing);
      mockHandleAgentExecution.mockResolvedValue(eventsSubject.asObservable());

      const { events$, conversationId } = await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request,
        params: {
          agentId: 'agent-1',
          conversationId: existing.id,
          nextInput: { message: 'hello' },
        },
        useTaskManager: false,
      });

      const receivedEvents: ChatEvent[] = [];
      events$.subscribe({ next: (event) => receivedEvents.push(event) });

      eventsSubject.complete();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(receivedEvents).toEqual([]);
      // Reported on the result whether or not the event was emitted, so a caller that never
      // reads the stream still learns the conversation.
      expect(conversationId).toBe(existing.id);
    });
  });

  describe('executeAgent (local mode) — execution status alignment', () => {
    const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

    it('records aborted (not failed) when the live stream errors with RequestAbortedError', async () => {
      const request = httpServerMock.createKibanaRequest();
      const aborted = createRequestAbortedError('Converse request was aborted');
      mockHandleAgentExecution.mockResolvedValue(throwError(() => aborted));
      mockCollectAndWriteEvents.mockRejectedValue(aborted);

      const { executionId } = await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request,
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
        useTaskManager: false,
      });
      await settle();

      expect(mockExecutionClient.updateStatus).toHaveBeenLastCalledWith(
        executionId,
        ExecutionStatus.aborted,
        { error: expect.objectContaining({ code: AgentBuilderErrorCode.requestAborted }) }
      );
    });

    it('records failed when the live stream errors with any other error', async () => {
      const request = httpServerMock.createKibanaRequest();
      const failure = new Error('llm exploded');
      mockHandleAgentExecution.mockResolvedValue(throwError(() => failure));
      mockCollectAndWriteEvents.mockRejectedValue(failure);

      const { executionId } = await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request,
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
        useTaskManager: false,
      });
      await settle();

      expect(mockExecutionClient.updateStatus).toHaveBeenLastCalledWith(
        executionId,
        ExecutionStatus.failed,
        { error: expect.objectContaining({ message: 'llm exploded' }) }
      );
    });

    it('records failed with the error when the setup rejects before the stream exists, then rethrows', async () => {
      const request = httpServerMock.createKibanaRequest();
      mockHandleAgentExecution.mockRejectedValue(new Error('registry down'));

      await expect(
        service.executeAgent({
          mode: AgentExecutionMode.conversation,
          request,
          params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
          useTaskManager: false,
        })
      ).rejects.toThrow('registry down');

      const statuses = mockExecutionClient.updateStatus.mock.calls.map(([, status]) => status);
      expect(statuses).toEqual([ExecutionStatus.running, ExecutionStatus.failed]);
      expect(mockExecutionClient.updateStatus).toHaveBeenLastCalledWith(
        expect.any(String),
        ExecutionStatus.failed,
        { error: expect.objectContaining({ message: 'registry down' }) }
      );
    });

    it('records aborted when the setup rejects with RequestAbortedError', async () => {
      const request = httpServerMock.createKibanaRequest();
      mockHandleAgentExecution.mockRejectedValue(createRequestAbortedError('stop'));

      await expect(
        service.executeAgent({
          mode: AgentExecutionMode.conversation,
          request,
          params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
          useTaskManager: false,
        })
      ).rejects.toThrow();

      expect(mockExecutionClient.updateStatus).toHaveBeenLastCalledWith(
        expect.any(String),
        ExecutionStatus.aborted,
        { error: expect.objectContaining({ code: AgentBuilderErrorCode.requestAborted }) }
      );
    });
  });

  describe('executeAgent (auto-detection)', () => {
    it('should run locally when request.isFakeRequest is true', async () => {
      const request = httpServerMock.createKibanaRequest();
      // Simulate a fakeRequest (running on TM already)
      Object.defineProperty(request, 'isFakeRequest', { value: true });

      mockHandleAgentExecution.mockResolvedValue(of());
      mockCollectAndWriteEvents.mockResolvedValue(undefined);

      const result = await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request,
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
        // useTaskManager NOT provided -> auto-detect
      });

      expect(result.executionId).toBeDefined();
      // Should NOT schedule a TM task
      expect(mockTaskManagerSchedule).not.toHaveBeenCalled();
      // Should have updated status to running (local path)
      expect(mockExecutionClient.updateStatus).toHaveBeenCalledWith(
        result.executionId,
        ExecutionStatus.running
      );
    });

    it('should run on TM by default for a regular request', async () => {
      const request = httpServerMock.createKibanaRequest();

      const result = await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request,
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
        // useTaskManager NOT provided -> auto-detect
      });

      expect(result.executionId).toBeDefined();
      // Should have scheduled a TM task
      expect(mockTaskManagerSchedule).toHaveBeenCalled();
      // Should NOT have called handleAgentExecution (remote path)
      expect(mockHandleAgentExecution).not.toHaveBeenCalled();
    });

    it('should honour explicit useTaskManager=true even when isFakeRequest is true', async () => {
      const request = httpServerMock.createKibanaRequest();
      Object.defineProperty(request, 'isFakeRequest', { value: true });

      const result = await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request,
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
        useTaskManager: true,
      });

      expect(result.executionId).toBeDefined();
      // Should have scheduled a TM task despite fakeRequest
      expect(mockTaskManagerSchedule).toHaveBeenCalled();
    });

    it('should honour explicit useTaskManager=false for a regular request', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockHandleAgentExecution.mockResolvedValue(of());
      mockCollectAndWriteEvents.mockResolvedValue(undefined);

      const result = await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request,
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
        useTaskManager: false,
      });

      expect(result.executionId).toBeDefined();
      // Should NOT schedule a TM task
      expect(mockTaskManagerSchedule).not.toHaveBeenCalled();
      // Should have run locally
      expect(mockHandleAgentExecution).toHaveBeenCalled();
    });
  });

  describe('abortExecution', () => {
    afterEach(() => {
      // the wait-for-terminal tests install persistent peek/readEvents answers
      mockExecutionClient.peek.mockReset();
      mockExecutionClient.readEvents.mockReset();
    });

    it('should update status to aborted for running execution', async () => {
      mockExecutionClient.get.mockResolvedValue({
        executionId: 'exec-1',
        '@timestamp': new Date().toISOString(),
        status: ExecutionStatus.running,
        agentId: 'agent-1',
        executionMode: AgentExecutionMode.conversation,
        spaceId: 'default',
        agentParams: {
          nextInput: { message: 'test' },
          conversationId: 'conv-1',
          roundId: 'round-1',
          conversationOperation: 'UPDATE',
          receivedAt: '2024-01-01T00:00:00.000Z',
        },
        eventCount: 0,
        events: [],
      });

      mockExecutionClient.peek.mockResolvedValue({
        status: ExecutionStatus.aborted,
        eventCount: 1,
      });
      mockExecutionClient.readEvents.mockResolvedValue({
        status: ExecutionStatus.aborted,
        events: [{ type: 'execution_aborted', id: 'r1::execution_aborted' } as never],
      });

      const result = await service.abortExecution('exec-1');

      expect(mockExecutionClient.updateStatus).toHaveBeenCalledWith(
        'exec-1',
        ExecutionStatus.aborted,
        { abortReason: { source: 'api' } }
      );
      expect(result).toEqual({ acknowledged: true, terminalPersisted: true });
    });

    it('waits for the terminal event to land on the execution document, reading only new events', async () => {
      mockExecutionClient.get.mockResolvedValue({
        executionId: 'exec-1',
        status: ExecutionStatus.running,
        eventCount: 3,
      } as never);
      mockExecutionClient.peek
        .mockResolvedValueOnce({ status: ExecutionStatus.aborted, eventCount: 3 })
        .mockResolvedValueOnce({ status: ExecutionStatus.aborted, eventCount: 5 });
      mockExecutionClient.readEvents.mockResolvedValue({
        status: ExecutionStatus.aborted,
        events: [
          { type: 'tool_call' } as never,
          { type: 'execution_aborted', id: 'r1::execution_aborted' } as never,
        ],
      });

      const result = await service.abortExecution('exec-1');

      expect(result.terminalPersisted).toBe(true);
      expect(mockExecutionClient.readEvents).toHaveBeenCalledTimes(1);
      expect(mockExecutionClient.readEvents).toHaveBeenCalledWith('exec-1', 3);
    });

    it('does not wait when asked not to, or when the execution had not started', async () => {
      mockExecutionClient.get.mockResolvedValue({
        executionId: 'exec-1',
        status: ExecutionStatus.running,
        eventCount: 0,
      } as never);
      expect(await service.abortExecution('exec-1', { waitForTerminal: false })).toEqual({
        acknowledged: true,
        terminalPersisted: false,
      });
      expect(mockExecutionClient.peek).not.toHaveBeenCalled();

      mockExecutionClient.get.mockResolvedValue({
        executionId: 'exec-2',
        status: ExecutionStatus.scheduled,
        eventCount: 0,
      } as never);
      expect(await service.abortExecution('exec-2')).toEqual({
        acknowledged: true,
        terminalPersisted: false,
      });
      expect(mockExecutionClient.peek).not.toHaveBeenCalled();
    });

    it('reports terminalPersisted=false when the record never lands within the bound', async () => {
      jest.useFakeTimers();
      try {
        mockExecutionClient.get.mockResolvedValue({
          executionId: 'exec-1',
          status: ExecutionStatus.running,
          eventCount: 0,
        } as never);
        mockExecutionClient.peek.mockResolvedValue({
          status: ExecutionStatus.aborted,
          eventCount: 0,
        });

        const promise = service.abortExecution('exec-1');
        await jest.advanceTimersByTimeAsync(ABORT_WAIT_FOR_TERMINAL_TIMEOUT_MS + 1000);

        expect(await promise).toEqual({ acknowledged: true, terminalPersisted: false });
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('did not record its interruption')
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('should warn and no-op for a non-existent execution', async () => {
      mockExecutionClient.get.mockResolvedValue(undefined);

      await expect(service.abortExecution('exec-1')).resolves.toEqual({
        acknowledged: false,
        terminalPersisted: false,
      });
      expect(mockExecutionClient.updateStatus).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should quietly no-op for a terminal execution', async () => {
      mockExecutionClient.get.mockResolvedValue({
        executionId: 'exec-1',
        '@timestamp': new Date().toISOString(),
        status: ExecutionStatus.completed,
        agentId: 'agent-1',
        executionMode: AgentExecutionMode.conversation,
        spaceId: 'default',
        agentParams: {
          nextInput: { message: 'test' },
          conversationId: 'conv-1',
          roundId: 'round-1',
          conversationOperation: 'UPDATE',
          receivedAt: '2024-01-01T00:00:00.000Z',
        },
        eventCount: 0,
        events: [],
      });

      await expect(service.abortExecution('exec-1')).resolves.toEqual({
        acknowledged: false,
        terminalPersisted: false,
      });
      expect(mockExecutionClient.updateStatus).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('abort reasons', () => {
    it('records the reason given to abortExecution', async () => {
      mockExecutionClient.get.mockResolvedValue({
        executionId: 'exec-1',
        status: ExecutionStatus.running,
      } as never);

      await service.abortExecution('exec-1', {
        reason: {
          source: 'api',
          actor: { type: EventActorType.user, id: 'u1', username: 'alice' },
        },
        waitForTerminal: false,
      });

      expect(mockExecutionClient.updateStatus).toHaveBeenCalledWith(
        'exec-1',
        ExecutionStatus.aborted,
        {
          abortReason: {
            source: 'api',
            actor: { type: EventActorType.user, id: 'u1', username: 'alice' },
          },
        }
      );
    });

    it('records a caller abort when the provided signal fires, cascading the original actor', async () => {
      const request = httpServerMock.createKibanaRequest();
      mockHandleAgentExecution.mockResolvedValue(of());
      mockCollectAndWriteEvents.mockResolvedValue(undefined);
      const abortController = new AbortController();

      await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request,
        params: {
          agentId: 'agent-1',
          nextInput: { message: 'hello' },
          parentExecutionId: 'parent-1',
        },
        useTaskManager: false,
        abortSignal: abortController.signal,
      });
      mockExecutionClient.get.mockResolvedValue({
        executionId: 'test-id',
        status: ExecutionStatus.running,
      } as never);

      abortController.abort({
        source: 'api',
        actor: { type: EventActorType.user, id: 'u1', username: 'alice' },
      });
      await new Promise((resolve) => setTimeout(resolve, 10));

      // the client mock's create() answers with a fixed id, so match the aborted id loosely
      expect(mockExecutionClient.updateStatus).toHaveBeenLastCalledWith(
        expect.any(String),
        ExecutionStatus.aborted,
        {
          abortReason: {
            source: 'caller',
            parent_execution_id: 'parent-1',
            actor: { type: EventActorType.user, id: 'u1', username: 'alice' },
          },
        }
      );
    });
  });

  describe('followExecution', () => {
    // Detailed behavior is tested in execution_follower.test.ts.
    // This smoke test verifies that service.followExecution delegates correctly.
    it('should delegate to followExecution$ and return an observable', (done) => {
      const fakeEvent = { type: 'message_chunk', data: { message_id: 'm1', text_chunk: 'hello' } };

      // peek: failed with 1 event
      mockExecutionClient.peek.mockResolvedValueOnce({
        status: ExecutionStatus.failed,
        eventCount: 1,
      });
      mockExecutionClient.readEvents.mockResolvedValueOnce({
        events: [fakeEvent],
        status: ExecutionStatus.failed,
      } as any);

      const receivedEvents: any[] = [];

      service.followExecution('exec-1').subscribe({
        next: (event) => receivedEvents.push(event),
        error: () => {
          // We expect an error (failed status) — just verify events were emitted before it
          expect(receivedEvents).toHaveLength(1);
          expect(receivedEvents[0]).toEqual(fakeEvent);
          done();
        },
        complete: () => done.fail('Expected an error, not completion'),
      });
    });
  });

  describe('executeAgent with metadata', () => {
    it('should pass metadata to executionClient.create', async () => {
      const request = httpServerMock.createKibanaRequest();
      const metadata = { source: 'test', username: 'user1' };

      mockHandleAgentExecution.mockResolvedValue(of());
      mockCollectAndWriteEvents.mockResolvedValue(undefined);

      await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request,
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
        useTaskManager: false,
        metadata,
      });

      expect(mockExecutionClient.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata })
      );
    });

    it('should pass undefined metadata when not provided (backward compat)', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockHandleAgentExecution.mockResolvedValue(of());
      mockCollectAndWriteEvents.mockResolvedValue(undefined);

      await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request,
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
        useTaskManager: false,
      });

      expect(mockExecutionClient.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: undefined })
      );
    });
  });

  describe('executeAgent with a reasoning level', () => {
    const createEisConnector = (
      supportedEffortLevels: string[],
      connectorId = '.anthropic-claude-haiku-chat_completion'
    ): InferenceConnector => ({
      type: InferenceConnectorType.Inference,
      name: 'Claude Haiku',
      connectorId,
      config: {},
      capabilities: {},
      isInferenceEndpoint: true,
      isPreconfigured: true,
      isEis: true,
      metadata: { capabilities: { reasoning: { supported_effort_levels: supportedEffortLevels } } },
    });

    const executeWithReasoningLevel = ({ connectorId }: { connectorId?: string } = {}) =>
      service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request: httpServerMock.createKibanaRequest(),
        params: {
          agentId: 'agent-1',
          connectorId,
          reasoningLevel: 'xhigh',
          nextInput: { message: 'hello' },
        },
        useTaskManager: true,
      });

    it('validates the requested connector without resolving the feature endpoints', async () => {
      inference.getConnectorById.mockResolvedValueOnce(createEisConnector(['xhigh']));

      await executeWithReasoningLevel({ connectorId: 'connector-1' });

      expect(inference.getConnectorById).toHaveBeenCalledWith('connector-1', expect.anything());
      expect(getForFeature).not.toHaveBeenCalled();
      expect(mockExecutionClient.peek).not.toHaveBeenCalled();
      expect(mockExecutionClient.create).toHaveBeenCalled();
    });

    it("validates the Agent Builder feature's first endpoint when no connector is requested", async () => {
      getForFeature.mockResolvedValueOnce({
        endpoints: [createEisConnector(['xhigh'], 'default-endpoint')],
        warnings: [],
        soEntryFound: false,
      });

      await executeWithReasoningLevel();

      expect(getForFeature).toHaveBeenCalledWith(
        AGENT_BUILDER_INFERENCE_FEATURE_ID,
        expect.anything()
      );
      expect(inference.getConnectorById).not.toHaveBeenCalled();
      expect(mockExecutionClient.create).toHaveBeenCalled();
    });

    it("rejects a level the Agent Builder feature's first endpoint does not support", async () => {
      getForFeature.mockResolvedValueOnce({
        endpoints: [createEisConnector(['high'], 'default-endpoint')],
        warnings: [],
        soEntryFound: false,
      });

      await expect(executeWithReasoningLevel()).rejects.toMatchObject({
        code: InferenceTaskErrorCode.requestError,
      });

      expect(mockExecutionClient.create).not.toHaveBeenCalled();
    });

    it("validates the agent's inference feature model when the agent declares one", async () => {
      agentRegistry.get.mockResolvedValue(
        createMockedInternalAgent({
          id: 'agent-1',
          configuration: { tools: [], inference_feature_id: 'my_feature' },
        })
      );
      getForFeature.mockResolvedValueOnce({
        endpoints: [createEisConnector(['high'], 'feature-endpoint')],
        warnings: [],
        soEntryFound: false,
      });

      await expect(executeWithReasoningLevel()).rejects.toMatchObject({
        code: InferenceTaskErrorCode.requestError,
      });

      expect(getForFeature).toHaveBeenCalledWith('my_feature', expect.anything(), {
        onlyReturnConfigured: true,
      });
      expect(inference.getConnectorById).not.toHaveBeenCalled();
      expect(mockExecutionClient.create).not.toHaveBeenCalled();
    });

    it('persists and schedules nothing when the model does not support the level', async () => {
      inference.getConnectorById.mockResolvedValueOnce(createEisConnector(['high', 'low']));

      await expect(executeWithReasoningLevel({ connectorId: 'connector-1' })).rejects.toMatchObject(
        { code: InferenceTaskErrorCode.requestError, meta: { status: 400 } }
      );

      expect(conversationClient.create).not.toHaveBeenCalled();
      expect(conversationClient.appendEvents).not.toHaveBeenCalled();
      expect(mockExecutionClient.create).not.toHaveBeenCalled();
      expect(mockTaskManagerSchedule).not.toHaveBeenCalled();
    });

    it('validates the model of the agent the origin resolves to', async () => {
      resolveConversation.mockResolvedValueOnce({
        conversationId: 'investigation-1',
        agentId: 'investigation-agent',
      });
      conversationClient.get.mockResolvedValueOnce(
        createEmptyConversation({
          id: 'investigation-1',
          agent_id: 'investigation-agent',
          schema_version: CONVERSATION_SCHEMA_VERSION,
        })
      );
      agentRegistry.get.mockImplementation(async (agentId: string) =>
        createMockedInternalAgent({
          id: agentId,
          configuration: {
            tools: [],
            ...(agentId === 'investigation-agent'
              ? { inference_feature_id: 'investigation_feature' }
              : {}),
          },
        })
      );
      getForFeature.mockResolvedValueOnce({
        endpoints: [createEisConnector(['high'], 'feature-endpoint')],
        warnings: [],
        soEntryFound: false,
      });

      await expect(
        service.executeAgent({
          mode: AgentExecutionMode.conversation,
          request: httpServerMock.createKibanaRequest(),
          params: {
            agentId: 'agent-1',
            reasoningLevel: 'xhigh',
            origin: { type: ConversationOriginType.Slack, external_conversation_id: 'thread-1' },
            nextInput: { message: 'hello' },
          },
          useTaskManager: true,
        })
      ).rejects.toMatchObject({ code: InferenceTaskErrorCode.requestError });

      expect(agentRegistry.get).toHaveBeenCalledWith('investigation-agent');
      expect(getForFeature).toHaveBeenCalledWith('investigation_feature', expect.anything(), {
        onlyReturnConfigured: true,
      });
      expect(mockExecutionClient.create).not.toHaveBeenCalled();
    });

    it('starts the execution when the requested connector cannot be resolved', async () => {
      inference.getConnectorById.mockRejectedValueOnce(
        new Error("No connector or inference endpoint found for ID 'connector-1'")
      );

      await executeWithReasoningLevel({ connectorId: 'connector-1' });

      expect(mockExecutionClient.create).toHaveBeenCalled();
    });

    it('starts the execution when the feature resolves no endpoints', async () => {
      await executeWithReasoningLevel();

      expect(inference.getConnectorById).not.toHaveBeenCalled();
      expect(mockExecutionClient.create).toHaveBeenCalled();
    });

    it('does not resolve a connector when no reasoning level is requested', async () => {
      await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request: httpServerMock.createKibanaRequest(),
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
        useTaskManager: true,
      });

      expect(getForFeature).not.toHaveBeenCalled();
      expect(inference.getConnectorById).not.toHaveBeenCalled();
    });

    describe('with an idempotency key', () => {
      const executeWithKey = () =>
        service.executeAgent({
          mode: AgentExecutionMode.conversation,
          request: httpServerMock.createKibanaRequest(),
          executionId: 'exec-1',
          metadata: { execution_idempotency_key: 'Ev123' },
          params: {
            agentId: 'agent-1',
            connectorId: 'connector-1',
            reasoningLevel: 'xhigh',
            nextInput: { message: 'hello' },
          },
          useTaskManager: true,
        });

      it('validates the first delivery', async () => {
        inference.getConnectorById.mockResolvedValueOnce(createEisConnector(['high', 'low']));

        await expect(executeWithKey()).rejects.toMatchObject({
          code: InferenceTaskErrorCode.requestError,
        });

        expect(mockExecutionClient.peek).toHaveBeenCalledWith('exec-1');
        expect(mockExecutionClient.create).not.toHaveBeenCalled();
      });

      it('returns the existing execution on replay without validating', async () => {
        const existing = { status: ExecutionStatus.scheduled, eventCount: 0 };
        mockExecutionClient.peek.mockResolvedValueOnce(existing).mockResolvedValueOnce(existing);
        mockExecutionClient.create.mockRejectedValueOnce(conflictError());

        const result = await executeWithKey();

        expect(inference.getConnectorById).not.toHaveBeenCalled();
        expect(result.executionId).toBe('exec-1');
      });
    });
  });

  describe('executeAgent for a sub-agent', () => {
    const executeSubAgent = () =>
      service.executeAgent({
        mode: AgentExecutionMode.standalone,
        request: httpServerMock.createKibanaRequest(),
        params: { agentId: 'agent-1', parentExecutionId: 'parent-1', nextInput: { message: 'hi' } },
        useTaskManager: true,
      });

    it("acts as the parent execution's owner", async () => {
      mockExecutionClient.peek.mockResolvedValueOnce({
        status: ExecutionStatus.running,
        eventCount: 0,
        owner: { id: 'profile-1', username: 'alice' },
      });

      await executeSubAgent();

      expect(mockExecutionClient.peek).toHaveBeenCalledWith('parent-1');
      expect(conversationService.getScopedClientAsUser).toHaveBeenCalledWith(
        expect.objectContaining({ user: expect.objectContaining({ id: 'profile-1' }) })
      );
    });

    it('acts as the request user when the parent has no recorded owner', async () => {
      mockExecutionClient.peek.mockResolvedValueOnce({
        status: ExecutionStatus.running,
        eventCount: 0,
      });

      await executeSubAgent();

      expect(conversationService.getScopedClientAsUser).not.toHaveBeenCalled();
    });
  });

  describe('executeAgent with an idempotency key', () => {
    const executeWithKey = (executionIdempotencyKey: string) =>
      service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request: httpServerMock.createKibanaRequest(),
        executionId: 'exec-1',
        metadata: { execution_idempotency_key: executionIdempotencyKey },
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
        useTaskManager: true,
      });

    it('returns the existing execution without scheduling a new task on replay', async () => {
      mockExecutionClient.create.mockRejectedValueOnce(conflictError());
      mockExecutionClient.peek.mockResolvedValueOnce({
        status: ExecutionStatus.completed,
        eventCount: 3,
      });

      const result = await executeWithKey('Ev123');

      expect(result.executionId).toBe('exec-1');
      expect(result.events$).toBeDefined();
      expect(mockTaskManagerSchedule).not.toHaveBeenCalled();
    });

    it('reports the conversation the existing execution stored, not the one the replay resolved', async () => {
      mockExecutionClient.create.mockRejectedValueOnce(conflictError());
      mockExecutionClient.peek.mockResolvedValueOnce({
        status: ExecutionStatus.running,
        eventCount: 1,
        conversationId: 'conversation-from-first-request',
      });

      const result = await executeWithKey('Ev123');

      expect(result.conversationId).toBe('conversation-from-first-request');
    });

    it('leaves dispatch to the original delivery when the existing execution is still scheduled', async () => {
      mockExecutionClient.create.mockRejectedValueOnce(conflictError());
      mockExecutionClient.peek.mockResolvedValueOnce({
        status: ExecutionStatus.scheduled,
        eventCount: 0,
      });

      const result = await executeWithKey('Ev123');

      expect(result.executionId).toBe('exec-1');
      expect(mockTaskManagerSchedule).not.toHaveBeenCalled();
    });

    it('rethrows create errors that are not duplicate-execution errors', async () => {
      mockExecutionClient.create.mockRejectedValueOnce(new Error('boom'));

      await expect(executeWithKey('Ev123')).rejects.toThrow('boom');
      expect(mockTaskManagerSchedule).not.toHaveBeenCalled();
    });
  });

  describe('findExecutions', () => {
    it('should delegate to executionClient.find with auto-injected spaceId', async () => {
      const request = httpServerMock.createKibanaRequest();
      mockExecutionClient.find.mockResolvedValue([]);

      await service.findExecutions(request, {
        filter: { metadata: { source: 'test' } },
      });

      expect(mockExecutionClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: 'default',
          filter: { metadata: { source: 'test' } },
        })
      );
    });

    it('should use explicit spaceId when provided, overriding the default', async () => {
      const request = httpServerMock.createKibanaRequest();
      mockExecutionClient.find.mockResolvedValue([]);

      await service.findExecutions(request, {
        spaceId: 'my-space',
        filter: { status: [ExecutionStatus.running] },
      });

      expect(mockExecutionClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'my-space' })
      );
    });

    it('should use default spaceId when spaceId is undefined in options', async () => {
      const request = httpServerMock.createKibanaRequest();
      mockExecutionClient.find.mockResolvedValue([]);

      await service.findExecutions(request, { spaceId: undefined });

      expect(mockExecutionClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'default' })
      );
    });

    it('should use defaults when no options provided', async () => {
      const request = httpServerMock.createKibanaRequest();
      mockExecutionClient.find.mockResolvedValue([]);

      await service.findExecutions(request);

      expect(mockExecutionClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'default' })
      );
    });

    it('should return results from executionClient.find', async () => {
      const request = httpServerMock.createKibanaRequest();
      const fakeExecution = {
        executionId: 'exec-1',
        '@timestamp': new Date().toISOString(),
        status: ExecutionStatus.running,
        agentId: 'agent-1',
        executionMode: AgentExecutionMode.conversation,
        spaceId: 'default',
        agentParams: {
          nextInput: { message: 'hello' },
          conversationId: 'conv-1',
          roundId: 'round-1',
          conversationOperation: 'UPDATE' as const,
          receivedAt: '2024-01-01T00:00:00.000Z',
        },
        eventCount: 0,
        events: [],
        metadata: { source: 'test' },
      };
      mockExecutionClient.find.mockResolvedValue([fakeExecution]);

      const results = await service.findExecutions(request);
      expect(results).toEqual([fakeExecution]);
    });
  });
  describe('user message persistence', () => {
    const conversation = createEmptyConversation({
      id: 'conversation-1',
      agent_id: 'agent-1',
      schema_version: CONVERSATION_SCHEMA_VERSION,
    });

    const converse = ({
      useTaskManager,
      ...params
    }: Record<string, unknown> & { useTaskManager?: boolean } = {}) =>
      service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request: httpServerMock.createKibanaRequest(),
        useTaskManager,
        params: {
          agentId: 'agent-1',
          conversationId: 'conversation-1',
          nextInput: { message: 'Hello' },
          ...params,
        },
      });

    beforeEach(() => {
      conversationClient.get.mockResolvedValue(conversation);
      conversationClient.exists.mockResolvedValue(true);
      conversationClient.appendEvents.mockResolvedValue(conversation);
      conversationClient.create.mockResolvedValue(conversation);
    });

    describe('with an origin and no conversation id', () => {
      const origin = {
        type: ConversationOriginType.Slack,
        external_conversation_id: 'thread-1',
      };
      const boundConversation = createEmptyConversation({
        id: 'investigation-1',
        agent_id: 'investigation-agent',
        schema_version: CONVERSATION_SCHEMA_VERSION,
      });

      it('continues the conversation the origin resolves to, on the agent it resolves to', async () => {
        resolveConversation.mockResolvedValueOnce({
          conversationId: 'investigation-1',
          agentId: 'investigation-agent',
        });
        conversationClient.get.mockResolvedValueOnce(boundConversation);

        await converse({ conversationId: undefined, origin });

        expect(resolveConversation).toHaveBeenCalledWith(
          {
            origin: { type: ConversationOriginType.Slack, external_conversation_id: 'thread-1' },
            spaceId: 'default',
            request: expect.anything(),
          },
          conversationClient
        );
        expect(conversationClient.get).toHaveBeenCalledWith('investigation-1');
        const [{ agentId, agentParams }] = mockExecutionClient.create.mock.calls[0];
        expect(agentId).toBe('investigation-agent');
        expect(agentParams).toMatchObject({
          agentId: 'investigation-agent',
          conversationId: 'investigation-1',
          conversationOperation: 'UPDATE',
        });
      });

      it('continues the conversation the origin resolves to, on the requested agent when no agent is resolved', async () => {
        resolveConversation.mockResolvedValueOnce({ conversationId: 'investigation-1' });
        conversationClient.get.mockResolvedValueOnce(boundConversation);

        await converse({ conversationId: undefined, origin });

        const [{ agentId, agentParams }] = mockExecutionClient.create.mock.calls[0];
        expect(agentId).toBe('agent-1');
        expect(agentParams).toMatchObject({
          agentId: 'agent-1',
          conversationId: 'investigation-1',
          conversationOperation: 'UPDATE',
        });
      });

      it('starts a conversation with the origin when nothing resolves it', async () => {
        await converse({ conversationId: undefined, origin });

        const [{ agentId, agentParams }] = mockExecutionClient.create.mock.calls[0];
        expect(agentId).toBe('agent-1');
        expect(agentParams).toMatchObject({ agentId: 'agent-1', conversationOperation: 'CREATE' });
      });

      it('does not resolve the origin when the request names its conversation, and keeps the requested agent', async () => {
        conversationClient.get.mockResolvedValueOnce(boundConversation);

        await converse({ conversationId: 'investigation-1', origin });

        expect(resolveConversation).not.toHaveBeenCalled();
        const [{ agentId }] = mockExecutionClient.create.mock.calls[0];
        expect(agentId).toBe('agent-1');
      });

      it('propagates a resolver error', async () => {
        resolveConversation.mockRejectedValueOnce(new Error('lookup failed'));

        await expect(converse({ conversationId: undefined, origin })).rejects.toThrow(
          'lookup failed'
        );
        expect(mockExecutionClient.create).not.toHaveBeenCalled();
      });
    });

    it('writes the opening user message on the round it reserved', async () => {
      await converse();

      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);
      const [{ events }] = conversationClient.appendEvents.mock.calls[0];
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ data: { message: 'Hello' } });

      const [{ agentParams }] = mockExecutionClient.create.mock.calls[0];
      const { roundId } = agentParams as { roundId?: string };
      expect(events[0].id).toBe(`${roundId}::user_message`);
    });

    it('writes nothing to an existing conversation it does not store, and records the run as such', async () => {
      await converse({ storeConversation: false });

      expect(conversationClient.appendEvents).not.toHaveBeenCalled();
      expect(conversationClient.create).not.toHaveBeenCalled();
      const [{ agentParams }] = mockExecutionClient.create.mock.calls[0];
      expect(agentParams).toMatchObject({
        conversationId: 'conversation-1',
        storeConversation: false,
        conversationOperation: 'UPDATE',
      });
    });

    it('writes the opening user message without waiting for a refresh', async () => {
      await converse();

      const [, options] = conversationClient.appendEvents.mock.calls[0];
      expect(options).toMatchObject({ refresh: false });
    });

    it('passes the author decoration to the client and stores it for the run', async () => {
      const author = { full_name: 'Attack Discovery Review' };

      await converse({ author });

      expect(conversationClient.getAuthor).toHaveBeenCalledWith(undefined, author);
      const [{ agentParams }] = mockExecutionClient.create.mock.calls[0];
      expect(agentParams).toMatchObject({ author });
    });

    it('falls back to the conversation owner when the requester has no author, as the round rewrite does', async () => {
      await converse();

      const [{ events }] = conversationClient.appendEvents.mock.calls[0];
      expect(events[0].actor).toMatchObject({ id: 'unknown', username: 'unknown' });
    });

    it('trims the message once, so the receipt-time write and the stored execution agree', async () => {
      await converse({ nextInput: { message: '  hi  ' } });

      // The receipt-time event, written before the run is dispatched.
      const [{ events }] = conversationClient.appendEvents.mock.calls[0];
      expect(events[0]).toMatchObject({ data: { message: 'hi' } });

      // What the record stores for the run to read back: the same trimmed text, so the round the
      // completed run rewrites carries it too instead of the untrimmed original.
      const [{ agentParams }] = mockExecutionClient.create.mock.calls[0];
      expect((agentParams as { nextInput: { message: string } }).nextInput.message).toBe('hi');
    });

    it('stores the receipt time, so a run rebuilding the message keeps its created_at', async () => {
      await converse();

      const [{ events }] = conversationClient.appendEvents.mock.calls[0];
      const [{ agentParams }] = mockExecutionClient.create.mock.calls[0];
      expect((agentParams as { receivedAt: string }).receivedAt).toBe(events[0].created_at);
    });

    it('records the execution before writing, so a replayed request cannot duplicate the message', async () => {
      mockExecutionClient.create.mockRejectedValueOnce(
        Object.assign(new Error('conflict'), { statusCode: 409 })
      );
      mockExecutionClient.peek.mockResolvedValue({
        status: ExecutionStatus.running,
      } as Awaited<ReturnType<AgentExecutionClient['peek']>>);

      await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request: httpServerMock.createKibanaRequest(),
        executionId: 'exec-1',
        metadata: { execution_idempotency_key: 'slack-event-1' },
        params: {
          agentId: 'agent-1',
          conversationId: 'conversation-1',
          nextInput: { message: 'Hello' },
        },
      });

      expect(conversationClient.appendEvents).not.toHaveBeenCalled();
    });

    it('creates the conversation the request asked for, carrying readOnly', async () => {
      conversationClient.exists.mockResolvedValue(false);

      await converse({
        conversationId: undefined,
        readOnly: true,
        autoCreateConversationWithId: true,
      });

      expect(conversationClient.create).toHaveBeenCalledWith(
        expect.objectContaining({ read_only: true }),
        { source: 'execution' }
      );
      expect(conversationClient.appendEvents).not.toHaveBeenCalled();
    });

    it('attributes a conversation created for a sub-agent to the parent execution', async () => {
      conversationClient.exists.mockResolvedValue(false);
      mockExecutionClient.peek.mockResolvedValueOnce({
        status: ExecutionStatus.running,
        eventCount: 0,
        agentId: 'parent-agent',
        owner: { id: 'profile-1', username: 'alice' },
      });

      await converse({
        conversationId: undefined,
        autoCreateConversationWithId: true,
        parentExecutionId: 'parent-1',
      });

      // The record id only names the parent for `peek`: it is not a conversation `execution_id`.
      expect(mockExecutionClient.peek).toHaveBeenCalledWith('parent-1');
      expect(conversationClient.create).toHaveBeenCalledWith(expect.anything(), {
        source: 'execution',
        activity: { actor: { type: EventActorType.agent, id: 'parent-agent' } },
      });
    });

    it('creates with no attribution when the parent execution is no longer recorded', async () => {
      conversationClient.exists.mockResolvedValue(false);
      mockExecutionClient.peek.mockResolvedValueOnce(undefined);

      await converse({
        conversationId: undefined,
        autoCreateConversationWithId: true,
        parentExecutionId: 'parent-1',
      });

      expect(conversationClient.create).toHaveBeenCalledTimes(1);
      expect(conversationClient.create).toHaveBeenCalledWith(expect.anything(), {
        source: 'execution',
      });
    });

    it('leaves a conversation paused on a prompt to the resume path', async () => {
      conversationClient.get.mockResolvedValue({
        ...conversation,
        rounds: [createRound({ id: 'round-1', status: ConversationRoundStatus.awaitingPrompt })],
      });

      await converse();

      expect(conversationClient.appendEvents).not.toHaveBeenCalled();
      expect(mockExecutionClient.create).toHaveBeenCalledTimes(1);
    });

    it('marks the execution failed, instead of leaving it scheduled, when the write itself fails', async () => {
      const writeError = new Error('ES unavailable');
      conversationClient.appendEvents.mockRejectedValue(writeError);

      await expect(converse()).rejects.toThrow('ES unavailable');

      const [{ executionId }] = mockExecutionClient.create.mock.calls[0];
      expect(mockExecutionClient.updateStatus).toHaveBeenCalledWith(
        executionId,
        ExecutionStatus.failed,
        expect.objectContaining({ error: expect.objectContaining({ message: 'ES unavailable' }) })
      );
      // Never dispatched: a replay with the same idempotency key must not schedule a task over a
      // conversation whose opening message never landed.
      expect(mockHandleAgentExecution).not.toHaveBeenCalled();
      expect(mockTaskManagerSchedule).not.toHaveBeenCalled();
    });

    it('waits for the write before handing off to the runner', async () => {
      let releaseWrite!: () => void;
      conversationClient.appendEvents.mockReturnValue(
        new Promise((resolve) => {
          releaseWrite = () => resolve(conversation);
        })
      );

      const pending = converse({ useTaskManager: false });
      await new Promise(process.nextTick);

      expect(mockHandleAgentExecution).not.toHaveBeenCalled();

      releaseWrite();
      await pending;

      expect(mockHandleAgentExecution).toHaveBeenCalledTimes(1);
    });
  });

  describe('maybeExecuteAgent with trigger_mode never', () => {
    const conversation = createEmptyConversation({
      id: 'conversation-1',
      agent_id: 'agent-1',
      schema_version: CONVERSATION_SCHEMA_VERSION,
    });

    const append = (params: Record<string, unknown> = {}) =>
      service.maybeExecuteAgent({
        mode: AgentExecutionMode.conversation,
        request: httpServerMock.createKibanaRequest(),
        params: {
          agentId: 'agent-1',
          conversationId: 'conversation-1',
          autoCreateConversationWithId: true,
          triggerMode: ChatTriggerMode.Never,
          nextInput: { message: 'Pool limit is now 200' },
          ...params,
        },
      });

    beforeEach(() => {
      conversationClient.exists.mockResolvedValue(true);
      conversationClient.get.mockResolvedValue(conversation);
      conversationClient.appendEvents.mockResolvedValue(conversation);
      conversationClient.create.mockResolvedValue(conversation);
      (attachmentsService.createStateManager as jest.Mock).mockReturnValue({
        getAll: () => [],
        drainChanges: () => [],
      });
    });

    it('passes the author decoration to the conversation client', async () => {
      const author = { full_name: 'Attack Discovery Review' };

      await append({ author });

      expect(conversationClient.getAuthor).toHaveBeenCalledWith(undefined, author);
    });

    it('writes the service account name the client resolved onto the message actor', async () => {
      conversationClient.getAuthor.mockReturnValueOnce({
        id: 'service_account:kibana/alertzero-workers',
        username: 'kibana/alertzero-workers',
        type: 'service_account',
        full_name: 'Attack Discovery Review',
      });

      await append({ author: { full_name: 'Attack Discovery Review' } });

      const [{ events }] = conversationClient.appendEvents.mock.calls[0];
      expect(events[0].actor).toMatchObject({
        type: 'user',
        id: 'service_account:kibana/alertzero-workers',
        username: 'kibana/alertzero-workers',
        principal_type: 'service_account',
        full_name: 'Attack Discovery Review',
      });
    });

    it('persists the message without recording an execution', async () => {
      await append();

      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);
      const [{ events }] = conversationClient.appendEvents.mock.calls[0];
      expect(events[0]).toMatchObject({ data: { message: 'Pool limit is now 200' } });
      // A standalone message must not look round-derived, or a round write would drop it.
      expect(events[0].id).not.toContain('::user_message');
      // The caller refreshes its conversation list from the response, so the write waits for it.
      expect(conversationClient.appendEvents.mock.calls[0][1]).not.toHaveProperty('refresh');

      expect(mockExecutionClient.create).not.toHaveBeenCalled();
      expect(mockHandleAgentExecution).not.toHaveBeenCalled();
    });

    it('reports the conversation through the same events an execution would', async () => {
      const events = await lastValueFrom((await append()).events$.pipe(toArray()));

      expect(events.map(({ type }) => type)).toEqual([ChatEventType.conversationUpdated]);
      expect(findConversationEvent(events).data.conversation_id).toBe('conversation-1');
    });

    it('creates the conversation when the request names none', async () => {
      conversationClient.exists.mockResolvedValue(false);

      const events = await lastValueFrom(
        (await append({ conversationId: undefined })).events$.pipe(toArray())
      );

      expect(conversationClient.create).toHaveBeenCalledTimes(1);
      expect(events.map(({ type }) => type)).toEqual([
        ChatEventType.conversationIdSet,
        ChatEventType.conversationCreated,
      ]);
    });

    it('appends to a conversation that predates canonical event storage', async () => {
      // The client derives such a conversation's timeline from its rounds and promotes the
      // document on write, so there is nothing to reject here.
      conversationClient.get.mockResolvedValue({ ...conversation, schema_version: undefined });

      await append();

      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);
    });

    it('persists an attachment-only message with its attachments linked to it', async () => {
      (attachmentsService.createStateManager as jest.Mock).mockReturnValue({
        getAll: () => [],
        drainChanges: () => [
          {
            kind: 'added',
            attachment_id: 'attachment-1',
            attachment_type: 'text',
            current_version: 1,
          },
        ],
      });

      await append({
        nextInput: { attachments: [{ type: 'text', data: { content: 'alert reason' } }] },
      });

      expect(attachmentsService.mergeAttachmentInputs).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: [{ id: 'attachment-1', type: 'text', data: { content: 'alert reason' } }],
        })
      );

      const [{ events }] = conversationClient.appendEvents.mock.calls[0];
      const [userMessage, attachmentEvent] = events;
      expect(userMessage).toMatchObject({ type: TimelineEventType.userMessage });
      expect(userMessage.data).toEqual({ message: '' });
      expect(attachmentEvent).toMatchObject({
        type: TimelineEventType.attachmentAdded,
        trigger_event_id: userMessage.id,
        data: { attachment_id: 'attachment-1', source: 'chat_input', format: 2 },
      });
      expect(attachmentEvent).not.toHaveProperty('execution_id');
    });

    it('requires something to say', async () => {
      const error = await append({ nextInput: { message: '  ' } }).catch((thrown) => thrown);

      expect(isBadRequestError(error)).toBe(true);
      expect(error.message).toContain('input or attachments');
      expect(conversationClient.exists).not.toHaveBeenCalled();
      expect(conversationClient.get).not.toHaveBeenCalled();
    });

    it('attributes a relayed message to its origin author, as a run would', async () => {
      const author = { id: 'U123', username: 'slack-bob' };
      conversationClient.getAuthor.mockImplementationOnce((originAuthor) => originAuthor);

      await append({
        origin: {
          type: ConversationOriginType.Slack,
          external_conversation_id: 'T1/C1/1700000000.000',
          author,
        },
      });

      expect(conversationClient.getAuthor).toHaveBeenCalledWith(author, undefined);
      const [{ events }] = conversationClient.appendEvents.mock.calls[0];
      expect(events[0].actor).toMatchObject({
        type: 'external',
        id: 'U123',
        username: 'slack-bob',
        origin: { type: ConversationOriginType.Slack },
      });
    });
  });

  describe('executeAgent on a busy conversation', () => {
    const conversation = createEmptyConversation({
      id: 'conversation-1',
      agent_id: 'agent-1',
      schema_version: CONVERSATION_SCHEMA_VERSION,
    });

    const converse = (params: Record<string, unknown> = {}) =>
      service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request: httpServerMock.createKibanaRequest(),
        useTaskManager: true,
        params: {
          agentId: 'agent-1',
          conversationId: 'conversation-1',
          nextInput: { message: 'Hello' },
          ...params,
        },
      });

    const appendedActiveExecution = () => {
      const [{ activeExecution }] = conversationClient.appendEvents.mock.calls[0];
      return activeExecution;
    };

    beforeEach(() => {
      conversationClient.get.mockResolvedValue(conversation);
      conversationClient.exists.mockResolvedValue(true);
      conversationClient.appendEvents.mockResolvedValue(conversation);
      conversationClient.create.mockResolvedValue(conversation);
      conversationClient.update.mockResolvedValue(conversation);
      // The dispatch path reads the id back from the created record.
      mockExecutionClient.create.mockImplementation(
        async (params) =>
          ({
            '@timestamp': new Date().toISOString(),
            status: ExecutionStatus.scheduled,
            eventCount: 0,
            events: [],
            ...params,
          } as AgentExecution)
      );
    });

    it('refuses with conversationBusy, deletes its execution record and schedules nothing', async () => {
      conversationClient.appendEvents.mockRejectedValueOnce(
        createConversationBusyError({
          conversationId: 'conversation-1',
          activeExecutionId: 'other-exec',
        })
      );

      const error = await converse().catch((thrown) => thrown);

      expect(isConversationBusyError(error)).toBe(true);
      const [{ executionId }] = mockExecutionClient.create.mock.calls[0];
      expect(mockExecutionClient.delete).toHaveBeenCalledWith(executionId);
      expect(mockExecutionClient.updateStatus).not.toHaveBeenCalledWith(
        expect.anything(),
        ExecutionStatus.failed,
        expect.anything()
      );
      expect(mockTaskManagerSchedule).not.toHaveBeenCalled();
      expect(mockTaskManagerSchedule).not.toHaveBeenCalled();
    });

    it('still refuses when deleting the refused execution record fails', async () => {
      conversationClient.appendEvents.mockRejectedValueOnce(
        createConversationBusyError({
          conversationId: 'conversation-1',
          activeExecutionId: 'other-exec',
        })
      );
      mockExecutionClient.delete.mockRejectedValueOnce(new Error('ES unavailable'));

      const error = await converse().catch((thrown) => thrown);

      expect(isConversationBusyError(error)).toBe(true);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('deletes its record when the active execution write keeps conflicting', async () => {
      conversationClient.appendEvents.mockRejectedValueOnce(
        createConversationWriteConflictError({ conversationId: 'conversation-1' })
      );

      const error = await converse().catch((thrown) => thrown);

      expect(isConversationWriteConflictError(error)).toBe(true);
      const [{ executionId }] = mockExecutionClient.create.mock.calls[0];
      expect(mockExecutionClient.delete).toHaveBeenCalledWith(executionId);
      expect(mockExecutionClient.updateStatus).not.toHaveBeenCalledWith(
        expect.anything(),
        ExecutionStatus.failed,
        expect.anything()
      );
      expect(mockTaskManagerSchedule).not.toHaveBeenCalled();
    });

    it('releases the active execution when scheduling fails after setting it', async () => {
      const scheduleError = new Error('task manager unavailable');
      mockTaskManagerSchedule.mockRejectedValueOnce(scheduleError);

      const error = await converse().catch((thrown) => thrown);

      expect(error).toBe(scheduleError);
      const [{ executionId }] = mockExecutionClient.create.mock.calls[0];
      expect(conversationClient.update).toHaveBeenCalledWith(
        { id: 'conversation-1' },
        {
          source: 'execution',
          access: 'converse',
          retryOnConflict: true,
          activeExecution: { action: 'release', executionId },
        }
      );
    });

    it('rethrows the scheduling error when releasing the active execution fails', async () => {
      const scheduleError = new Error('task manager unavailable');
      mockTaskManagerSchedule.mockRejectedValueOnce(scheduleError);
      conversationClient.update.mockRejectedValueOnce(new Error('ES unavailable'));

      const error = await converse().catch((thrown) => thrown);

      expect(error).toBe(scheduleError);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('does not release when scheduling fails without an active execution', async () => {
      mockTaskManagerSchedule.mockRejectedValueOnce(new Error('task manager unavailable'));

      await converse({ storeConversation: false }).catch(() => undefined);

      expect(conversationClient.update).not.toHaveBeenCalled();
    });

    it('marks the execution failed when scheduling fails', async () => {
      mockTaskManagerSchedule.mockRejectedValueOnce(new Error('task manager unavailable'));

      await converse().catch(() => undefined);

      const [{ executionId }] = mockExecutionClient.create.mock.calls[0];
      expect(mockExecutionClient.updateStatus).toHaveBeenCalledWith(
        executionId,
        ExecutionStatus.failed,
        { error: expect.objectContaining({ message: 'task manager unavailable' }) }
      );
    });

    it('rethrows the scheduling error when recording the failed status fails', async () => {
      const scheduleError = new Error('task manager unavailable');
      mockTaskManagerSchedule.mockRejectedValueOnce(scheduleError);
      mockExecutionClient.updateStatus.mockRejectedValueOnce(new Error('ES unavailable'));

      const error = await converse().catch((thrown) => thrown);

      expect(error).toBe(scheduleError);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('after it failed to schedule: ES unavailable')
      );
    });

    it('a keyed redelivery after a scheduling failure follows the failed execution without scheduling', async () => {
      const keyed = () =>
        service.executeAgent({
          mode: AgentExecutionMode.conversation,
          request: httpServerMock.createKibanaRequest(),
          useTaskManager: true,
          executionId: 'exec-1',
          metadata: { execution_idempotency_key: 'Ev123' },
          params: {
            agentId: 'agent-1',
            conversationId: 'conversation-1',
            nextInput: { message: 'Hello' },
          },
        });

      mockTaskManagerSchedule.mockRejectedValueOnce(new Error('task manager unavailable'));

      await expect(keyed()).rejects.toThrow('task manager unavailable');

      expect(mockExecutionClient.updateStatus).toHaveBeenCalledWith(
        'exec-1',
        ExecutionStatus.failed,
        expect.anything()
      );

      mockExecutionClient.create.mockRejectedValueOnce(conflictError());
      mockExecutionClient.peek.mockResolvedValueOnce({
        status: ExecutionStatus.failed,
        eventCount: 0,
        conversationId: 'conversation-1',
      });

      const result = await keyed();

      expect(result.executionId).toBe('exec-1');
      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);
      expect(mockTaskManagerSchedule).toHaveBeenCalledTimes(1);
    });

    it('a keyed redelivery runs normally once the holder is free', async () => {
      const keyed = () =>
        service.executeAgent({
          mode: AgentExecutionMode.conversation,
          request: httpServerMock.createKibanaRequest(),
          useTaskManager: true,
          executionId: 'exec-1',
          metadata: { execution_idempotency_key: 'Ev123' },
          params: {
            agentId: 'agent-1',
            conversationId: 'conversation-1',
            nextInput: { message: 'Hello' },
          },
        });

      conversationClient.appendEvents.mockRejectedValueOnce(
        createConversationBusyError({
          conversationId: 'conversation-1',
          activeExecutionId: 'other-exec',
        })
      );

      const refused = await keyed().catch((thrown) => thrown);

      expect(isConversationBusyError(refused)).toBe(true);
      expect(mockExecutionClient.delete).toHaveBeenCalledWith('exec-1');
      expect(mockTaskManagerSchedule).not.toHaveBeenCalled();

      const result = await keyed();

      expect(result.executionId).toBe('exec-1');
      expect(mockExecutionClient.create).toHaveBeenCalledTimes(2);
      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(2);
      expect(conversationClient.appendEvents.mock.calls[1][0].activeExecution).toMatchObject({
        executionId: 'exec-1',
      });
      expect(mockTaskManagerSchedule).toHaveBeenCalledTimes(1);
    });

    it("sets the active execution with the round's user message", async () => {
      await converse();

      const [{ executionId }] = mockExecutionClient.create.mock.calls[0];
      expect(appendedActiveExecution()).toEqual({ action: 'acquire', executionId });
    });

    it('sets the active execution with an update without fields on a HITL resume', async () => {
      conversationClient.get.mockResolvedValue({
        ...conversation,
        rounds: [createRound({ id: 'round-1', status: ConversationRoundStatus.awaitingPrompt })],
      });

      await converse();

      const [{ executionId }] = mockExecutionClient.create.mock.calls[0];
      expect(conversationClient.update).toHaveBeenCalledWith(
        { id: 'conversation-1' },
        {
          source: 'execution',
          access: 'converse',
          retryOnConflict: true,
          activeExecution: { action: 'acquire', executionId },
        }
      );
      expect(conversationClient.appendEvents).not.toHaveBeenCalled();
    });

    it('sets the active execution for a sub-agent conversation too', async () => {
      conversationClient.get.mockResolvedValue({
        ...conversation,
        parent_conversation: { id: 'parent-1', relation: ConversationParentRelation.subagent },
      });

      await converse();

      expect(appendedActiveExecution()).toEqual(
        expect.objectContaining({ executionId: expect.any(String) })
      );
    });

    it('does not set the active execution when storeConversation is false', async () => {
      await converse({ storeConversation: false });

      expect(conversationClient.appendEvents).not.toHaveBeenCalled();
      expect(conversationClient.create).not.toHaveBeenCalled();
      expect(conversationClient.update).not.toHaveBeenCalled();
    });

    it('still returns the existing execution on an idempotent replay without setting the active execution', async () => {
      mockExecutionClient.create.mockRejectedValueOnce(conflictError());
      mockExecutionClient.peek.mockResolvedValueOnce({
        status: ExecutionStatus.completed,
        eventCount: 3,
      });

      const result = await service.executeAgent({
        mode: AgentExecutionMode.conversation,
        request: httpServerMock.createKibanaRequest(),
        executionId: 'exec-1',
        metadata: { execution_idempotency_key: 'Ev123' },
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
        useTaskManager: true,
      });

      expect(result.executionId).toBe('exec-1');
      expect(conversationClient.appendEvents).not.toHaveBeenCalled();
      expect(conversationClient.create).not.toHaveBeenCalled();
      expect(conversationClient.update).not.toHaveBeenCalled();
      expect(mockExecutionClient.delete).not.toHaveBeenCalled();
    });

    it('trigger_mode never appends without setting the active execution', async () => {
      (attachmentsService.createStateManager as jest.Mock).mockReturnValue({
        getAccessedRefs: () => [],
        getAll: () => [],
        drainChanges: () => [],
      });

      await service.maybeExecuteAgent({
        mode: AgentExecutionMode.conversation,
        request: httpServerMock.createKibanaRequest(),
        params: {
          agentId: 'agent-1',
          conversationId: 'conversation-1',
          triggerMode: ChatTriggerMode.Never,
          nextInput: { message: 'Pool limit is now 200' },
        },
      });

      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);
      expect(appendedActiveExecution()).toBeUndefined();
      expect(conversationClient.update).not.toHaveBeenCalled();
    });
  });
});
