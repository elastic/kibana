/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { WorkflowStateTracker } from './workflow_state_tracker';

const WORKFLOW_EXECUTIONS_INDEX = '.aesop-workflow-executions';

describe('WorkflowStateTracker', () => {
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let tracker: WorkflowStateTracker;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockLogger = loggingSystemMock.createLogger();
    tracker = new WorkflowStateTracker(mockEsClient, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureIndexExists', () => {
    it('should create the index when it does not exist', async () => {
      mockEsClient.indices.exists.mockResolvedValue(false);
      mockEsClient.indices.create.mockResolvedValue({} as any);

      await tracker.ensureIndexExists();

      expect(mockEsClient.indices.exists).toHaveBeenCalledWith({
        index: WORKFLOW_EXECUTIONS_INDEX,
      });
      expect(mockEsClient.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          index: WORKFLOW_EXECUTIONS_INDEX,
          settings: expect.objectContaining({
            number_of_shards: 1,
            number_of_replicas: 0,
            'index.hidden': true,
          }),
          mappings: expect.objectContaining({
            properties: expect.objectContaining({
              execution_id: { type: 'keyword' },
              status: { type: 'keyword' },
              current_phase: { type: 'integer' },
            }),
          }),
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Created index'));
    });

    it('should skip creation when the index already exists', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);

      await tracker.ensureIndexExists();

      expect(mockEsClient.indices.exists).toHaveBeenCalledWith({
        index: WORKFLOW_EXECUTIONS_INDEX,
      });
      expect(mockEsClient.indices.create).not.toHaveBeenCalled();
    });

    it('should log and rethrow when indices.exists fails', async () => {
      const error = new Error('Connection refused');
      mockEsClient.indices.exists.mockRejectedValue(error);

      await expect(tracker.ensureIndexExists()).rejects.toThrow('Connection refused');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[WorkflowStateTracker] Failed to ensure index exists')
      );
    });

    it('should log and rethrow when indices.create fails', async () => {
      mockEsClient.indices.exists.mockResolvedValue(false);
      const error = new Error('Cluster read-only');
      mockEsClient.indices.create.mockRejectedValue(error);

      await expect(tracker.ensureIndexExists()).rejects.toThrow('Cluster read-only');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[WorkflowStateTracker] Failed to ensure index exists')
      );
    });
  });

  describe('initializeExecution', () => {
    it('should call ensureIndexExists then index the initial state document', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      mockEsClient.index.mockResolvedValue({ _id: 'exec-001' } as any);

      await tracker.initializeExecution('exec-001', 'aesop.self_exploration');

      expect(mockEsClient.indices.exists).toHaveBeenCalledWith({
        index: WORKFLOW_EXECUTIONS_INDEX,
      });
      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: WORKFLOW_EXECUTIONS_INDEX,
          id: 'exec-001',
          document: expect.objectContaining({
            execution_id: 'exec-001',
            workflow_name: 'aesop.self_exploration',
            status: 'running',
            current_phase: 1,
            current_step: 'Initializing...',
            completed_steps: 0,
            progress_percentage: 0,
            started_at: expect.any(String),
            updated_at: expect.any(String),
            phases: expect.arrayContaining([
              expect.objectContaining({
                phase_number: 1,
                phase_name: 'Schema Discovery',
                status: 'running',
              }),
              expect.objectContaining({
                phase_number: 2,
                phase_name: 'Data Profiling',
                status: 'pending',
              }),
            ]),
          }),
          refresh: 'wait_for',
        })
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Initialized execution: exec-001')
      );
    });

    it('should set total_steps to the sum of all phase expected_steps', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      mockEsClient.index.mockResolvedValue({} as any);

      await tracker.initializeExecution('exec-002', 'aesop.self_exploration');

      const indexCall = mockEsClient.index.mock.calls[0][0] as any;
      // 4 + 3 + 4 + 3 + 4 = 18
      expect(indexCall.document.total_steps).toBe(18);
    });

    it('should log and rethrow when indexing fails', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      const error = new Error('Index write blocked');
      mockEsClient.index.mockRejectedValue(error);

      await expect(
        tracker.initializeExecution('exec-003', 'aesop.self_exploration')
      ).rejects.toThrow('Index write blocked');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[WorkflowStateTracker] Failed to initialize execution')
      );
    });
  });

  describe('getExecutionState', () => {
    it('should return _source on success', async () => {
      const executionState = {
        execution_id: 'exec-010',
        workflow_name: 'aesop.self_exploration',
        status: 'running',
        current_phase: 2,
        current_step: 'Profiling data...',
        total_steps: 18,
        completed_steps: 4,
        progress_percentage: 22,
        estimated_time_remaining_ms: 600000,
        started_at: '2026-03-23T10:00:00.000Z',
        updated_at: '2026-03-23T10:05:00.000Z',
        phases: [],
      };

      mockEsClient.get.mockResolvedValue({
        _source: executionState,
        _id: 'exec-010',
      } as any);

      const result = await tracker.getExecutionState('exec-010');

      expect(mockEsClient.get).toHaveBeenCalledWith({
        index: WORKFLOW_EXECUTIONS_INDEX,
        id: 'exec-010',
      });
      expect(result).toEqual(executionState);
    });

    it('should return null when _source is undefined', async () => {
      mockEsClient.get.mockResolvedValue({
        _id: 'exec-011',
        _source: undefined,
      } as any);

      const result = await tracker.getExecutionState('exec-011');

      expect(result).toBeNull();
    });

    it('should return null on 404 error', async () => {
      const notFoundError = new Error('Not found') as any;
      notFoundError.meta = { statusCode: 404 };
      mockEsClient.get.mockRejectedValue(notFoundError);

      const result = await tracker.getExecutionState('nonexistent');

      expect(result).toBeNull();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should log and rethrow on non-404 errors', async () => {
      const error = new Error('Cluster unavailable') as any;
      error.meta = { statusCode: 503 };
      mockEsClient.get.mockRejectedValue(error);

      await expect(tracker.getExecutionState('exec-012')).rejects.toThrow('Cluster unavailable');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[WorkflowStateTracker] Failed to get execution state')
      );
    });
  });

  describe('completeExecution', () => {
    it('should update status to completed with 100% progress', async () => {
      mockEsClient.update.mockResolvedValue({} as any);

      await tracker.completeExecution('exec-020');

      expect(mockEsClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          index: WORKFLOW_EXECUTIONS_INDEX,
          id: 'exec-020',
          doc: expect.objectContaining({
            status: 'completed',
            progress_percentage: 100,
            estimated_time_remaining_ms: 0,
            completed_at: expect.any(String),
            updated_at: expect.any(String),
          }),
          refresh: 'wait_for',
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Completed execution: exec-020')
      );
    });

    it('should log error but not throw when update fails', async () => {
      mockEsClient.update.mockRejectedValue(new Error('Write timeout'));

      // completeExecution catches errors internally (no throw)
      await tracker.completeExecution('exec-021');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[WorkflowStateTracker] Failed to complete execution')
      );
    });
  });

  describe('failExecution', () => {
    it('should update status to failed and set error_message', async () => {
      const executionState = {
        execution_id: 'exec-030',
        status: 'running',
        phases: [
          { phase_number: 1, phase_name: 'Schema Discovery', status: 'completed' },
          { phase_number: 2, phase_name: 'Data Profiling', status: 'running' },
          { phase_number: 3, phase_name: 'Relationship Analysis', status: 'pending' },
        ],
        started_at: '2026-03-23T10:00:00.000Z',
        updated_at: '2026-03-23T10:05:00.000Z',
      };

      mockEsClient.get.mockResolvedValue({ _source: executionState } as any);
      mockEsClient.update.mockResolvedValue({} as any);

      await tracker.failExecution('exec-030', 'Agent context overflow');

      expect(mockEsClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          index: WORKFLOW_EXECUTIONS_INDEX,
          id: 'exec-030',
          doc: expect.objectContaining({
            status: 'failed',
            error_message: 'Agent context overflow',
            completed_at: expect.any(String),
            updated_at: expect.any(String),
            phases: expect.arrayContaining([
              expect.objectContaining({
                phase_number: 1,
                status: 'completed',
              }),
              expect.objectContaining({
                phase_number: 2,
                status: 'failed',
                completed_at: expect.any(String),
              }),
              expect.objectContaining({
                phase_number: 3,
                status: 'pending',
              }),
            ]),
          }),
          refresh: 'wait_for',
        })
      );
      // Implementation logs as template string: "[WorkflowStateTracker] Failed execution: {id} error={msg}"
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed execution: exec-030')
      );
    });

    it('should warn and return early when execution is not found', async () => {
      const notFoundError = new Error('Not found') as any;
      notFoundError.meta = { statusCode: 404 };
      mockEsClient.get.mockRejectedValue(notFoundError);

      await tracker.failExecution('nonexistent', 'some error');

      // Implementation logs as template string with no second arg
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WorkflowStateTracker] Execution not found, cannot fail it')
      );
      expect(mockEsClient.update).not.toHaveBeenCalled();
    });

    it('should log error but not throw when update fails', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          execution_id: 'exec-031',
          phases: [{ phase_number: 1, status: 'running' }],
          started_at: '2026-03-23T10:00:00.000Z',
        },
      } as any);
      mockEsClient.update.mockRejectedValue(new Error('Shard failure'));

      await tracker.failExecution('exec-031', 'Something broke');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[WorkflowStateTracker] Failed to mark execution as failed')
      );
    });
  });

  describe('updateProgress', () => {
    it('should update progress fields for the execution', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          execution_id: 'exec-040',
          started_at: '2026-03-23T10:00:00.000Z',
          phases: [
            { phase_number: 1, status: 'completed', duration_ms: 120000 },
            { phase_number: 2, status: 'running' },
          ],
        },
      } as any);
      mockEsClient.update.mockResolvedValue({} as any);

      await tracker.updateProgress('exec-040', 2, 'Profiling indices', 6, 35);

      expect(mockEsClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          index: WORKFLOW_EXECUTIONS_INDEX,
          id: 'exec-040',
          doc: expect.objectContaining({
            current_phase: 2,
            current_step: 'Profiling indices',
            completed_steps: 6,
            progress_percentage: 35,
            estimated_time_remaining_ms: expect.any(Number),
            updated_at: expect.any(String),
          }),
          refresh: 'wait_for',
        })
      );
    });

    it('should warn and return early when execution not found', async () => {
      const notFoundError = new Error('Not found') as any;
      notFoundError.meta = { statusCode: 404 };
      mockEsClient.get.mockRejectedValue(notFoundError);

      await tracker.updateProgress('nonexistent', 1, 'step', 1, 10);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          '[WorkflowStateTracker] Execution not found, cannot update progress'
        )
      );
      expect(mockEsClient.update).not.toHaveBeenCalled();
    });

    it('should log error but not throw when update fails', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          execution_id: 'exec-041',
          started_at: '2026-03-23T10:00:00.000Z',
          phases: [],
        },
      } as any);
      mockEsClient.update.mockRejectedValue(new Error('Timeout'));

      await tracker.updateProgress('exec-041', 1, 'step', 1, 10);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[WorkflowStateTracker] Failed to update progress')
      );
    });
  });

  describe('completePhase', () => {
    it('should mark the phase as completed and start the next phase', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          execution_id: 'exec-050',
          phases: [
            {
              phase_number: 1,
              phase_name: 'Schema Discovery',
              status: 'running',
              started_at: '2026-03-23T10:00:00.000Z',
            },
            { phase_number: 2, phase_name: 'Data Profiling', status: 'pending' },
            { phase_number: 3, phase_name: 'Relationship Analysis', status: 'pending' },
          ],
        },
      } as any);
      mockEsClient.update.mockResolvedValue({} as any);

      await tracker.completePhase('exec-050', 1, 115000);

      const updateCall = mockEsClient.update.mock.calls[0][0] as any;
      const phases = updateCall.doc.phases;

      expect(phases[0]).toEqual(
        expect.objectContaining({
          phase_number: 1,
          status: 'completed',
          duration_ms: 115000,
          completed_at: expect.any(String),
        })
      );
      expect(phases[1]).toEqual(
        expect.objectContaining({
          phase_number: 2,
          status: 'running',
          started_at: expect.any(String),
        })
      );
      expect(phases[2]).toEqual(
        expect.objectContaining({
          phase_number: 3,
          status: 'pending',
        })
      );
    });

    it('should warn and return early when execution not found', async () => {
      const notFoundError = new Error('Not found') as any;
      notFoundError.meta = { statusCode: 404 };
      mockEsClient.get.mockRejectedValue(notFoundError);

      await tracker.completePhase('nonexistent', 1, 100000);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WorkflowStateTracker] Execution not found, cannot complete phase')
      );
      expect(mockEsClient.update).not.toHaveBeenCalled();
    });
  });
});
