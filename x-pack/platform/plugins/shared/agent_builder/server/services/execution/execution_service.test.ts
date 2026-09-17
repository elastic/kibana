/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, of, Subject, toArray } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { ChatEvent } from '@kbn/agent-builder-common';
import {
  AgentExecutionMode,
  CONVERSATION_SCHEMA_VERSION,
  ChatEventType,
  ChatTriggerMode,
  ConversationRoundStatus,
  ExecutionStatus,
  isBadRequestError,
} from '@kbn/agent-builder-common';
import type { AgentExecutionClient } from './persistence';
import type { AttachmentServiceStart } from '../attachments';
import {
  createConversationClientMock,
  createEmptyConversation,
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
const mockTaskManagerEnsureScheduled = jest.fn();

import { createAgentExecutionService } from './execution_service';

describe('AgentExecutionService', () => {
  const logger = loggerMock.create();
  const elasticsearch = elasticsearchServiceMock.createStart();
  const taskManager = {
    schedule: mockTaskManagerSchedule,
    ensureScheduled: mockTaskManagerEnsureScheduled,
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
    getConversationRoundAuthor: jest.fn().mockResolvedValue(undefined),
    getCurrentUser: jest.fn().mockResolvedValue({ id: 'user-1', username: 'alice' }),
  };

  const service = createAgentExecutionService({
    logger,
    elasticsearch,
    taskManager,
    inference: {} as any,
    conversationService: conversationService as any,
    agentService: {} as any,
    runAgent: jest.fn(),
    attachmentsService,
    uiSettings,
    savedObjects,
    meteringService,
    searchInferenceEndpoints: {} as any,
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
      agentParams: { nextInput: { message: 'hello' } },
      eventCount: 0,
      events: [],
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
          agentParams: expect.objectContaining({
            agentId: 'agent-1',
            nextInput: { message: 'hello' },
          }),
        })
      );

      expect(mockTaskManagerEnsureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          taskType: 'agent-builder:run-agent',
          params: { executionId: result.executionId },
          scope: ['agent-builder'],
        }),
        { request, cloneApiKey: true }
      );
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
      expect(mockTaskManagerEnsureScheduled).not.toHaveBeenCalled();
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
      expect(mockTaskManagerEnsureScheduled).not.toHaveBeenCalled();

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

      const { events$ } = await service.executeAgent({
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

      expect(receivedEvents).toEqual([fakeEvent]);
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
      expect(mockTaskManagerEnsureScheduled).not.toHaveBeenCalled();
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
      expect(mockTaskManagerEnsureScheduled).toHaveBeenCalled();
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
      expect(mockTaskManagerEnsureScheduled).toHaveBeenCalled();
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
      expect(mockTaskManagerEnsureScheduled).not.toHaveBeenCalled();
      // Should have run locally
      expect(mockHandleAgentExecution).toHaveBeenCalled();
    });
  });

  describe('abortExecution', () => {
    it('should update status to aborted for running execution', async () => {
      mockExecutionClient.get.mockResolvedValue({
        executionId: 'exec-1',
        '@timestamp': new Date().toISOString(),
        status: ExecutionStatus.running,
        agentId: 'agent-1',
        executionMode: AgentExecutionMode.conversation,
        spaceId: 'default',
        agentParams: { nextInput: { message: 'test' } },
        eventCount: 0,
        events: [],
      });

      await service.abortExecution('exec-1');

      expect(mockExecutionClient.updateStatus).toHaveBeenCalledWith(
        'exec-1',
        ExecutionStatus.aborted
      );
    });

    it('should warn and no-op for a non-existent execution', async () => {
      mockExecutionClient.get.mockResolvedValue(undefined);

      await expect(service.abortExecution('exec-1')).resolves.toBeUndefined();
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
        agentParams: { nextInput: { message: 'test' } },
        eventCount: 0,
        events: [],
      });

      await expect(service.abortExecution('exec-1')).resolves.toBeUndefined();
      expect(mockExecutionClient.updateStatus).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
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
      expect(mockTaskManagerEnsureScheduled).not.toHaveBeenCalled();
    });

    it('re-issues the schedule on replay when the existing execution never got a task', async () => {
      mockExecutionClient.create.mockRejectedValueOnce(conflictError());
      mockExecutionClient.peek.mockResolvedValueOnce({
        status: ExecutionStatus.scheduled,
        eventCount: 0,
      });

      const result = await executeWithKey('Ev123');

      expect(result.executionId).toBe('exec-1');
      expect(mockTaskManagerEnsureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'agent-exec-1',
          taskType: 'agent-builder:run-agent',
          params: { executionId: 'exec-1' },
        }),
        expect.anything()
      );
    });

    it('rethrows create errors that are not duplicate-execution errors', async () => {
      mockExecutionClient.create.mockRejectedValueOnce(new Error('boom'));

      await expect(executeWithKey('Ev123')).rejects.toThrow('boom');
      expect(mockTaskManagerEnsureScheduled).not.toHaveBeenCalled();
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
        agentParams: { nextInput: { message: 'hello' } },
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
        expect.objectContaining({ read_only: true })
      );
      expect(conversationClient.appendEvents).not.toHaveBeenCalled();
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

  describe('executeAgent with trigger_mode never', () => {
    const conversation = createEmptyConversation({
      id: 'conversation-1',
      agent_id: 'agent-1',
      schema_version: CONVERSATION_SCHEMA_VERSION,
    });

    const append = (params: Record<string, unknown> = {}) =>
      service.executeAgent({
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
        getAccessedRefs: () => [],
        getAll: () => [],
        drainChanges: () => [],
      });
    });

    it('persists the message without recording an execution', async () => {
      const result = await append();

      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);
      const [{ events }] = conversationClient.appendEvents.mock.calls[0];
      expect(events[0]).toMatchObject({ data: { message: 'Pool limit is now 200' } });
      // A standalone message must not look round-derived, or a round write would drop it.
      expect(events[0].id).not.toContain('::user_message');

      expect(mockExecutionClient.create).not.toHaveBeenCalled();
      expect(mockHandleAgentExecution).not.toHaveBeenCalled();
      expect(result.executionId).toBeUndefined();
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

    it('rejects a conversation that predates canonical event storage', async () => {
      conversationClient.get.mockResolvedValue({ ...conversation, schema_version: undefined });

      const error = await append().catch((thrown) => thrown);

      expect(isBadRequestError(error)).toBe(true);
      expect(error.message).toContain('canonical event storage');
      expect(conversationClient.appendEvents).not.toHaveBeenCalled();
    });

    it('requires something to say', async () => {
      const error = await append({ nextInput: { message: '  ' } }).catch((thrown) => thrown);

      expect(isBadRequestError(error)).toBe(true);
      expect(error.message).toContain('input or attachments');
    });
  });
});
