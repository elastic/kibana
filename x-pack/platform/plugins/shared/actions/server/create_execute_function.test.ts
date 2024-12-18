/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { createBulkExecutionEnqueuerFunction } from './create_execute_function';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { actionTypeRegistryMock } from './action_type_registry.mock';
import {
  asHttpRequestExecutionSource,
  asSavedObjectExecutionSource,
} from './lib/action_execution_source';
import { actionsConfigMock } from './actions_config.mock';

const mockTaskManager = taskManagerMock.createStart();
const savedObjectsClient = savedObjectsClientMock.create();
const request = {} as KibanaRequest;
const mockActionsConfig = actionsConfigMock.create();
const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

beforeEach(() => {
  jest.resetAllMocks();
  mockTaskManager.aggregate.mockResolvedValue({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
    aggregations: {},
  });
  mockActionsConfig.getMaxQueued.mockReturnValue(10);
});

describe('bulkExecute()', () => {
  test('schedules the action with all given parameters', async () => {
    const actionTypeRegistry = actionTypeRegistryMock.create();
    const executeFn = createBulkExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      actionTypeRegistry,
      isESOCanEncrypt: true,
      inMemoryConnectors: [],
      configurationUtilities: mockActionsConfig,
      logger: mockLogger,
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '123',
          type: 'action',
          attributes: {
            actionTypeId: 'mock-action',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '234',
          type: 'action_task_params',
          attributes: {
            actionId: '123',
          },
          references: [],
        },
      ],
    });
    await executeFn(savedObjectsClient, [
      {
        id: '123',
        params: { baz: false },
        spaceId: 'default',
        executionId: '123abc',
        apiKey: Buffer.from('123:abc').toString('base64'),
        source: asHttpRequestExecutionSource(request),
        actionTypeId: 'mock-action',
      },
    ]);
    expect(mockTaskManager.bulkSchedule).toHaveBeenCalledTimes(1);
    expect(mockTaskManager.bulkSchedule.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "params": Object {
              "actionTaskParamsId": "234",
              "spaceId": "default",
            },
            "scope": Array [
              "actions",
            ],
            "state": Object {},
            "taskType": "actions:mock-action",
          },
        ],
      ]
    `);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([{ id: '123', type: 'action' }]);
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [
        {
          type: 'action_task_params',
          attributes: {
            actionId: '123',
            params: { baz: false },
            executionId: '123abc',
            source: 'HTTP_REQUEST',
            apiKey: Buffer.from('123:abc').toString('base64'),
          },
          references: [
            {
              id: '123',
              name: 'actionRef',
              type: 'action',
            },
          ],
        },
      ],
      { refresh: false }
    );
    expect(actionTypeRegistry.isActionExecutable).toHaveBeenCalledWith('123', 'mock-action', {
      notifyUsage: true,
    });
  });

  test('schedules the action with all given parameters and consumer', async () => {
    const actionTypeRegistry = actionTypeRegistryMock.create();
    const executeFn = createBulkExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      actionTypeRegistry,
      isESOCanEncrypt: true,
      inMemoryConnectors: [],
      configurationUtilities: mockActionsConfig,
      logger: mockLogger,
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '123',
          type: 'action',
          attributes: {
            actionTypeId: 'mock-action',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '234',
          type: 'action_task_params',
          attributes: {
            actionId: '123',
            consumer: 'test-consumer',
          },
          references: [],
        },
      ],
    });
    await executeFn(savedObjectsClient, [
      {
        id: '123',
        params: { baz: false },
        spaceId: 'default',
        executionId: '123abc',
        consumer: 'test-consumer',
        apiKey: Buffer.from('123:abc').toString('base64'),
        source: asHttpRequestExecutionSource(request),
        actionTypeId: 'mock-action',
      },
    ]);
    expect(mockTaskManager.bulkSchedule).toHaveBeenCalledTimes(1);
    expect(mockTaskManager.bulkSchedule.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "params": Object {
              "actionTaskParamsId": "234",
              "spaceId": "default",
            },
            "scope": Array [
              "actions",
            ],
            "state": Object {},
            "taskType": "actions:mock-action",
          },
        ],
      ]
    `);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([{ id: '123', type: 'action' }]);
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [
        {
          type: 'action_task_params',
          attributes: {
            actionId: '123',
            params: { baz: false },
            executionId: '123abc',
            consumer: 'test-consumer',
            source: 'HTTP_REQUEST',
            apiKey: Buffer.from('123:abc').toString('base64'),
          },
          references: [
            {
              id: '123',
              name: 'actionRef',
              type: 'action',
            },
          ],
        },
      ],
      { refresh: false }
    );
    expect(actionTypeRegistry.isActionExecutable).toHaveBeenCalledWith('123', 'mock-action', {
      notifyUsage: true,
    });
  });

  test('schedules the action with all given parameters and relatedSavedObjects', async () => {
    const actionTypeRegistry = actionTypeRegistryMock.create();
    const executeFn = createBulkExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      actionTypeRegistry,
      isESOCanEncrypt: true,
      inMemoryConnectors: [],
      configurationUtilities: mockActionsConfig,
      logger: mockLogger,
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '123',
          type: 'action',
          attributes: {
            actionTypeId: 'mock-action',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '234',
          type: 'action_task_params',
          attributes: {},
          references: [],
        },
      ],
    });
    await executeFn(savedObjectsClient, [
      {
        id: '123',
        params: { baz: false },
        spaceId: 'default',
        apiKey: Buffer.from('123:abc').toString('base64'),
        source: asHttpRequestExecutionSource(request),
        executionId: '123abc',
        relatedSavedObjects: [
          {
            id: 'some-id',
            namespace: 'some-namespace',
            type: 'some-type',
            typeId: 'some-typeId',
          },
        ],
        actionTypeId: 'mock-action',
      },
    ]);
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [
        {
          type: 'action_task_params',
          attributes: {
            actionId: '123',
            params: { baz: false },
            apiKey: Buffer.from('123:abc').toString('base64'),
            executionId: '123abc',
            source: 'HTTP_REQUEST',
            relatedSavedObjects: [
              {
                id: 'related_some-type_0',
                namespace: 'some-namespace',
                type: 'some-type',
                typeId: 'some-typeId',
              },
            ],
          },
          references: [
            {
              id: '123',
              name: 'actionRef',
              type: 'action',
            },
            {
              id: 'some-id',
              name: 'related_some-type_0',
              type: 'some-type',
            },
          ],
        },
      ],
      { refresh: false }
    );
  });

  test('schedules the action with all given parameters with a preconfigured action', async () => {
    const executeFn = createBulkExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      actionTypeRegistry: actionTypeRegistryMock.create(),
      isESOCanEncrypt: true,
      inMemoryConnectors: [
        {
          id: '123',
          actionTypeId: 'mock-action-preconfigured',
          config: {},
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
          name: 'x',
          secrets: {},
        },
      ],
      configurationUtilities: mockActionsConfig,
      logger: mockLogger,
    });
    const source = { type: 'alert', id: uuidv4() };

    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '123',
          type: 'action',
          attributes: {
            actionTypeId: 'mock-action',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '234',
          type: 'action_task_params',
          attributes: {
            actionId: '123',
          },
          references: [],
        },
      ],
    });
    await executeFn(savedObjectsClient, [
      {
        id: '123',
        params: { baz: false },
        spaceId: 'default',
        executionId: '123abc',
        apiKey: Buffer.from('123:abc').toString('base64'),
        source: asSavedObjectExecutionSource(source),
        actionTypeId: 'mock-action',
      },
    ]);
    expect(mockTaskManager.bulkSchedule).toHaveBeenCalledTimes(1);
    expect(mockTaskManager.bulkSchedule.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "params": Object {
              "actionTaskParamsId": "234",
              "spaceId": "default",
            },
            "scope": Array [
              "actions",
            ],
            "state": Object {},
            "taskType": "actions:mock-action-preconfigured",
          },
        ],
      ]
  `);
    expect(savedObjectsClient.get).not.toHaveBeenCalled();
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [
        {
          type: 'action_task_params',
          attributes: {
            actionId: '123',
            params: { baz: false },
            executionId: '123abc',
            source: 'SAVED_OBJECT',
            apiKey: Buffer.from('123:abc').toString('base64'),
          },
          references: [
            {
              id: source.id,
              name: 'source',
              type: source.type,
            },
          ],
        },
      ],
      { refresh: false }
    );
  });

  test('schedules the action with all given parameters with a system action', async () => {
    const executeFn = createBulkExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      actionTypeRegistry: actionTypeRegistryMock.create(),
      isESOCanEncrypt: true,
      inMemoryConnectors: [
        {
          actionTypeId: 'test.system-action',
          config: {},
          id: 'system-connector-test.system-action',
          name: 'System action: test.system-action',
          secrets: {},
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: true,
        },
      ],
      configurationUtilities: mockActionsConfig,
      logger: mockLogger,
    });
    const source = { type: 'alert', id: uuidv4() };

    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '123',
          type: 'action',
          attributes: {
            actionTypeId: 'test.system-action',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '234',
          type: 'action_task_params',
          attributes: {
            actionId: 'system-connector-test.system-action',
          },
          references: [],
        },
      ],
    });
    await executeFn(savedObjectsClient, [
      {
        id: 'system-connector-test.system-action',
        params: { baz: false },
        spaceId: 'default',
        executionId: 'system-connector-.casesabc',
        apiKey: Buffer.from('system-connector-test.system-action:abc').toString('base64'),
        source: asSavedObjectExecutionSource(source),
        actionTypeId: 'mock-action',
      },
    ]);
    expect(mockTaskManager.bulkSchedule).toHaveBeenCalledTimes(1);
    expect(mockTaskManager.bulkSchedule.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "params": Object {
              "actionTaskParamsId": "234",
              "spaceId": "default",
            },
            "scope": Array [
              "actions",
            ],
            "state": Object {},
            "taskType": "actions:test.system-action",
          },
        ],
      ]
    `);
    expect(savedObjectsClient.get).not.toHaveBeenCalled();
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [
        {
          type: 'action_task_params',
          attributes: {
            actionId: 'system-connector-test.system-action',
            params: { baz: false },
            executionId: 'system-connector-.casesabc',
            source: 'SAVED_OBJECT',
            apiKey: Buffer.from('system-connector-test.system-action:abc').toString('base64'),
          },
          references: [
            {
              id: source.id,
              name: 'source',
              type: source.type,
            },
          ],
        },
      ],
      { refresh: false }
    );
  });

  test('schedules the action with all given parameters with a preconfigured action and relatedSavedObjects', async () => {
    const executeFn = createBulkExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      actionTypeRegistry: actionTypeRegistryMock.create(),
      isESOCanEncrypt: true,
      inMemoryConnectors: [
        {
          id: '123',
          actionTypeId: 'mock-action-preconfigured',
          config: {},
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
          name: 'x',
          secrets: {},
        },
      ],
      configurationUtilities: mockActionsConfig,
      logger: mockLogger,
    });
    const source = { type: 'alert', id: uuidv4() };

    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '123',
          type: 'action',
          attributes: {
            actionTypeId: 'mock-action',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '234',
          type: 'action_task_params',
          attributes: {
            actionId: '123',
          },
          references: [],
        },
      ],
    });
    await executeFn(savedObjectsClient, [
      {
        id: '123',
        params: { baz: false },
        spaceId: 'default',
        apiKey: Buffer.from('123:abc').toString('base64'),
        source: asSavedObjectExecutionSource(source),
        executionId: '123abc',
        relatedSavedObjects: [
          {
            id: 'some-id',
            namespace: 'some-namespace',
            type: 'some-type',
            typeId: 'some-typeId',
          },
        ],
        actionTypeId: 'mock-action',
      },
    ]);
    expect(mockTaskManager.bulkSchedule).toHaveBeenCalledTimes(1);
    expect(mockTaskManager.bulkSchedule.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "params": Object {
              "actionTaskParamsId": "234",
              "spaceId": "default",
            },
            "scope": Array [
              "actions",
            ],
            "state": Object {},
            "taskType": "actions:mock-action-preconfigured",
          },
        ],
      ]
  `);
    expect(savedObjectsClient.get).not.toHaveBeenCalled();
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [
        {
          type: 'action_task_params',
          attributes: {
            actionId: '123',
            params: { baz: false },
            apiKey: Buffer.from('123:abc').toString('base64'),
            executionId: '123abc',
            source: 'SAVED_OBJECT',
            relatedSavedObjects: [
              {
                id: 'related_some-type_0',
                namespace: 'some-namespace',
                type: 'some-type',
                typeId: 'some-typeId',
              },
            ],
          },
          references: [
            {
              id: source.id,
              name: 'source',
              type: source.type,
            },
            {
              id: 'some-id',
              name: 'related_some-type_0',
              type: 'some-type',
            },
          ],
        },
      ],
      { refresh: false }
    );
  });

  test('schedules the action with all given parameters with a system action and relatedSavedObjects', async () => {
    const executeFn = createBulkExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      actionTypeRegistry: actionTypeRegistryMock.create(),
      isESOCanEncrypt: true,
      inMemoryConnectors: [
        {
          actionTypeId: 'test.system-action',
          config: {},
          id: 'system-connector-test.system-action',
          name: 'System action: test.system-action',
          secrets: {},
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: true,
        },
      ],
      configurationUtilities: mockActionsConfig,
      logger: mockLogger,
    });
    const source = { type: 'alert', id: uuidv4() };

    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '123',
          type: 'action',
          attributes: {
            actionTypeId: 'test.system-action',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '234',
          type: 'action_task_params',
          attributes: {
            actionId: 'system-connector-test.system-action',
          },
          references: [],
        },
      ],
    });
    await executeFn(savedObjectsClient, [
      {
        id: 'system-connector-test.system-action',
        params: { baz: false },
        spaceId: 'default',
        apiKey: Buffer.from('system-connector-test.system-action:abc').toString('base64'),
        source: asSavedObjectExecutionSource(source),
        executionId: 'system-connector-.casesabc',
        relatedSavedObjects: [
          {
            id: 'some-id',
            namespace: 'some-namespace',
            type: 'some-type',
            typeId: 'some-typeId',
          },
        ],
        actionTypeId: 'mock-action',
      },
    ]);
    expect(mockTaskManager.bulkSchedule).toHaveBeenCalledTimes(1);
    expect(mockTaskManager.bulkSchedule.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "params": Object {
              "actionTaskParamsId": "234",
              "spaceId": "default",
            },
            "scope": Array [
              "actions",
            ],
            "state": Object {},
            "taskType": "actions:test.system-action",
          },
        ],
      ]
    `);
    expect(savedObjectsClient.get).not.toHaveBeenCalled();
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [
        {
          type: 'action_task_params',
          attributes: {
            actionId: 'system-connector-test.system-action',
            params: { baz: false },
            apiKey: Buffer.from('system-connector-test.system-action:abc').toString('base64'),
            executionId: 'system-connector-.casesabc',
            source: 'SAVED_OBJECT',
            relatedSavedObjects: [
              {
                id: 'related_some-type_0',
                namespace: 'some-namespace',
                type: 'some-type',
                typeId: 'some-typeId',
              },
            ],
          },
          references: [
            {
              id: source.id,
              name: 'source',
              type: source.type,
            },
            {
              id: 'some-id',
              name: 'related_some-type_0',
              type: 'some-type',
            },
          ],
        },
      ],
      { refresh: false }
    );
  });

  test('throws when passing isESOCanEncrypt with false as a value', async () => {
    const executeFn = createBulkExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      isESOCanEncrypt: false,
      actionTypeRegistry: actionTypeRegistryMock.create(),
      inMemoryConnectors: [],
      configurationUtilities: mockActionsConfig,
      logger: mockLogger,
    });
    await expect(
      executeFn(savedObjectsClient, [
        {
          id: '123',
          params: { baz: false },
          spaceId: 'default',
          executionId: '123abc',
          apiKey: null,
          source: asHttpRequestExecutionSource(request),
          actionTypeId: 'mock-action',
        },
      ])
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unable to execute actions because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command."`
    );
  });

  test('filter outs the connectors when isMissingSecrets is true', async () => {
    const executeFn = createBulkExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      isESOCanEncrypt: true,
      actionTypeRegistry: actionTypeRegistryMock.create(),
      inMemoryConnectors: [],
      configurationUtilities: mockActionsConfig,
      logger: mockLogger,
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '123',
          type: 'action',
          attributes: {
            name: 'mock-action',
            isMissingSecrets: true,
            actionTypeId: 'mock-action',
          },
          references: [],
        },
        {
          id: '234',
          type: 'action',
          attributes: {
            name: 'mock-action-2',
            isMissingSecrets: false,
            actionTypeId: 'mock-action-2',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '234',
          type: 'action_task_params',
          attributes: {
            actionId: '123',
          },
          references: [],
        },
      ],
    });

    const result = await executeFn(savedObjectsClient, [
      {
        id: '123',
        params: { baz: false },
        spaceId: 'default',
        executionId: '123abc',
        apiKey: null,
        source: asHttpRequestExecutionSource(request),
        actionTypeId: 'mock-action',
      },
      {
        id: '234',
        params: { baz: false },
        spaceId: 'default',
        executionId: '123abc',
        apiKey: null,
        source: asHttpRequestExecutionSource(request),
        actionTypeId: 'mock-action-2',
      },
    ]);

    expect(result).toEqual({
      errors: false,
      items: [
        {
          actionTypeId: 'mock-action-2',
          id: '234',
          response: 'success',
        },
      ],
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Skipped the actions for the connector: mock-action (123). Error: Unable to execute action because no secrets are defined for the "mock-action" connector.'
    );
  });

  test('skips the disabled action types', async () => {
    const mockedActionTypeRegistry = actionTypeRegistryMock.create();
    const executeFn = createBulkExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      isESOCanEncrypt: true,
      actionTypeRegistry: mockedActionTypeRegistry,
      inMemoryConnectors: [],
      configurationUtilities: mockActionsConfig,
      logger: mockLogger,
    });
    mockedActionTypeRegistry.ensureActionTypeEnabled.mockImplementation(() => {
      throw new Error('Fail');
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '123',
          type: 'action',
          attributes: {
            actionTypeId: 'mock-action',
            name: 'test-connector',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '234',
          type: 'action_task_params',
          attributes: {
            actionId: '123',
          },
          references: [],
        },
      ],
    });

    const result = await executeFn(savedObjectsClient, [
      {
        id: '123',
        params: { baz: false },
        spaceId: 'default',
        executionId: '123abc',
        apiKey: null,
        source: asHttpRequestExecutionSource(request),
        actionTypeId: 'mock-action',
      },
    ]);

    expect(result).toEqual({
      errors: false,
      items: [],
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Skipped the actions for the connector: test-connector (123). Error: Fail'
    );
  });

  test('should skip ensure action type if action type is preconfigured and license is valid', async () => {
    const mockedActionTypeRegistry = actionTypeRegistryMock.create();
    const executeFn = createBulkExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      isESOCanEncrypt: true,
      actionTypeRegistry: mockedActionTypeRegistry,
      inMemoryConnectors: [
        {
          actionTypeId: 'mock-action',
          config: {},
          id: 'my-slack1',
          name: 'Slack #xyz',
          secrets: {},
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
        },
      ],
      configurationUtilities: mockActionsConfig,
      logger: mockLogger,
    });
    mockedActionTypeRegistry.isActionExecutable.mockImplementation(() => true);
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '123',
          type: 'action',
          attributes: {
            actionTypeId: 'mock-action',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '234',
          type: 'action_task_params',
          attributes: {
            actionId: '123',
          },
          references: [],
        },
      ],
    });

    await executeFn(savedObjectsClient, [
      {
        id: '123',
        params: { baz: false },
        spaceId: 'default',
        executionId: '123abc',
        apiKey: null,
        source: asHttpRequestExecutionSource(request),
        actionTypeId: 'mock-action',
      },
    ]);

    expect(mockedActionTypeRegistry.ensureActionTypeEnabled).not.toHaveBeenCalled();
  });

  test('should skip ensure action type if action type is system action and license is valid', async () => {
    const mockedActionTypeRegistry = actionTypeRegistryMock.create();
    const executeFn = createBulkExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      isESOCanEncrypt: true,
      actionTypeRegistry: mockedActionTypeRegistry,
      inMemoryConnectors: [
        {
          actionTypeId: 'test.system-action',
          config: {},
          id: 'system-connector-test.system-action',
          name: 'System action: test.system-action',
          secrets: {},
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: true,
        },
      ],
      configurationUtilities: mockActionsConfig,
      logger: mockLogger,
    });
    mockedActionTypeRegistry.isActionExecutable.mockImplementation(() => true);
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '123',
          type: 'action',
          attributes: {
            actionTypeId: 'test.system-action',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '234',
          type: 'action_task_params',
          attributes: {
            actionId: '123',
          },
          references: [],
        },
      ],
    });

    await executeFn(savedObjectsClient, [
      {
        id: '123',
        params: { baz: false },
        spaceId: 'default',
        executionId: '123abc',
        apiKey: null,
        source: asHttpRequestExecutionSource(request),
        actionTypeId: 'mock-action',
      },
    ]);

    expect(mockedActionTypeRegistry.ensureActionTypeEnabled).not.toHaveBeenCalled();
  });

  test('returns queuedActionsLimitError response when the max number of queued actions has been reached', async () => {
    mockTaskManager.aggregate.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 2, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {},
    });
    mockActionsConfig.getMaxQueued.mockReturnValueOnce(2);
    const executeFn = createBulkExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      actionTypeRegistry: actionTypeRegistryMock.create(),
      isESOCanEncrypt: true,
      inMemoryConnectors: [],
      configurationUtilities: mockActionsConfig,
      logger: mockLogger,
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [],
    });
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [],
    });
    expect(
      await executeFn(savedObjectsClient, [
        {
          id: '123',
          params: { baz: false },
          spaceId: 'default',
          executionId: '123abc',
          apiKey: null,
          source: asHttpRequestExecutionSource(request),
          actionTypeId: 'mock-action',
        },
      ])
    ).toMatchInlineSnapshot(`
      Object {
        "errors": true,
        "items": Array [
          Object {
            "actionTypeId": "mock-action",
            "id": "123",
            "response": "queuedActionsLimitError",
            "uuid": undefined,
          },
        ],
      }
    `);
    expect(mockTaskManager.bulkSchedule).toHaveBeenCalledTimes(1);
    expect(mockTaskManager.bulkSchedule.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [],
      ]
    `);
  });

  test('passes through action uuid if provided', async () => {
    mockTaskManager.aggregate.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 2, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {},
    });
    mockActionsConfig.getMaxQueued.mockReturnValueOnce(3);
    const executeFn = createBulkExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      actionTypeRegistry: actionTypeRegistryMock.create(),
      isESOCanEncrypt: true,
      inMemoryConnectors: [],
      configurationUtilities: mockActionsConfig,
      logger: mockLogger,
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        { id: '123', type: 'action', attributes: { actionTypeId: 'mock-action' }, references: [] },
      ],
    });
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        { id: '234', type: 'action_task_params', attributes: { actionId: '123' }, references: [] },
      ],
    });
    expect(
      await executeFn(savedObjectsClient, [
        {
          id: '123',
          params: { baz: false },
          spaceId: 'default',
          executionId: '123abc',
          apiKey: null,
          source: asHttpRequestExecutionSource(request),
          actionTypeId: 'mock-action',
          uuid: 'aaa',
        },
        {
          id: '123',
          params: { baz: false },
          spaceId: 'default',
          executionId: '456xyz',
          apiKey: null,
          source: asHttpRequestExecutionSource(request),
          actionTypeId: 'mock-action',
          uuid: 'bbb',
        },
      ])
    ).toMatchInlineSnapshot(`
      Object {
        "errors": true,
        "items": Array [
          Object {
            "actionTypeId": "mock-action",
            "id": "123",
            "response": "success",
            "uuid": "aaa",
          },
          Object {
            "actionTypeId": "mock-action",
            "id": "123",
            "response": "queuedActionsLimitError",
            "uuid": "bbb",
          },
        ],
      }
    `);
    expect(mockTaskManager.bulkSchedule).toHaveBeenCalledTimes(1);
    expect(mockTaskManager.bulkSchedule.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "params": Object {
              "actionTaskParamsId": "234",
              "spaceId": "default",
            },
            "scope": Array [
              "actions",
            ],
            "state": Object {},
            "taskType": "actions:mock-action",
          },
        ],
      ]
    `);
  });
});
