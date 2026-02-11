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
import { isAgentBuilderError, AgentBuilderErrorCode } from '@kbn/agent-builder-common';
import { ExecutionStatus } from './types';
import type { AgentExecutionClient } from './persistence';
import type { ExecutionEventsClient } from './persistence';

// Mock persistence module
const mockExecutionClient: jest.Mocked<AgentExecutionClient> = {
  create: jest.fn(),
  get: jest.fn(),
  updateStatus: jest.fn(),
};

const mockEventsClient: jest.Mocked<ExecutionEventsClient> = {
  writeEvents: jest.fn(),
  readEvents: jest.fn(),
};

jest.mock('./persistence', () => ({
  createAgentExecutionClient: () => mockExecutionClient,
  createExecutionEventsClient: () => mockEventsClient,
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

import { createAgentExecutionService } from './execution_service';

describe('AgentExecutionService', () => {
  const logger = loggerMock.create();
  const elasticsearch = elasticsearchServiceMock.createStart();
  const dataStreams = {} as any;
  const taskManager = {
    schedule: mockTaskManagerSchedule,
  } as any;

  const service = createAgentExecutionService({
    logger,
    elasticsearch,
    dataStreams,
    taskManager,
    inference: {} as any,
    conversationService: {} as any,
    agentService: {} as any,
    uiSettings: {} as any,
    savedObjects: {} as any,
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
    });
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

  describe('abortExecution', () => {
    it('should update status to aborted for running execution', async () => {
      mockExecutionClient.get.mockResolvedValue({
        executionId: 'exec-1',
        '@timestamp': new Date().toISOString(),
        status: ExecutionStatus.running,
        agentId: 'agent-1',
        spaceId: 'default',
        agentParams: { nextInput: { message: 'test' } },
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
      });

      await expect(service.abortExecution('exec-1')).rejects.toThrow(
        'Cannot abort execution exec-1 with status completed'
      );
    });
  });

  describe('followExecution', () => {
    it('should emit events and complete when execution finishes', (done) => {
      const events = [
        {
          '@timestamp': Date.now(),
          agentExecutionId: 'exec-1',
          eventNumber: 1,
          agentId: 'agent-1',
          spaceId: 'default',
          event: { type: 'message_chunk', data: { message_id: 'm1', text_chunk: 'hello' } },
        },
      ];

      mockEventsClient.readEvents
        .mockResolvedValueOnce(events as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValue([] as any);

      mockExecutionClient.get
        .mockResolvedValueOnce({
          executionId: 'exec-1',
          '@timestamp': new Date().toISOString(),
          status: ExecutionStatus.running,
          agentId: 'agent-1',
          spaceId: 'default',
          agentParams: { nextInput: { message: 'test' } },
        })
        .mockResolvedValue({
          executionId: 'exec-1',
          '@timestamp': new Date().toISOString(),
          status: ExecutionStatus.completed,
          agentId: 'agent-1',
          spaceId: 'default',
          agentParams: { nextInput: { message: 'test' } },
        });

      const receivedEvents: any[] = [];

      service.followExecution('exec-1').subscribe({
        next: (event) => {
          receivedEvents.push(event);
        },
        complete: () => {
          expect(receivedEvents.length).toBeGreaterThanOrEqual(1);
          expect(receivedEvents[0]).toEqual(events[0].event);
          done();
        },
        error: done.fail,
      });
    });

    it('should emit an AgentBuilderError when execution fails with a persisted error', (done) => {
      mockEventsClient.readEvents.mockResolvedValue([] as any);

      mockExecutionClient.get.mockResolvedValue({
        executionId: 'exec-1',
        '@timestamp': new Date().toISOString(),
        status: ExecutionStatus.failed,
        agentId: 'agent-1',
        spaceId: 'default',
        agentParams: { nextInput: { message: 'test' } },
        error: {
          code: AgentBuilderErrorCode.agentNotFound,
          message: 'Agent my-agent not found',
          meta: { agentId: 'my-agent' },
        },
      });

      service.followExecution('exec-1').subscribe({
        next: () => {},
        complete: () => {
          done.fail('Expected an error, not completion');
        },
        error: (err) => {
          expect(isAgentBuilderError(err)).toBe(true);
          expect(err.code).toBe(AgentBuilderErrorCode.agentNotFound);
          expect(err.message).toBe('Agent my-agent not found');
          expect(err.meta).toEqual(expect.objectContaining({ agentId: 'my-agent' }));
          done();
        },
      });
    });

    it('should emit an internalError when execution fails without a persisted error', (done) => {
      mockEventsClient.readEvents.mockResolvedValue([] as any);

      mockExecutionClient.get.mockResolvedValue({
        executionId: 'exec-1',
        '@timestamp': new Date().toISOString(),
        status: ExecutionStatus.failed,
        agentId: 'agent-1',
        spaceId: 'default',
        agentParams: { nextInput: { message: 'test' } },
        // no error field
      });

      service.followExecution('exec-1').subscribe({
        next: () => {},
        complete: () => {
          done.fail('Expected an error, not completion');
        },
        error: (err) => {
          expect(isAgentBuilderError(err)).toBe(true);
          expect(err.code).toBe(AgentBuilderErrorCode.internalError);
          expect(err.message).toBe('Execution exec-1 failed');
          done();
        },
      });
    });

    it('should emit an error when execution is aborted', (done) => {
      mockEventsClient.readEvents.mockResolvedValue([] as any);

      mockExecutionClient.get.mockResolvedValue({
        executionId: 'exec-1',
        '@timestamp': new Date().toISOString(),
        status: ExecutionStatus.aborted,
        agentId: 'agent-1',
        spaceId: 'default',
        agentParams: { nextInput: { message: 'test' } },
      });

      service.followExecution('exec-1').subscribe({
        next: () => {},
        complete: () => {
          done.fail('Expected an error, not completion');
        },
        error: (err) => {
          expect(err.message).toBe('Execution exec-1 was aborted');
          done();
        },
      });
    });
  });
});
