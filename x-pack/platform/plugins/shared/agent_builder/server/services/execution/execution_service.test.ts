/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
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

  describe('executeAgent', () => {
    it('should create an execution document and schedule a task', async () => {
      const request = httpServerMock.createKibanaRequest();

      const result = await service.executeAgent({
        request,
        params: {
          agentId: 'agent-1',
          nextInput: { message: 'hello' },
        },
      });

      expect(result.executionId).toBeDefined();

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
  });
});
