/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { BulkDeleteTask, TYPE, type BulkDeleteTaskState } from './bulk_delete_task';
import { DATA_SOURCE_SAVED_OBJECT_TYPE } from '../saved_objects';
import { deleteDataSourceAndRelatedResources } from '../routes/data_sources_helpers';
import { createToolRegistryMock } from '@kbn/agent-builder-plugin/server/test_utils/tools';

jest.mock('../routes/data_sources_helpers', () => ({
  deleteDataSourceAndRelatedResources: jest.fn(),
}));

const mockDeleteDataSourceAndRelatedResources =
  deleteDataSourceAndRelatedResources as jest.MockedFunction<
    typeof deleteDataSourceAndRelatedResources
  >;

describe('BulkDeleteTask', () => {
  const mockLogger = loggerMock.create();
  const mockLogFactory = {
    get: jest.fn().mockReturnValue(mockLogger),
  };
  const mockSavedObjectsClient = savedObjectsClientMock.create();
  const mockActionsClient = {
    delete: jest.fn(),
    get: jest.fn(),
  };
  const mockToolRegistry = createToolRegistryMock();
  const mockWorkflowManagement = {
    management: {
      deleteWorkflows: jest.fn(),
    },
  };

  const createMockDataSource = (
    id: string,
    name: string,
    type: string,
    workflowIds: string[] = [],
    toolIds: string[] = [],
    kscIds: string[] = []
  ) => ({
    id,
    type: DATA_SOURCE_SAVED_OBJECT_TYPE,
    attributes: {
      name,
      type,
      config: {},
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      workflowIds,
      toolIds,
      kscIds,
    },
    references: [],
  });

  const createMockCoreSetup = () => {
    const mockCoreStart = {
      savedObjects: {
        getScopedClient: jest.fn().mockReturnValue(mockSavedObjectsClient),
      },
    };

    const mockPluginStart = {
      actions: {
        getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
      },
      agentBuilder: {
        tools: {
          getRegistry: jest.fn().mockResolvedValue(mockToolRegistry),
        },
      },
    };

    const mockCoreSetup = {
      getStartServices: jest.fn().mockResolvedValue([mockCoreStart, mockPluginStart]),
    };

    return { mockCoreSetup, mockCoreStart, mockPluginStart };
  };

  const createMockPlugins = () => {
    return {
      taskManager: {
        setup: {
          registerTaskDefinitions: jest.fn(),
        },
      },
      workflowsManagement: {
        setup: mockWorkflowManagement,
      },
    } as any;
  };

  const createMockPointInTimeFinder = (dataSources: any[]) => {
    const mockFinder = {
      find: jest.fn().mockImplementation(async function* () {
        yield {
          saved_objects: dataSources,
          total: dataSources.length,
          page: 1,
          per_page: 100,
        };
      }),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockSavedObjectsClient.createPointInTimeFinder = jest
      .fn()
      .mockReturnValue(mockFinder as any);

    return mockFinder;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSavedObjectsClient.getCurrentNamespace = jest.fn().mockReturnValue('default');
  });

  describe('task registration', () => {
    it('should register task definition with correct configuration', () => {
      const { mockCoreSetup } = createMockCoreSetup();
      const mockPlugins = createMockPlugins();

      new BulkDeleteTask({
        core: mockCoreSetup as any,
        logFactory: mockLogFactory as any,
        plugins: mockPlugins,
      });

      expect(mockPlugins.taskManager.setup.registerTaskDefinitions).toHaveBeenCalledWith({
        [TYPE]: expect.objectContaining({
          title: 'Data sources bulk delete',
          timeout: '30m',
          maxAttempts: 1,
          createTaskRunner: expect.any(Function),
        }),
      });
    });
  });

  describe('task execution', () => {
    let taskRunner: any;
    let mockTaskInstance: any;
    let mockFakeRequest: any;

    const setupTaskRunner = (initialState?: Partial<BulkDeleteTaskState>) => {
      const { mockCoreSetup } = createMockCoreSetup();
      const mockPlugins = createMockPlugins();

      new BulkDeleteTask({
        core: mockCoreSetup as any,
        logFactory: mockLogFactory as any,
        plugins: mockPlugins,
      });

      const registerCall = (
        mockPlugins.taskManager.setup.registerTaskDefinitions as jest.Mock
      ).mock.calls[0][0];
      const createTaskRunner = registerCall[TYPE].createTaskRunner;

      mockTaskInstance = {
        id: 'test-task-id',
        state: initialState || { isDone: false, deletedCount: 0, errors: [] },
      };

      mockFakeRequest = httpServerMock.createKibanaRequest();

      taskRunner = createTaskRunner({
        taskInstance: mockTaskInstance,
        fakeRequest: mockFakeRequest,
        abortController: new AbortController(),
      });

      return { mockCoreSetup, mockPlugins };
    };

    describe('full deletion success', () => {
      it('should delete all resources when all deletions succeed', async () => {
        const dataSource1 = createMockDataSource('ds-1', 'Source 1', 'github', [
          'workflow-1',
        ], ['tool-1'], ['ksc-1']);
        const dataSource2 = createMockDataSource('ds-2', 'Source 2', 'notion', [
          'workflow-2',
        ], ['tool-2'], ['ksc-2']);

        createMockPointInTimeFinder([dataSource1, dataSource2]);
        setupTaskRunner();

        mockDeleteDataSourceAndRelatedResources
          .mockResolvedValueOnce({
            success: true,
            fullyDeleted: true,
          })
          .mockResolvedValueOnce({
            success: true,
            fullyDeleted: true,
          });

        const result = await taskRunner.run();

        expect(mockDeleteDataSourceAndRelatedResources).toHaveBeenCalledTimes(2);
        expect(mockDeleteDataSourceAndRelatedResources).toHaveBeenCalledWith({
          dataSource: dataSource1,
          savedObjectsClient: mockSavedObjectsClient,
          actionsClient: mockActionsClient,
          toolRegistry: mockToolRegistry,
          workflowManagement: mockWorkflowManagement,
          request: mockFakeRequest,
          logger: mockLogger,
        });
        expect(mockDeleteDataSourceAndRelatedResources).toHaveBeenCalledWith({
          dataSource: dataSource2,
          savedObjectsClient: mockSavedObjectsClient,
          actionsClient: mockActionsClient,
          toolRegistry: mockToolRegistry,
          workflowManagement: mockWorkflowManagement,
          request: mockFakeRequest,
          logger: mockLogger,
        });

        expect(result.state).toEqual({
          isDone: true,
          deletedCount: 2,
          errors: [],
        });
      });

      it('should delete tools via deleteDataSourceAndRelatedResources', async () => {
        const dataSource = createMockDataSource('ds-1', 'Source 1', 'github', [], ['tool-1'], []);

        createMockPointInTimeFinder([dataSource]);
        setupTaskRunner();

        mockDeleteDataSourceAndRelatedResources.mockResolvedValue({
          success: true,
          fullyDeleted: true,
        });

        await taskRunner.run();

        expect(mockDeleteDataSourceAndRelatedResources).toHaveBeenCalledWith(
          expect.objectContaining({
            dataSource,
            toolRegistry: mockToolRegistry,
          })
        );
      });

      it('should delete workflows via deleteDataSourceAndRelatedResources', async () => {
        const dataSource = createMockDataSource('ds-1', 'Source 1', 'github', ['workflow-1'], [], []);

        createMockPointInTimeFinder([dataSource]);
        setupTaskRunner();

        mockDeleteDataSourceAndRelatedResources.mockResolvedValue({
          success: true,
          fullyDeleted: true,
        });

        await taskRunner.run();

        expect(mockDeleteDataSourceAndRelatedResources).toHaveBeenCalledWith(
          expect.objectContaining({
            dataSource,
            workflowManagement: mockWorkflowManagement,
          })
        );
      });

      it('should delete stack connectors via deleteDataSourceAndRelatedResources', async () => {
        const dataSource = createMockDataSource('ds-1', 'Source 1', 'github', [], [], ['ksc-1']);

        createMockPointInTimeFinder([dataSource]);
        setupTaskRunner();

        mockDeleteDataSourceAndRelatedResources.mockResolvedValue({
          success: true,
          fullyDeleted: true,
        });

        await taskRunner.run();

        expect(mockDeleteDataSourceAndRelatedResources).toHaveBeenCalledWith(
          expect.objectContaining({
            dataSource,
            actionsClient: mockActionsClient,
          })
        );
      });
    });

    describe('partial deletion', () => {
      it('should track partial deletions as errors', async () => {
        const dataSource1 = createMockDataSource('ds-1', 'Source 1', 'github', [
          'workflow-1',
        ], ['tool-1'], ['ksc-1']);
        const dataSource2 = createMockDataSource('ds-2', 'Source 2', 'notion', [
          'workflow-2',
        ], ['tool-2'], ['ksc-2']);

        createMockPointInTimeFinder([dataSource1, dataSource2]);
        setupTaskRunner();

        mockDeleteDataSourceAndRelatedResources
          .mockResolvedValueOnce({
            success: true,
            fullyDeleted: true,
          })
          .mockResolvedValueOnce({
            success: true,
            fullyDeleted: false,
            remaining: {
              kscIds: ['ksc-2'],
              toolIds: [],
              workflowIds: [],
            },
          });

        const result = await taskRunner.run();

        expect(result.state).toEqual({
          isDone: true,
          deletedCount: 1,
          errors: [
            {
              dataSourceId: 'ds-2',
              error: 'Partially deleted: some resources failed to delete',
            },
          ],
        });
      });
    });

    describe('error handling', () => {
      it('should handle errors when deleteDataSourceAndRelatedResources throws', async () => {
        const dataSource = createMockDataSource('ds-1', 'Source 1', 'github', [], [], []);

        createMockPointInTimeFinder([dataSource]);
        setupTaskRunner();

        const error = new Error('Deletion failed');
        mockDeleteDataSourceAndRelatedResources.mockRejectedValue(error);

        const result = await taskRunner.run();

        expect(result.state).toEqual({
          isDone: true,
          deletedCount: 0,
          errors: [
            {
              dataSourceId: 'ds-1',
              error: 'Deletion failed',
            },
          ],
        });
      });

      it('should handle errors for multiple data sources', async () => {
        const dataSource1 = createMockDataSource('ds-1', 'Source 1', 'github', [], [], []);
        const dataSource2 = createMockDataSource('ds-2', 'Source 2', 'notion', [], [], []);

        createMockPointInTimeFinder([dataSource1, dataSource2]);
        setupTaskRunner();

        mockDeleteDataSourceAndRelatedResources
          .mockRejectedValueOnce(new Error('Error 1'))
          .mockRejectedValueOnce(new Error('Error 2'));

        const result = await taskRunner.run();

        expect(result.state).toEqual({
          isDone: true,
          deletedCount: 0,
          errors: [
            { dataSourceId: 'ds-1', error: 'Error 1' },
            { dataSourceId: 'ds-2', error: 'Error 2' },
          ],
        });
      });
    });

    describe('batch processing', () => {
      it('should process multiple data sources in a batch', async () => {
        const dataSources = [
          createMockDataSource('ds-1', 'Source 1', 'github', [], [], []),
          createMockDataSource('ds-2', 'Source 2', 'notion', [], [], []),
          createMockDataSource('ds-3', 'Source 3', 'github', [], [], []),
        ];

        createMockPointInTimeFinder(dataSources);
        setupTaskRunner();

        mockDeleteDataSourceAndRelatedResources.mockResolvedValue({
          success: true,
          fullyDeleted: true,
        });

        const result = await taskRunner.run();

        expect(mockDeleteDataSourceAndRelatedResources).toHaveBeenCalledTimes(3);
        expect(result.state.deletedCount).toBe(3);
      });

      it('should process multiple batches from point-in-time finder', async () => {
        const batch1 = [
          createMockDataSource('ds-1', 'Source 1', 'github', [], [], []),
          createMockDataSource('ds-2', 'Source 2', 'notion', [], [], []),
        ];
        const batch2 = [
          createMockDataSource('ds-3', 'Source 3', 'github', [], [], []),
        ];

        const mockFinder = {
          find: jest.fn().mockImplementation(async function* () {
            yield {
              saved_objects: batch1,
              total: 3,
              page: 1,
              per_page: 100,
            };
            yield {
              saved_objects: batch2,
              total: 3,
              page: 2,
              per_page: 100,
            };
          }),
          close: jest.fn().mockResolvedValue(undefined),
        };

        mockSavedObjectsClient.createPointInTimeFinder = jest
          .fn()
          .mockReturnValue(mockFinder as any);

        setupTaskRunner();

        mockDeleteDataSourceAndRelatedResources.mockResolvedValue({
          success: true,
          fullyDeleted: true,
        });

        const result = await taskRunner.run();

        expect(mockDeleteDataSourceAndRelatedResources).toHaveBeenCalledTimes(3);
        expect(result.state.deletedCount).toBe(3);
        expect(mockFinder.close).toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      it('should handle empty data sources list', async () => {
        createMockPointInTimeFinder([]);
        setupTaskRunner();

        const result = await taskRunner.run();

        expect(mockDeleteDataSourceAndRelatedResources).not.toHaveBeenCalled();
        expect(result.state).toEqual({
          isDone: true,
          deletedCount: 0,
          errors: [],
        });
      });

      it('should return early if task is already done', async () => {
        setupTaskRunner({ isDone: true, deletedCount: 5, errors: [] });

        const result = await taskRunner.run();

        expect(mockDeleteDataSourceAndRelatedResources).not.toHaveBeenCalled();
        expect(result).toBeUndefined();
      });

      it('should handle missing fakeRequest', async () => {
        const { mockCoreSetup } = createMockCoreSetup();
        const mockPlugins = createMockPlugins();

        new BulkDeleteTask({
          core: mockCoreSetup as any,
          logFactory: mockLogFactory as any,
          plugins: mockPlugins,
        });

        const registerCall = (
          mockPlugins.taskManager.setup.registerTaskDefinitions as jest.Mock
        ).mock.calls[0][0];
        const createTaskRunner = registerCall[TYPE].createTaskRunner;

        const taskRunner = createTaskRunner({
          taskInstance: { id: 'test-task-id', state: { isDone: false, deletedCount: 0, errors: [] } },
          fakeRequest: undefined,
          abortController: new AbortController(),
        });

        const result = await taskRunner.run();

        expect(result.state).toEqual({
          isDone: true,
          deletedCount: 0,
          errors: [{ dataSourceId: 'unknown', error: 'fakeRequest is not defined' }],
        });
      });

      it('should close point-in-time finder even if errors occur', async () => {
        const dataSource = createMockDataSource('ds-1', 'Source 1', 'github', [], [], []);
        const mockFinder = createMockPointInTimeFinder([dataSource]);

        setupTaskRunner();

        mockDeleteDataSourceAndRelatedResources.mockRejectedValue(new Error('Deletion failed'));

        await taskRunner.run();

        expect(mockFinder.close).toHaveBeenCalled();
      });
    });
  });
});

