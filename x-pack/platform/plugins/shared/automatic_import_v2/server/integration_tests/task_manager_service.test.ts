/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SecurityServiceStart } from '@kbn/core/server';
import type { InternalCoreStart } from '@kbn/core-lifecycle-server-internal';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { AutomaticImportService } from '../services/automatic_import_service';
import type { AutomaticImportSavedObjectService } from '../services/saved_objects/saved_objects_service';
import { TaskManagerService } from '../services/task_manager';
import { TASK_STATUSES, INPUT_TYPES } from '../services/saved_objects/constants';
import { createMockSecurity } from './__mocks__/security';
import { httpServerMock } from '@kbn/core/server/mocks';
import { TaskManagerPlugin } from '@kbn/task-manager-plugin/server/plugin';
import type {
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';

const taskManagerSetupSpy = jest.spyOn(TaskManagerPlugin.prototype, 'setup');
const taskManagerStartSpy = jest.spyOn(TaskManagerPlugin.prototype, 'start');

describe('TaskManagerService Integration Tests', () => {
  let manageES: TestElasticsearchUtils;
  let kbnRoot: ReturnType<typeof createRootWithCorePlugins>;
  let esClient: ElasticsearchClient;
  let coreStart: InternalCoreStart;
  let mockSecurity: jest.Mocked<SecurityServiceStart>;

  let automaticImportService: AutomaticImportService;
  let savedObjectService: AutomaticImportSavedObjectService;
  let taskManagerService: TaskManagerService;
  let taskManagerSetup: TaskManagerSetupContract;
  let taskManagerStart: TaskManagerStartContract;

  beforeAll(async () => {
    try {
      const { startES } = createTestServers({
        adjustTimeout: jest.setTimeout,
      });
      manageES = await startES();
      kbnRoot = createRootWithCorePlugins({}, { oss: false });

      await kbnRoot.preboot();
      const coreSetup = await kbnRoot.setup();

      let resolveEsClient: (client: ElasticsearchClient) => void;
      const esClientPromise = new Promise<ElasticsearchClient>((resolve) => {
        resolveEsClient = resolve;
      });

      automaticImportService = new AutomaticImportService(
        kbnRoot.logger,
        esClientPromise,
        coreSetup.savedObjects
      );

      expect(taskManagerSetupSpy).toHaveBeenCalled();
      taskManagerSetup = taskManagerSetupSpy.mock.results[0].value;

      // Start Kibana to boot taskManager
      coreStart = await kbnRoot.start();

      expect(taskManagerStartSpy).toHaveBeenCalled();
      taskManagerStart = taskManagerStartSpy.mock.results[0].value;

      esClient = coreStart.elasticsearch.client.asInternalUser;
      resolveEsClient!(esClient);

      mockSecurity = createMockSecurity();

      await automaticImportService.initialize(mockSecurity, coreStart.savedObjects);
      savedObjectService = (automaticImportService as any).savedObjectService;

      // Initialize TaskManagerService
      taskManagerService = new TaskManagerService(kbnRoot.logger.get(), taskManagerSetup, {
        invokeDeepAgent: async (integrationId: string, dataStreamId: string) => {
          // Simulate AI workflow processing (long-running task)
          await new Promise((resolve) => setTimeout(resolve, 8000)); // 8 seconds processing

          // Update datastream status to completed
          const dataStream = await savedObjectService.getDataStream(dataStreamId);
          const currentVersion = dataStream.attributes.metadata?.version || '0.0.0';
          await savedObjectService.updateDataStream(
            {
              ...dataStream.attributes,
              job_info: {
                ...dataStream.attributes.job_info,
                status: TASK_STATUSES.completed,
              },
            },
            currentVersion
          );

          // Return mock result
          return {
            messages: [{ role: 'assistant', content: 'Test pipeline generated' }],
          };
        },
      });
      taskManagerService.initialize(taskManagerStart);
    } catch (error) {
      if (kbnRoot) {
        await kbnRoot.shutdown().catch(() => {});
      }
      if (manageES) {
        await manageES.stop().catch(() => {});
      }
      throw error;
    }
  });

  afterAll(async () => {
    if (automaticImportService) {
      automaticImportService.stop();
    }

    if (kbnRoot) {
      await kbnRoot.shutdown().catch(() => {});
    }

    if (manageES) {
      await manageES.stop().catch(() => {});
    }
  });

  describe('Service Initialization', () => {
    it('should initialize all three services correctly', () => {
      expect(automaticImportService).toBeDefined();
      expect(savedObjectService).toBeDefined();
      expect(taskManagerService).toBeDefined();
    });

    it('should have a working ES client connection', () => {
      expect(esClient).toBeDefined();
      expect(coreStart).toBeDefined();
    });

    it('should have registered saved object types', async () => {
      const savedObjectsClient = coreStart.savedObjects.createInternalRepository();
      expect(savedObjectsClient).toBeDefined();
    });

    it('should have registered task with TaskManager', () => {
      expect(taskManagerService).toBeDefined();
      expect(taskManagerSetup).toBeDefined();
      expect(taskManagerStart).toBeDefined();
    });
  });

  describe('AI Workflow Integration Test', () => {
    it('should create saved objects, schedule AI workflow, and track task status', async () => {
      const mockUser = {
        username: 'test-user',
        roles: ['admin'],
        profile_uid: 'test-profile-uid',
      } as any;

      const mockRequest = httpServerMock.createKibanaRequest();

      const integrationData = {
        integration_id: 'test-int-123',
        data_stream_count: 1,
        created_by: mockUser.username,
        status: TASK_STATUSES.pending,
        metadata: {
          title: 'AI Workflow Test Integration',
          description: 'Integration for testing AI workflow',
          created_at: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      const integrationSavedObject = await savedObjectService.insertIntegration(
        mockRequest,
        integrationData
      );

      expect(integrationSavedObject).toBeDefined();
      expect(integrationSavedObject.id).toBe('test-int-123');

      const taskParams = {
        integrationId: integrationSavedObject.id,
        dataStreamId: 'test-ds-456', // Use the ID we plan to create
      };

      const scheduledTask = await taskManagerService.scheduleAIWorkflowTask(taskParams);

      expect(scheduledTask).toBeDefined();
      expect(scheduledTask.taskId).toBeDefined();
      expect(scheduledTask.taskId.length).toBeLessThanOrEqual(50);

      // Create data stream with the task ID
      const initialDataStreamData = {
        integration_id: integrationSavedObject.id,
        data_stream_id: 'test-ds-456',
        created_by: mockUser.username,
        job_info: {
          job_id: scheduledTask.taskId, // Use the taskmanager id
          job_type: 'ai-workflow',
          status: TASK_STATUSES.pending,
        },
        metadata: {
          sample_count: 0,
          created_at: new Date().toISOString(),
          version: '0.0.0',
          input_type: INPUT_TYPES.filestream,
        },
        result: {},
      };

      const dataStreamSavedObject = await savedObjectService.insertDataStream(
        mockRequest,
        initialDataStreamData
      );

      expect(dataStreamSavedObject.id).toBe('test-ds-456');
      expect(dataStreamSavedObject.attributes?.job_info?.job_id).toBe(scheduledTask.taskId);
      expect(dataStreamSavedObject.attributes?.job_info?.status).toBe(TASK_STATUSES.pending);
      expect(dataStreamSavedObject.attributes?.metadata?.version).toBe('0.0.0');

      const task = await taskManagerService.getTaskStatus(scheduledTask.taskId);

      expect(task.task_status).toBe(TASK_STATUSES.pending);

      const currentVersion = dataStreamSavedObject.attributes.metadata?.version || '0.0.0';
      const completedDataStreamData = {
        integration_id: dataStreamSavedObject.attributes.integration_id,
        data_stream_id: dataStreamSavedObject.attributes.data_stream_id,
        created_by: dataStreamSavedObject.attributes.created_by,
        job_info: {
          job_id: scheduledTask.taskId,
          job_type: 'ai-workflow',
          status: TASK_STATUSES.completed,
        },
        metadata: {
          ...dataStreamSavedObject.attributes.metadata,
          sample_count: 3, // mock value
        },
        result: {
          ingest_pipeline: 'test-pipeline',
          field_mapping: { message: 'log.message' },
        },
      };

      const completedDataStream = await savedObjectService.updateDataStream(
        completedDataStreamData,
        currentVersion
      );

      expect(completedDataStream.attributes?.job_info?.status).toBe(TASK_STATUSES.completed);
      expect(completedDataStream.attributes?.metadata?.version).toBe('0.0.1'); // Version bumped once (from 0.0.0 to 0.0.1)

      // Verify we can retrieve both saved objects with their final state
      const finalIntegration = await savedObjectService.getIntegration(integrationSavedObject.id);
      const finalDataStream = await savedObjectService.getDataStream(dataStreamSavedObject.id);

      expect(finalIntegration.attributes.integration_id).toBe(integrationSavedObject.id);
      expect(finalDataStream.attributes.job_info.status).toBe(TASK_STATUSES.completed);
      expect(finalDataStream.attributes.job_info.job_id).toBe(scheduledTask.taskId);
      expect(finalDataStream.attributes.result?.ingest_pipeline).toBe('test-pipeline');

      // Step 7: Clean up - delete in reverse order
      await savedObjectService.deleteDataStream(dataStreamSavedObject.id);
      await savedObjectService.deleteIntegration(integrationSavedObject.id);
      await expect(savedObjectService.getDataStream(dataStreamSavedObject.id)).rejects.toThrow();
    });

    it('should schedule and track 5 concurrent unique AI workflow tasks', async () => {
      const mockUser = {
        username: 'test-user-concurrent',
        roles: ['admin'],
        profile_uid: 'test-profile-uid-concurrent',
      } as any;

      const mockRequest = httpServerMock.createKibanaRequest();
      const numConcurrentTasks = 5;
      const createdObjects: Array<{
        integration: any;
        dataStream: any;
        taskId: string;
      }> = [];

      try {
        // Schedule 5 concurrent AI workflow tasks
        for (let i = 0; i < numConcurrentTasks; i++) {
          const integrationId = `concurrent-int-${i}`;
          const dataStreamId = `concurrent-ds-${i}`;

          // Create integration
          const integrationData = {
            integration_id: integrationId,
            data_stream_count: 1,
            created_by: mockUser.username,
            status: TASK_STATUSES.pending,
            metadata: {
              title: `Concurrent AI Workflow Test ${i}`,
              description: `Testing concurrent execution capability`,
              created_at: new Date().toISOString(),
              version: '1.0.0',
            },
          };

          const integration = await savedObjectService.insertIntegration(
            mockRequest,
            integrationData
          );

          // Schedule AI workflow task
          const taskParams = {
            integrationId: integration.id,
            dataStreamId,
          };

          const scheduledTask = await taskManagerService.scheduleAIWorkflowTask(taskParams);

          // Create data stream with task reference
          const dataStreamData = {
            integration_id: integration.id,
            data_stream_id: dataStreamId,
            created_by: mockUser.username,
            job_info: {
              job_id: scheduledTask.taskId,
              job_type: 'ai-workflow',
              status: TASK_STATUSES.pending,
            },
            metadata: {
              sample_count: 0,
              created_at: new Date().toISOString(),
              version: '0.0.0',
              input_type: INPUT_TYPES.filestream,
            },
            result: {},
          };

          const dataStream = await savedObjectService.insertDataStream(mockRequest, dataStreamData);

          createdObjects.push({
            integration,
            dataStream,
            taskId: scheduledTask.taskId,
          });
        }

        // Verify all 5 tasks were scheduled successfully
        expect(createdObjects).toHaveLength(numConcurrentTasks);

        const taskIds = createdObjects.map((obj) => obj.taskId);
        const uniqueTaskIds = new Set(taskIds);
        expect(uniqueTaskIds.size).toBe(numConcurrentTasks);

        // Try to schedule a task with the same integrationId and dataStreamId as the first one
        const firstObject = createdObjects[0];
        const duplicateTaskParams = {
          integrationId: firstObject.integration.id,
          dataStreamId: firstObject.dataStream.attributes.data_stream_id,
        };

        const duplicateTaskResponse = await taskManagerService.scheduleAIWorkflowTask(
          duplicateTaskParams
        );

        // Should return the same task ID as the existing one
        expect(duplicateTaskResponse.taskId).toBe(firstObject.taskId);

        // Verify that no new task was created - the task count should remain the same
        const allTaskIds = createdObjects.map((obj) => obj.taskId);
        const uniqueTaskIdsBeforeTrigger = new Set(allTaskIds);
        expect(uniqueTaskIdsBeforeTrigger.size).toBe(numConcurrentTasks);

        // Trigger all tasks to run concurrently using Promise.all
        // Note: We don't check initial "pending" status because TaskManager may auto-claim tasks
        await Promise.all(
          createdObjects.map(async (obj) => {
            try {
              await taskManagerStart.runSoon(obj.taskId);
            } catch (error) {
              // Ignore errors if task is already running or has completed (not found)
              if (
                !error.message.includes('currently running') &&
                !error.message.includes('not found')
              ) {
                throw error;
              }
            }
          })
        );

        // Poll TaskManager to verify multiple tasks are running concurrently
        // Check every second for up to 10 seconds
        let maxConcurrentRunning = 0;
        const pollInterval = 1000; // 1 second
        const maxPollTime = 10000; // 10 seconds
        const pollStartTime = Date.now();

        while (Date.now() - pollStartTime < maxPollTime) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));

          // Count how many tasks are currently in "running" status
          const statuses = await Promise.all(
            createdObjects.map(async (obj) => {
              try {
                const task = await taskManagerStart.get(obj.taskId);
                return task.status;
              } catch {
                return null;
              }
            })
          );

          const runningCount = statuses.filter((status) => status === 'running').length;
          maxConcurrentRunning = Math.max(maxConcurrentRunning, runningCount);

          // If we've seen at least 2 tasks running simultaneously, we've proven concurrency
          if (maxConcurrentRunning >= 2) {
            break;
          }
        }

        // Verify that at least 2 tasks ran concurrently (proves parallel execution)
        expect(maxConcurrentRunning).toBeGreaterThanOrEqual(2);

        // Wait for all tasks to complete (they run for 8 seconds each)
        // The task runner will automatically update datastream status to 'completed' when done
        await new Promise((resolve) => setTimeout(resolve, 12000)); // Wait 12 seconds

        // Verify all datastreams now show completed status (updated by the tasks themselves)
        for (const obj of createdObjects) {
          const retrievedDataStream = await savedObjectService.getDataStream(obj.dataStream.id);
          expect(retrievedDataStream.attributes.job_info.status).toBe(TASK_STATUSES.completed);
          expect(retrievedDataStream.attributes.job_info.job_id).toBe(obj.taskId);
          expect(retrievedDataStream.attributes.integration_id).toBe(obj.integration.id);
        }

        // This test verifies that TaskManager's cost-based concurrency model allows
        // multiple AI workflows to execute concurrently. With TaskCost.Normal (2)
        // and capacity=50, the system can handle up to ~25 concurrent workflows.
        // Concurrency is verified by polling TaskManager and confirming multiple tasks
        // are in "running" status simultaneously (not sequential execution).
        // Tasks automatically update their datastream job_info.status to completed when done.
      } finally {
        // Clean up all created objects (data streams first, then integrations)
        for (const obj of createdObjects) {
          await savedObjectService.deleteDataStream(obj.dataStream.id).catch(() => {});
          await savedObjectService.deleteIntegration(obj.integration.id).catch(() => {});
        }
      }
    }, 120000);
  });
});
