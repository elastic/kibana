/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { createCoreSetupMock } from '@kbn/core-lifecycle-browser-mocks/src/core_setup.mock';
import { AutomaticImportService } from './automatic_import_service';
import type { SavedObjectsServiceSetup, SavedObjectsClient } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

// Mock the AutomaticImportSamplesIndexService
jest.mock('./samples_index/index_service', () => {
  return {
    AutomaticImportSamplesIndexService: jest.fn().mockImplementation(() => ({
      createSamplesDocs: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('AutomaticImportSetupService', () => {
  let service: AutomaticImportService;
  let mockLoggerFactory: ReturnType<typeof loggerMock.create>;
  let mockSavedObjectsSetup: jest.Mocked<SavedObjectsServiceSetup>;
  let mockSavedObjectsClient: SavedObjectsClient;
  let mockTaskManagerSetup: jest.Mocked<TaskManagerSetupContract>;
  let mockTaskManagerStart: jest.Mocked<TaskManagerStartContract>;
  let mockCoreSetup: ReturnType<typeof createCoreSetupMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoggerFactory = loggerMock.create();
    mockSavedObjectsSetup = savedObjectsServiceMock.createSetupContract();
    mockSavedObjectsClient = savedObjectsClientMock.create() as unknown as SavedObjectsClient;
    mockCoreSetup = createCoreSetupMock();

    // Mock TaskManager contracts
    mockTaskManagerSetup = {
      registerTaskDefinitions: jest.fn(),
    } as unknown as jest.Mocked<TaskManagerSetupContract>;

    mockTaskManagerStart = {
      schedule: jest.fn(),
      runSoon: jest.fn(),
      get: jest.fn(),
      ensureScheduled: jest.fn(),
    } as unknown as jest.Mocked<TaskManagerStartContract>;

    service = new AutomaticImportService(
      mockLoggerFactory,
      mockSavedObjectsSetup,
      mockTaskManagerSetup,
      mockCoreSetup as any
    );
  });

  describe('constructor', () => {
    it('should initialize the AutomaticImportSamplesIndexService with correct parameters', () => {
      const { AutomaticImportSamplesIndexService: MockedService } = jest.requireMock(
        './samples_index/index_service'
      );

      expect(MockedService).toHaveBeenCalledWith(mockLoggerFactory);
    });

    it('should initialize the pluginStop$ subject', () => {
      expect((service as any).pluginStop$).toBeDefined();
      expect((service as any).pluginStop$.subscribe).toBeDefined();
    });

    it('should register saved object types during construction', () => {
      expect(mockSavedObjectsSetup.registerType).toHaveBeenCalledTimes(2);
      expect(mockSavedObjectsSetup.registerType).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'integration-config' })
      );
      expect(mockSavedObjectsSetup.registerType).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'data_stream-config' })
      );
    });

    it('should store the savedObjectsServiceSetup reference', () => {
      expect((service as any).savedObjectsServiceSetup).toBe(mockSavedObjectsSetup);
    });
  });

  describe('initialize', () => {
    it('should initialize saved object service', async () => {
      await service.initialize(mockSavedObjectsClient, mockTaskManagerStart);

      expect((service as any).savedObjectService).toBeDefined();
    });

    it('should create savedObjectService with correct parameters', async () => {
      await service.initialize(mockSavedObjectsClient, mockTaskManagerStart);

      const savedObjectService = (service as any).savedObjectService;
      expect(savedObjectService).toBeDefined();
    });
  });

  describe('methods before initialization', () => {
    it('should throw error when calling createIntegration before initialize', async () => {
      await expect(service.createIntegration({} as any)).rejects.toThrow(
        'Saved Objects service not initialized.'
      );
    });

    it('should throw error when calling getIntegrationById before initialize', async () => {
      await expect(service.getIntegrationById('test-id')).rejects.toThrow(
        'Saved Objects service not initialized.'
      );
    });
  });

  describe('stop', () => {
    it('should complete the pluginStop$ subject', () => {
      const pluginStop$ = (service as any).pluginStop$;
      const nextSpy = jest.spyOn(pluginStop$, 'next');
      const completeSpy = jest.spyOn(pluginStop$, 'complete');

      service.stop();

      expect(nextSpy).toHaveBeenCalledTimes(1);
      expect(nextSpy).toHaveBeenCalledWith();
      expect(completeSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit to all subscribers before completing', (done) => {
      const pluginStop$ = (service as any).pluginStop$;
      let emittedValue: any;
      let completed = false;

      pluginStop$.subscribe({
        next: (value: any) => {
          emittedValue = value;
        },
        complete: () => {
          completed = true;
          expect(emittedValue).toBeUndefined();
          expect(completed).toBe(true);
          done();
        },
      });

      service.stop();
    });

    it('should be safe to call multiple times', () => {
      const pluginStop$ = (service as any).pluginStop$;
      const nextSpy = jest.spyOn(pluginStop$, 'next');
      const completeSpy = jest.spyOn(pluginStop$, 'complete');

      service.stop();
      service.stop();

      // RxJS subjects are safe to complete multiple times
      expect(nextSpy).toHaveBeenCalledTimes(2);
      expect(completeSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('addSamplesToDataStream', () => {
    it('should delegate to samplesIndexService.addSamplesToDataStream', async () => {
      const mockParams = {
        integrationId: 'integration-123',
        dataStreamId: 'data-stream-456',
        rawSamples: ['sample1', 'sample2'],
        originalSource: { sourceType: 'file' as const, sourceValue: 'test.log' },
        authenticatedUser: { username: 'test-user' } as any,
        esClient: {} as any,
      };

      const mockResult = { items: [], errors: false };
      const mockAddSamples = jest.fn().mockResolvedValue(mockResult);

      (service as any).samplesIndexService = {
        addSamplesToDataStream: mockAddSamples,
      };

      const result = await service.addSamplesToDataStream(mockParams);

      expect(mockAddSamples).toHaveBeenCalledWith(mockParams);
      expect(result).toBe(mockResult);
    });

    it('should work without initializing savedObjectService', async () => {
      const mockParams = {
        integrationId: 'integration-123',
        dataStreamId: 'data-stream-456',
        rawSamples: ['sample1'],
        originalSource: { sourceType: 'index' as const, sourceValue: 'logs-*' },
        authenticatedUser: { username: 'test-user' } as any,
        esClient: {} as any,
      };

      const mockResult = { items: [], errors: false };
      const mockAddSamples = jest.fn().mockResolvedValue(mockResult);

      (service as any).samplesIndexService = {
        addSamplesToDataStream: mockAddSamples,
      };

      // Service is not initialized, but this should still work
      expect((service as any).savedObjectService).toBeNull();

      const result = await service.addSamplesToDataStream(mockParams);

      expect(mockAddSamples).toHaveBeenCalledWith(mockParams);
      expect(result).toBe(mockResult);
    });

    it('should pass through all parameters correctly', async () => {
      const mockParams = {
        integrationId: 'test-integration',
        dataStreamId: 'test-datastream',
        rawSamples: ['log line 1', 'log line 2', 'log line 3'],
        originalSource: { sourceType: 'file' as const, sourceValue: 'application.log' },
        authenticatedUser: { username: 'admin', roles: ['admin'] } as any,
        esClient: { bulk: jest.fn() } as any,
      };

      const mockAddSamples = jest.fn().mockResolvedValue({});

      (service as any).samplesIndexService = {
        addSamplesToDataStream: mockAddSamples,
      };

      await service.addSamplesToDataStream(mockParams);

      expect(mockAddSamples).toHaveBeenCalledTimes(1);
      const callArgs = mockAddSamples.mock.calls[0][0];
      expect(callArgs.integrationId).toBe('test-integration');
      expect(callArgs.dataStreamId).toBe('test-datastream');
      expect(callArgs.rawSamples).toEqual(['log line 1', 'log line 2', 'log line 3']);
      expect(callArgs.originalSource).toEqual({
        sourceType: 'file',
        sourceValue: 'application.log',
      });
      expect(callArgs.authenticatedUser.username).toBe('admin');
      expect(callArgs.esClient).toBe(mockParams.esClient);
    });

    it('should propagate errors from samplesIndexService', async () => {
      const mockParams = {
        integrationId: 'integration-123',
        dataStreamId: 'data-stream-456',
        rawSamples: ['sample1'],
        originalSource: { sourceType: 'file' as const, sourceValue: 'test.log' },
        authenticatedUser: { username: 'test-user' } as any,
        esClient: {} as any,
      };

      const mockError = new Error('Failed to add samples');
      const mockAddSamples = jest.fn().mockRejectedValue(mockError);

      (service as any).samplesIndexService = {
        addSamplesToDataStream: mockAddSamples,
      };

      await expect(service.addSamplesToDataStream(mockParams)).rejects.toThrow(
        'Failed to add samples'
      );
    });
  });

  describe('deleteDataStream', () => {
    let mockEsClient: any;

    beforeEach(async () => {
      await service.initialize(mockSavedObjectsClient, mockTaskManagerStart);
      mockEsClient = {} as any;
    });

    it('should delete data stream and call all required services', async () => {
      const mockDeleteSamples = jest.fn().mockResolvedValue({ deleted: 5 });
      const mockRemoveTask = jest.fn().mockResolvedValue(undefined);
      const mockDeleteSavedObject = jest.fn().mockResolvedValue(undefined);

      (service as any).samplesIndexService = {
        deleteSamplesForDataStream: mockDeleteSamples,
      };
      (service as any).taskManagerService = {
        removeDataStreamCreationTask: mockRemoveTask,
      };
      (service as any).savedObjectService = {
        deleteDataStream: mockDeleteSavedObject,
      };

      await service.deleteDataStream('integration-123', 'data-stream-456', mockEsClient);

      expect(mockRemoveTask).toHaveBeenCalledWith({
        integrationId: 'integration-123',
        dataStreamId: 'data-stream-456',
      });
      expect(mockDeleteSamples).toHaveBeenCalledWith(
        'integration-123',
        'data-stream-456',
        mockEsClient
      );
      expect(mockDeleteSavedObject).toHaveBeenCalledWith(
        'integration-123',
        'data-stream-456',
        undefined
      );
    });

    it('should pass options to saved object service delete', async () => {
      const mockDeleteSamples = jest.fn().mockResolvedValue({ deleted: 0 });
      const mockRemoveTask = jest.fn().mockResolvedValue(undefined);
      const mockDeleteSavedObject = jest.fn().mockResolvedValue(undefined);
      const options = { force: true };

      (service as any).samplesIndexService = {
        deleteSamplesForDataStream: mockDeleteSamples,
      };
      (service as any).taskManagerService = {
        removeDataStreamCreationTask: mockRemoveTask,
      };
      (service as any).savedObjectService = {
        deleteDataStream: mockDeleteSavedObject,
      };

      await service.deleteDataStream('integration-123', 'data-stream-456', mockEsClient, options);

      expect(mockDeleteSavedObject).toHaveBeenCalledWith(
        'integration-123',
        'data-stream-456',
        options
      );
    });

    it('should throw error if saved object service is not initialized', async () => {
      (service as any).savedObjectService = null;

      await expect(
        service.deleteDataStream('integration-123', 'data-stream-456', mockEsClient)
      ).rejects.toThrow('Saved Objects service not initialized.');
    });

    it('should handle errors from task manager service', async () => {
      const mockDeleteSamples = jest.fn().mockResolvedValue({ deleted: 0 });
      const mockRemoveTask = jest.fn().mockRejectedValue(new Error('Task removal failed'));
      const mockDeleteSavedObject = jest.fn();

      (service as any).samplesIndexService = {
        deleteSamplesForDataStream: mockDeleteSamples,
      };
      (service as any).taskManagerService = {
        removeDataStreamCreationTask: mockRemoveTask,
      };
      (service as any).savedObjectService = {
        deleteDataStream: mockDeleteSavedObject,
      };

      await expect(
        service.deleteDataStream('integration-123', 'data-stream-456', mockEsClient)
      ).rejects.toThrow('Task removal failed');

      expect(mockDeleteSamples).not.toHaveBeenCalled();
      expect(mockDeleteSavedObject).not.toHaveBeenCalled();
    });

    it('should handle errors from samples index service', async () => {
      const mockDeleteSamples = jest.fn().mockRejectedValue(new Error('Sample deletion failed'));
      const mockRemoveTask = jest.fn().mockResolvedValue(undefined);
      const mockDeleteSavedObject = jest.fn();

      (service as any).samplesIndexService = {
        deleteSamplesForDataStream: mockDeleteSamples,
      };
      (service as any).taskManagerService = {
        removeDataStreamCreationTask: mockRemoveTask,
      };
      (service as any).savedObjectService = {
        deleteDataStream: mockDeleteSavedObject,
      };

      await expect(
        service.deleteDataStream('integration-123', 'data-stream-456', mockEsClient)
      ).rejects.toThrow('Sample deletion failed');

      expect(mockDeleteSavedObject).not.toHaveBeenCalled();
    });

    it('should handle errors from saved object service', async () => {
      const mockDeleteSamples = jest.fn().mockResolvedValue({ deleted: 0 });
      const mockRemoveTask = jest.fn().mockResolvedValue(undefined);
      const mockDeleteSavedObject = jest
        .fn()
        .mockRejectedValue(new Error('Saved object deletion failed'));

      (service as any).samplesIndexService = {
        deleteSamplesForDataStream: mockDeleteSamples,
      };
      (service as any).taskManagerService = {
        removeDataStreamCreationTask: mockRemoveTask,
      };
      (service as any).savedObjectService = {
        deleteDataStream: mockDeleteSavedObject,
      };

      await expect(
        service.deleteDataStream('integration-123', 'data-stream-456', mockEsClient)
      ).rejects.toThrow('Saved object deletion failed');
    });

    it('should execute operations in correct order', async () => {
      const executionOrder: string[] = [];
      const mockDeleteSamples = jest.fn().mockImplementation(async () => {
        executionOrder.push('deleteSamples');
        return { deleted: 0 };
      });
      const mockRemoveTask = jest.fn().mockImplementation(async () => {
        executionOrder.push('removeTask');
      });
      const mockDeleteSavedObject = jest.fn().mockImplementation(async () => {
        executionOrder.push('deleteSavedObject');
      });

      (service as any).samplesIndexService = {
        deleteSamplesForDataStream: mockDeleteSamples,
      };
      (service as any).taskManagerService = {
        removeDataStreamCreationTask: mockRemoveTask,
      };
      (service as any).savedObjectService = {
        deleteDataStream: mockDeleteSavedObject,
      };

      await service.deleteDataStream('integration-123', 'data-stream-456', mockEsClient);

      expect(executionOrder).toEqual(['removeTask', 'deleteSamples', 'deleteSavedObject']);
    });
  });

  describe('integration', () => {
    it('should properly initialize and setup the service', async () => {
      const { AutomaticImportSamplesIndexService: MockedService } = jest.requireMock(
        './samples_index/index_service'
      );

      // Verify constructor was called
      expect(MockedService).toHaveBeenCalledWith(mockLoggerFactory);

      expect(mockSavedObjectsSetup.registerType).toHaveBeenCalledTimes(2);
      await service.initialize(mockSavedObjectsClient, mockTaskManagerStart);

      // Stop the service
      service.stop();

      // Verify pluginStop$ was completed
      expect((service as any).pluginStop$.isStopped).toBeTruthy();
    });

    it('should maintain the same pluginStop$ instance throughout lifecycle', () => {
      const pluginStop$Before = (service as any).pluginStop$;
      const pluginStop$After = (service as any).pluginStop$;

      expect(pluginStop$Before).toBe(pluginStop$After);
    });

    it('should initialize samples index service with logger factory only', () => {
      const { AutomaticImportSamplesIndexService: MockedService } = jest.requireMock(
        './samples_index/index_service'
      );

      const constructorCall = MockedService.mock.calls[0];
      expect(constructorCall[0]).toBe(mockLoggerFactory);
      expect(constructorCall).toHaveLength(1); // Only one parameter now
    });

    it('should complete full lifecycle: construct -> initialize -> stop', async () => {
      expect((service as any).savedObjectService).toBeNull();

      await service.initialize(mockSavedObjectsClient, mockTaskManagerStart);
      expect((service as any).savedObjectService).toBeDefined();

      // Stop
      service.stop();
      expect((service as any).pluginStop$.isStopped).toBeTruthy();
    });
  });

  describe('task manager service integration', () => {
    beforeEach(async () => {
      await service.initialize(mockSavedObjectsClient, mockTaskManagerStart);
    });

    it('should register task definitions during construction', () => {
      expect(mockTaskManagerSetup.registerTaskDefinitions).toHaveBeenCalledTimes(1);
      const registeredTasks = mockTaskManagerSetup.registerTaskDefinitions.mock.calls[0][0];
      expect(registeredTasks).toHaveProperty('autoImport-dataStream-task');
      expect(registeredTasks['autoImport-dataStream-task']).toMatchObject({
        title: 'Data Stream generation workflow',
        description: 'Executes long-running AI agent workflows for data stream generation',
      });
    });

    it('should initialize task manager service with saved object service', () => {
      const taskManagerService = (service as any).taskManagerService;
      expect(taskManagerService).toBeDefined();
      expect((taskManagerService as any).automaticImportSavedObjectService).toBe(
        (service as any).savedObjectService
      );
    });

    it('should have task runner that updates SavedObjects when run', async () => {
      const mockUpdateDataStream = jest.fn().mockResolvedValue(undefined);
      const mockGetDataStream = jest.fn().mockResolvedValue({
        attributes: {
          data_stream_id: 'test-datastream',
          integration_id: 'test-integration',
          job_info: { status: 'pending', jobId: 'task-123', jobType: 'autoImport-dataStream-task' },
        },
      });

      // Mock the saved object service methods
      (service as any).savedObjectService = {
        updateDataStreamSavedObjectAttributes: mockUpdateDataStream,
        getDataStream: mockGetDataStream,
      };

      // Re-initialize to set the mocked service
      const taskManagerService = (service as any).taskManagerService;
      (taskManagerService as any).automaticImportSavedObjectService = (
        service as any
      ).savedObjectService;

      // Extract the task runner from registered definitions
      const registeredTasks = mockTaskManagerSetup.registerTaskDefinitions.mock.calls[0][0];
      const taskDefinition = registeredTasks['autoImport-dataStream-task'];
      const createTaskRunner = taskDefinition.createTaskRunner;

      // Mock task instance
      const mockTaskInstance = {
        id: 'test-task-id',
        params: {
          integrationId: 'test-integration',
          dataStreamId: 'test-datastream',
          connectorId: 'test-connector',
          authHeaders: {},
        },
        state: { task_status: 'pending' },
      };

      // Mock core setup and plugins
      const mockCoreStart = {
        elasticsearch: {
          client: {
            asScoped: jest.fn().mockReturnValue({
              asCurrentUser: {},
            }),
          },
        },
      };

      const mockPluginsStart = {
        inference: {
          getChatModel: jest.fn().mockResolvedValue({}),
        },
      };

      const coreSetupMock = {
        getStartServices: jest.fn().mockResolvedValue([mockCoreStart, mockPluginsStart]),
      };

      // Mock agent service
      const mockInvokeAgent = jest.fn().mockResolvedValue({
        current_pipeline: { processors: [] },
        pipeline_generation_results: { docs: [] },
      });

      (taskManagerService as any).agentService = {
        invokeAutomaticImportAgent: mockInvokeAgent,
      };

      // Create task runner
      const taskRunner = createTaskRunner({
        taskInstance: mockTaskInstance as any,
        fakeRequest: {} as any,
        abortController: new AbortController(),
      });

      // Replace runTask to inject our mock core setup
      const originalRunTask = (taskManagerService as any).runTask;
      (taskManagerService as any).runTask = jest
        .fn()
        .mockImplementation(async (taskInstance, core, savedObjectService) => {
          // Call the original runTask but with our mocked core setup
          return originalRunTask.call(
            taskManagerService,
            taskInstance,
            coreSetupMock,
            savedObjectService
          );
        });

      // Run the task
      await taskRunner.run();

      // Verify that updateDataStreamSavedObjectAttributes was called
      expect(mockUpdateDataStream).toHaveBeenCalledTimes(1);
      expect(mockUpdateDataStream).toHaveBeenCalledWith({
        integrationId: 'test-integration',
        dataStreamId: 'test-datastream',
        ingestPipeline: expect.any(String),
        status: 'completed',
      });
    });

    it('should handle errors during task execution and not update SavedObject', async () => {
      const mockUpdateDataStream = jest.fn();
      const mockGetDataStream = jest.fn().mockResolvedValue({
        attributes: {
          data_stream_id: 'test-datastream',
          integration_id: 'test-integration',
          job_info: { status: 'pending', jobId: 'task-123', jobType: 'autoImport-dataStream-task' },
        },
      });

      const mockSavedObjectService = {
        updateDataStreamSavedObjectAttributes: mockUpdateDataStream,
        getDataStream: mockGetDataStream,
      };

      const taskManagerService = (service as any).taskManagerService;
      (taskManagerService as any).automaticImportSavedObjectService = mockSavedObjectService;

      const registeredTasks = mockTaskManagerSetup.registerTaskDefinitions.mock.calls[0][0];
      const taskDefinition = registeredTasks['autoImport-dataStream-task'];
      const createTaskRunner = taskDefinition.createTaskRunner;

      const mockTaskInstance = {
        id: 'test-task-id',
        params: {
          integrationId: 'test-integration',
          dataStreamId: 'test-datastream',
          connectorId: 'test-connector',
        },
        state: { task_status: 'pending' },
      };

      // Mock core setup and plugins to simulate error
      const mockCoreStart = {
        elasticsearch: {
          client: {
            asScoped: jest.fn().mockReturnValue({
              asCurrentUser: {},
            }),
          },
        },
      };

      const mockPluginsStart = {
        inference: {
          getChatModel: jest.fn().mockRejectedValue(new Error('Agent invocation failed')),
        },
      };

      const coreSetupMock = {
        getStartServices: jest.fn().mockResolvedValue([mockCoreStart, mockPluginsStart]),
      };

      (taskManagerService as any).agentService = {
        invokeAutomaticImportAgent: jest.fn(),
      };

      const taskRunner = createTaskRunner({
        taskInstance: mockTaskInstance as any,
        fakeRequest: {} as any,
        abortController: new AbortController(),
      });

      const originalRunTask = (taskManagerService as any).runTask;
      (taskManagerService as any).runTask = jest
        .fn()
        .mockImplementation(async (taskInstance, core, savedObjectService) => {
          return originalRunTask.call(
            taskManagerService,
            taskInstance,
            coreSetupMock,
            savedObjectService
          );
        });

      const result = (await taskRunner.run()) as any;

      // Verify that updateDataStreamSavedObjectAttributes was NOT called on error
      expect(mockUpdateDataStream).not.toHaveBeenCalled();
      expect(result.state.task_status).toBe('failed');
      expect(result.error).toBeDefined();
    });
  });
});
