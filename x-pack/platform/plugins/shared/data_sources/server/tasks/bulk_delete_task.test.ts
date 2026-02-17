/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { BulkDeleteTask, TYPE, type BulkDeleteTaskState } from './bulk_delete_task';
import { DATA_SOURCE_SAVED_OBJECT_TYPE } from '../saved_objects';
import { deleteDataSourceAndRelatedResources } from '../routes/data_sources_helpers';
import { FAKE_REQUEST_NOT_DEFINED_ERROR, PARTIALLY_DELETED_ERROR } from '../../common/constants';
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

  const createMockTaskManager = () => {
    return {
      registerTaskDefinitions: jest.fn(),
    };
  };

  const mockGetForDataSources = (dataSources: any[]) => {
    const byId = new Map(dataSources.map((ds) => [ds.id, ds]));
    mockSavedObjectsClient.get = jest.fn().mockImplementation((type: string, id: string) => {
      const ds = byId.get(id);
      if (!ds) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      return Promise.resolve(ds);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSavedObjectsClient.getCurrentNamespace = jest.fn().mockReturnValue('default');
  });

  describe('task registration', () => {
    it('should register task definition with correct configuration', () => {
      const { mockCoreSetup } = createMockCoreSetup();
      const mockTaskManager = createMockTaskManager();

      new BulkDeleteTask({
        core: mockCoreSetup as any,
        logFactory: mockLogFactory as any,
        taskManager: mockTaskManager as any,
        workflowManagement: mockWorkflowManagement as any,
      });

      expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledWith({
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

    const setupTaskRunner = (
      initialState?: Partial<BulkDeleteTaskState>,
      params: { dataSourceIds: string[] } = { dataSourceIds: [] }
    ) => {
      const { mockCoreSetup } = createMockCoreSetup();
      const mockTaskManager = createMockTaskManager();

      new BulkDeleteTask({
        core: mockCoreSetup as any,
        logFactory: mockLogFactory as any,
        taskManager: mockTaskManager as any,
        workflowManagement: mockWorkflowManagement as any,
      });

      const registerCall = (mockTaskManager.registerTaskDefinitions as jest.Mock).mock.calls[0][0];
      const createTaskRunner = registerCall[TYPE].createTaskRunner;

      mockTaskInstance = {
        id: 'test-task-id',
        state: initialState || { isDone: false, deletedCount: 0, errors: [] },
        params,
      };

      mockFakeRequest = httpServerMock.createKibanaRequest();

      taskRunner = createTaskRunner({
        taskInstance: mockTaskInstance,
        fakeRequest: mockFakeRequest,
        abortController: new AbortController(),
      });

      return { mockCoreSetup, mockTaskManager };
    };

    describe('full deletion success', () => {
      it('should delete all resources when all deletions succeed', async () => {
        const dataSource1 = createMockDataSource(
          'ds-1',
          'Source 1',
          'github',
          ['workflow-1'],
          ['tool-1'],
          ['ksc-1']
        );
        const dataSource2 = createMockDataSource(
          'ds-2',
          'Source 2',
          'notion',
          ['workflow-2'],
          ['tool-2'],
          ['ksc-2']
        );

        mockGetForDataSources([dataSource1, dataSource2]);
        setupTaskRunner(undefined, { dataSourceIds: ['ds-1', 'ds-2'] });

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
          dataSource: expect.objectContaining({
            id: 'ds-1',
            attributes: expect.objectContaining({
              kscIds: ['ksc-1'],
            }),
          }),
          savedObjectsClient: mockSavedObjectsClient,
          actionsClient: mockActionsClient,
          toolRegistry: mockToolRegistry,
          workflowManagement: mockWorkflowManagement,
          request: mockFakeRequest,
          logger: mockLogger,
        });
        expect(mockDeleteDataSourceAndRelatedResources).toHaveBeenCalledWith({
          dataSource: expect.objectContaining({
            id: 'ds-2',
            attributes: expect.objectContaining({
              kscIds: ['ksc-2'],
            }),
          }),
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

        mockGetForDataSources([dataSource]);
        setupTaskRunner(undefined, { dataSourceIds: ['ds-1'] });

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
        const dataSource = createMockDataSource(
          'ds-1',
          'Source 1',
          'github',
          ['workflow-1'],
          [],
          []
        );

        mockGetForDataSources([dataSource]);
        setupTaskRunner(undefined, { dataSourceIds: ['ds-1'] });

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

        mockGetForDataSources([dataSource]);
        setupTaskRunner(undefined, { dataSourceIds: ['ds-1'] });

        mockDeleteDataSourceAndRelatedResources.mockResolvedValue({
          success: true,
          fullyDeleted: true,
        });

        await taskRunner.run();

        expect(mockDeleteDataSourceAndRelatedResources).toHaveBeenCalledWith(
          expect.objectContaining({
            dataSource: expect.objectContaining({
              id: 'ds-1',
              attributes: expect.objectContaining({
                kscIds: ['ksc-1'],
              }),
            }),
            actionsClient: mockActionsClient,
          })
        );
      });

      it('should delete multiple stack connectors via deleteDataSourceAndRelatedResources', async () => {
        const dataSource = createMockDataSource(
          'ds-1',
          'Source 1',
          'github',
          [],
          [],
          ['ksc-1', 'ksc-2', 'ksc-3']
        );

        mockGetForDataSources([dataSource]);
        setupTaskRunner(undefined, { dataSourceIds: ['ds-1'] });

        mockDeleteDataSourceAndRelatedResources.mockResolvedValue({
          success: true,
          fullyDeleted: true,
        });

        await taskRunner.run();

        expect(mockDeleteDataSourceAndRelatedResources).toHaveBeenCalledWith(
          expect.objectContaining({
            dataSource: expect.objectContaining({
              id: 'ds-1',
              attributes: expect.objectContaining({
                kscIds: ['ksc-1', 'ksc-2', 'ksc-3'],
              }),
            }),
            actionsClient: mockActionsClient,
          })
        );
      });
    });

    describe('partial deletion', () => {
      it('should track partial deletions as errors', async () => {
        const dataSource1 = createMockDataSource(
          'ds-1',
          'Source 1',
          'github',
          ['workflow-1'],
          ['tool-1'],
          ['ksc-1']
        );
        const dataSource2 = createMockDataSource(
          'ds-2',
          'Source 2',
          'notion',
          ['workflow-2'],
          ['tool-2'],
          ['ksc-2']
        );

        mockGetForDataSources([dataSource1, dataSource2]);
        setupTaskRunner(undefined, { dataSourceIds: ['ds-1', 'ds-2'] });

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
              error: PARTIALLY_DELETED_ERROR,
            },
          ],
        });
      });
    });

    describe('error handling', () => {
      it('should handle errors when deleteDataSourceAndRelatedResources throws', async () => {
        const dataSource = createMockDataSource('ds-1', 'Source 1', 'github', [], [], []);

        mockGetForDataSources([dataSource]);
        setupTaskRunner(undefined, { dataSourceIds: ['ds-1'] });

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

        mockGetForDataSources([dataSource1, dataSource2]);
        setupTaskRunner(undefined, { dataSourceIds: ['ds-1', 'ds-2'] });

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
      it('should process multiple data sources by id', async () => {
        const dataSources = [
          createMockDataSource('ds-1', 'Source 1', 'github', [], [], []),
          createMockDataSource('ds-2', 'Source 2', 'notion', [], [], []),
          createMockDataSource('ds-3', 'Source 3', 'github', [], [], []),
        ];

        mockGetForDataSources(dataSources);
        setupTaskRunner(undefined, { dataSourceIds: ['ds-1', 'ds-2', 'ds-3'] });

        mockDeleteDataSourceAndRelatedResources.mockResolvedValue({
          success: true,
          fullyDeleted: true,
        });

        const result = await taskRunner.run();

        expect(mockDeleteDataSourceAndRelatedResources).toHaveBeenCalledTimes(3);
        expect(result.state.deletedCount).toBe(3);
      });
    });

    describe('edge cases', () => {
      it('should handle empty data source ids list', async () => {
        setupTaskRunner(undefined, { dataSourceIds: [] });

        const result = await taskRunner.run();

        expect(mockSavedObjectsClient.get).not.toHaveBeenCalled();
        expect(mockDeleteDataSourceAndRelatedResources).not.toHaveBeenCalled();
        expect(result!.state).toEqual({
          isDone: true,
          deletedCount: 0,
          errors: [],
        });
      });

      it('should return early if task is already done', async () => {
        setupTaskRunner({ isDone: true, deletedCount: 5, errors: [] }, { dataSourceIds: ['ds-1'] });

        const result = await taskRunner.run();

        expect(mockDeleteDataSourceAndRelatedResources).not.toHaveBeenCalled();
        expect(result).toBeUndefined();
      });

      it('should handle missing fakeRequest', async () => {
        const { mockCoreSetup } = createMockCoreSetup();
        const mockTaskManager = createMockTaskManager();

        new BulkDeleteTask({
          core: mockCoreSetup as any,
          logFactory: mockLogFactory as any,
          taskManager: mockTaskManager as any,
          workflowManagement: mockWorkflowManagement as any,
        });

        const registerCall = (mockTaskManager.registerTaskDefinitions as jest.Mock).mock
          .calls[0][0];
        const createTaskRunner = registerCall[TYPE].createTaskRunner;

        const runner = createTaskRunner({
          taskInstance: {
            id: 'test-task-id',
            state: { isDone: false, deletedCount: 0, errors: [] },
            params: { dataSourceIds: ['ds-1'] },
          },
          fakeRequest: undefined,
          abortController: new AbortController(),
        });

        const result = await runner.run();

        expect(mockLogger.error).toHaveBeenCalledWith(FAKE_REQUEST_NOT_DEFINED_ERROR);
        expect(result).toBeUndefined();
      });

      it('should skip id when get returns 404 (already deleted)', async () => {
        const dataSource1 = createMockDataSource('ds-1', 'Source 1', 'github', [], [], []);
        mockGetForDataSources([dataSource1]);
        mockSavedObjectsClient.get = jest.fn().mockImplementation((type: string, id: string) => {
          if (id === 'ds-1') return Promise.resolve(dataSource1);
          throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
        });

        setupTaskRunner(undefined, { dataSourceIds: ['ds-1', 'ds-2'] });

        mockDeleteDataSourceAndRelatedResources.mockResolvedValue({
          success: true,
          fullyDeleted: true,
        });

        const result = await taskRunner.run();

        expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
          DATA_SOURCE_SAVED_OBJECT_TYPE,
          'ds-1'
        );
        expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
          DATA_SOURCE_SAVED_OBJECT_TYPE,
          'ds-2'
        );
        expect(mockDeleteDataSourceAndRelatedResources).toHaveBeenCalledTimes(1);
        expect(result!.state).toEqual({
          isDone: true,
          deletedCount: 1,
          errors: [],
        });
      });
    });
  });
});
