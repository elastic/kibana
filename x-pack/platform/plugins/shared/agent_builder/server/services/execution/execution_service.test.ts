/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, Subject } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { ExecutionStatus } from './types';
import type { AgentExecutionClient } from './persistence';

// Mock persistence module
const mockExecutionClient: jest.Mocked<AgentExecutionClient> = {
  create: jest.fn(),
  get: jest.fn(),
  updateStatus: jest.fn(),
  appendEvents: jest.fn(),
  peek: jest.fn(),
  readEvents: jest.fn(),
};

jest.mock('./persistence', () => ({
  createAgentExecutionClient: () => mockExecutionClient,
}));

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

const mockTaskManagerSchedule = jest.fn();
const mockUiSettingsGet = jest.fn();
const mockGetScopedClient = jest.fn();
const mockAsScopedToClient = jest.fn();

import { createAgentExecutionService } from './execution_service';

describe('AgentExecutionService', () => {
  const logger = loggerMock.create();
  const elasticsearch = elasticsearchServiceMock.createStart();
  const taskManager = {
    schedule: mockTaskManagerSchedule,
  } as any;

  const uiSettings = {
    asScopedToClient: mockAsScopedToClient,
  } as any;

  const savedObjects = {
    getScopedClient: mockGetScopedClient,
  } as any;

  const service = createAgentExecutionService({
    logger,
    elasticsearch,
    taskManager,
    inference: {} as any,
    conversationService: {} as any,
    agentService: {} as any,
    uiSettings,
    savedObjects,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecutionClient.create.mockResolvedValue({
      executionId: 'test-id',
      '@timestamp': new Date().toISOString(),
      status: ExecutionStatus.scheduled,
      agentId: 'agent-1',
      spaceId: 'default',
      agentParams: { nextInput: { message: 'hello' } },
      eventCount: 0,
      events: [],
    });
    // Default: UI setting returns false (run locally)
    mockGetScopedClient.mockReturnValue({});
    mockAsScopedToClient.mockReturnValue({ get: mockUiSettingsGet });
    mockUiSettingsGet.mockResolvedValue(false);
  });

  describe('executeAgent (TM mode)', () => {
    it('should create an execution document and schedule a task', async () => {
      const request = httpServerMock.createKibanaRequest();

      const result = await service.executeAgent({
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

      expect(mockTaskManagerSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          taskType: 'agent-builder:run-agent',
          params: { executionId: result.executionId },
          scope: ['agent-builder'],
        }),
        { request }
      );
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
        request,
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
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
      // Should NOT have checked UI settings
      expect(mockGetScopedClient).not.toHaveBeenCalled();
    });

    it('should run on TM when UI setting is true', async () => {
      const request = httpServerMock.createKibanaRequest();
      mockUiSettingsGet.mockResolvedValue(true);

      const result = await service.executeAgent({
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

    it('should run locally when UI setting is false', async () => {
      const request = httpServerMock.createKibanaRequest();
      mockUiSettingsGet.mockResolvedValue(false);

      mockHandleAgentExecution.mockResolvedValue(of());
      mockCollectAndWriteEvents.mockResolvedValue(undefined);

      const result = await service.executeAgent({
        request,
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
        // useTaskManager NOT provided -> auto-detect
      });

      expect(result.executionId).toBeDefined();
      // Should NOT schedule a TM task
      expect(mockTaskManagerSchedule).not.toHaveBeenCalled();
      // Should have run locally
      expect(mockHandleAgentExecution).toHaveBeenCalled();
    });

    it('should honour explicit useTaskManager=true even when isFakeRequest is true', async () => {
      const request = httpServerMock.createKibanaRequest();
      Object.defineProperty(request, 'isFakeRequest', { value: true });

      const result = await service.executeAgent({
        request,
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
        useTaskManager: true,
      });

      expect(result.executionId).toBeDefined();
      // Should have scheduled a TM task despite fakeRequest
      expect(mockTaskManagerSchedule).toHaveBeenCalled();
    });

    it('should honour explicit useTaskManager=false even when UI setting is true', async () => {
      const request = httpServerMock.createKibanaRequest();
      mockUiSettingsGet.mockResolvedValue(true);

      mockHandleAgentExecution.mockResolvedValue(of());
      mockCollectAndWriteEvents.mockResolvedValue(undefined);

      const result = await service.executeAgent({
        request,
        params: { agentId: 'agent-1', nextInput: { message: 'hello' } },
        useTaskManager: false,
      });

      expect(result.executionId).toBeDefined();
      // Should NOT schedule a TM task
      expect(mockTaskManagerSchedule).not.toHaveBeenCalled();
      // Should have run locally
      expect(mockHandleAgentExecution).toHaveBeenCalled();
      // Should NOT have checked UI settings
      expect(mockGetScopedClient).not.toHaveBeenCalled();
    });
  });

  describe('abortExecution', () => {
    it('should update status to aborted for running execution', async () => {
      mockExecutionClient.get.mockResolvedValue({
        executionId: 'exec-1',
        '@timestamp': new Date().toISOString(),
        status: ExecutionStatus.running,
        agentId: 'agent-1',
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

    it('should throw for non-existent execution', async () => {
      mockExecutionClient.get.mockResolvedValue(undefined);

      await expect(service.abortExecution('exec-1')).rejects.toThrow('Execution exec-1 not found');
    });

    it('should throw when trying to abort a completed execution', async () => {
      mockExecutionClient.get.mockResolvedValue({
        executionId: 'exec-1',
        '@timestamp': new Date().toISOString(),
        status: ExecutionStatus.completed,
        agentId: 'agent-1',
        spaceId: 'default',
        agentParams: { nextInput: { message: 'test' } },
        eventCount: 0,
        events: [],
      });

      await expect(service.abortExecution('exec-1')).rejects.toThrow(
        'Cannot abort execution exec-1 with status completed'
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
});
