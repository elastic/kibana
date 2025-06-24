/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { createBulkUnsecuredExecutionEnqueuerFunction } from './create_unsecured_execute_function';
import { actionTypeRegistryMock } from './action_type_registry.mock';
import {
  asNotificationExecutionSource,
  asSavedObjectExecutionSource,
} from './lib/action_execution_source';
import { actionsConfigMock } from './actions_config.mock';

const mockTaskManager = taskManagerMock.createStart();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const mockActionsConfig = actionsConfigMock.create();

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
  test.each([
    [true, false],
    [false, true],
  ])(
    'schedules the actions with all given parameters with an in-memory connector: isPreconfigured: %s, isSystemAction: %s',
    async (isPreconfigured, isSystemAction) => {
      const executeFn = createBulkUnsecuredExecutionEnqueuerFunction({
        taskManager: mockTaskManager,
        connectorTypeRegistry: actionTypeRegistryMock.create(),
        inMemoryConnectors: [
          {
            id: '123',
            actionTypeId: '.email',
            config: {},
            isPreconfigured,
            isDeprecated: false,
            isSystemAction,
            name: 'x',
            secrets: {},
          },
        ],
        configurationUtilities: mockActionsConfig,
      });

      internalSavedObjectsRepository.bulkCreate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '234',
            type: 'action_task_params',
            attributes: {
              actionId: '123',
            },
            references: [],
          },
          {
            id: '345',
            type: 'action_task_params',
            attributes: {
              actionId: '123',
            },
            references: [],
          },
        ],
      });
      await executeFn(internalSavedObjectsRepository, [
        {
          id: '123',
          params: { baz: false },
          source: asNotificationExecutionSource({ connectorId: 'abc', requesterId: 'foo' }),
        },
        {
          id: '123',
          params: { baz: true },
          source: asNotificationExecutionSource({ connectorId: 'abc', requesterId: 'foo' }),
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
            "taskType": "actions:.email",
          },
          Object {
            "params": Object {
              "actionTaskParamsId": "345",
              "spaceId": "default",
            },
            "scope": Array [
              "actions",
            ],
            "state": Object {},
            "taskType": "actions:.email",
          },
        ],
      ]
  `);

      expect(internalSavedObjectsRepository.bulkCreate).toHaveBeenCalledWith([
        {
          type: 'action_task_params',
          attributes: {
            actionId: '123',
            params: { baz: false },
            apiKey: null,
            source: 'NOTIFICATION',
          },
          references: [],
        },
        {
          type: 'action_task_params',
          attributes: {
            actionId: '123',
            params: { baz: true },
            apiKey: null,
            source: 'NOTIFICATION',
          },
          references: [],
        },
      ]);
    }
  );

  test.each([
    [true, false],
    [false, true],
  ])(
    'schedules the actions with all given parameters with an in-memory connector and source specified: isPreconfigured: %s, isSystemAction: %s',
    async (isPreconfigured, isSystemAction) => {
      const sourceUuid = uuidv4();
      const source = { type: 'alert', id: sourceUuid };
      const executeFn = createBulkUnsecuredExecutionEnqueuerFunction({
        taskManager: mockTaskManager,
        connectorTypeRegistry: actionTypeRegistryMock.create(),
        inMemoryConnectors: [
          {
            id: '123',
            actionTypeId: '.email',
            config: {},
            isPreconfigured,
            isDeprecated: false,
            isSystemAction,
            name: 'x',
            secrets: {},
          },
        ],
        configurationUtilities: mockActionsConfig,
      });

      internalSavedObjectsRepository.bulkCreate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '234',
            type: 'action_task_params',
            attributes: {
              actionId: '123',
            },
            references: [
              {
                id: sourceUuid,
                name: 'source',
                type: 'alert',
              },
            ],
          },
          {
            id: '345',
            type: 'action_task_params',
            attributes: {
              actionId: '123',
            },
            references: [],
          },
        ],
      });
      await executeFn(internalSavedObjectsRepository, [
        {
          id: '123',
          params: { baz: false },
          source: asSavedObjectExecutionSource(source),
        },
        {
          id: '123',
          params: { baz: true },
          source: asNotificationExecutionSource({ connectorId: 'abc', requesterId: 'foo' }),
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
            "taskType": "actions:.email",
          },
          Object {
            "params": Object {
              "actionTaskParamsId": "345",
              "spaceId": "default",
            },
            "scope": Array [
              "actions",
            ],
            "state": Object {},
            "taskType": "actions:.email",
          },
        ],
      ]
  `);

      expect(internalSavedObjectsRepository.bulkCreate).toHaveBeenCalledWith([
        {
          type: 'action_task_params',
          attributes: {
            actionId: '123',
            params: { baz: false },
            apiKey: null,
            source: 'SAVED_OBJECT',
          },
          references: [
            {
              id: sourceUuid,
              name: 'source',
              type: 'alert',
            },
          ],
        },
        {
          type: 'action_task_params',
          attributes: {
            actionId: '123',
            params: { baz: true },
            apiKey: null,
            source: 'NOTIFICATION',
          },
          references: [],
        },
      ]);
    }
  );

  test.each([
    [true, false],
    [false, true],
  ])(
    'schedules the actions with all given parameters with an in-memory connector and relatedSavedObjects specified: isPreconfigured: %s, isSystemAction: %s',
    async (isPreconfigured, isSystemAction) => {
      const sourceUuid = uuidv4();
      const source = { type: 'alert', id: sourceUuid };
      const executeFn = createBulkUnsecuredExecutionEnqueuerFunction({
        taskManager: mockTaskManager,
        connectorTypeRegistry: actionTypeRegistryMock.create(),
        inMemoryConnectors: [
          {
            id: '123',
            actionTypeId: '.email',
            config: {},
            isPreconfigured,
            isDeprecated: false,
            isSystemAction,
            name: 'x',
            secrets: {},
          },
        ],
        configurationUtilities: mockActionsConfig,
      });

      internalSavedObjectsRepository.bulkCreate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '234',
            type: 'action_task_params',
            attributes: {
              actionId: '123',
            },
            references: [
              {
                id: sourceUuid,
                name: 'source',
                type: 'alert',
              },
            ],
          },
          {
            id: '345',
            type: 'action_task_params',
            attributes: {
              actionId: '123',
            },
            references: [
              {
                id: 'some-id',
                name: 'related_some-type_0',
                type: 'some-type',
              },
            ],
          },
        ],
      });
      await executeFn(internalSavedObjectsRepository, [
        {
          id: '123',
          params: { baz: false },
          source: asSavedObjectExecutionSource(source),
        },
        {
          id: '123',
          params: { baz: true },
          source: asNotificationExecutionSource({ connectorId: 'abc', requesterId: 'foo' }),
          relatedSavedObjects: [
            {
              id: 'some-id',
              namespace: 'some-namespace',
              type: 'some-type',
            },
          ],
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
            "taskType": "actions:.email",
          },
          Object {
            "params": Object {
              "actionTaskParamsId": "345",
              "spaceId": "default",
            },
            "scope": Array [
              "actions",
            ],
            "state": Object {},
            "taskType": "actions:.email",
          },
        ],
      ]
  `);

      expect(internalSavedObjectsRepository.bulkCreate).toHaveBeenCalledWith([
        {
          type: 'action_task_params',
          attributes: {
            actionId: '123',
            params: { baz: false },
            apiKey: null,
            source: 'SAVED_OBJECT',
          },
          references: [
            {
              id: sourceUuid,
              name: 'source',
              type: 'alert',
            },
          ],
        },
        {
          type: 'action_task_params',
          attributes: {
            actionId: '123',
            params: { baz: true },
            apiKey: null,
            source: 'NOTIFICATION',
            relatedSavedObjects: [
              {
                id: 'related_some-type_0',
                namespace: 'some-namespace',
                type: 'some-type',
              },
            ],
          },
          references: [
            {
              id: 'some-id',
              name: 'related_some-type_0',
              type: 'some-type',
            },
          ],
        },
      ]);
    }
  );

  test.each([
    [true, false],
    [false, true],
  ])(
    'throws when scheduling action using non in-memory connector: isPreconfigured: %s, isSystemAction: %s',
    async (isPreconfigured, isSystemAction) => {
      const executeFn = createBulkUnsecuredExecutionEnqueuerFunction({
        taskManager: mockTaskManager,
        connectorTypeRegistry: actionTypeRegistryMock.create(),
        inMemoryConnectors: [
          {
            id: '123',
            actionTypeId: '.email',
            config: {},
            isPreconfigured,
            isDeprecated: false,
            isSystemAction,
            name: 'x',
            secrets: {},
          },
        ],
        configurationUtilities: mockActionsConfig,
      });
      await expect(
        executeFn(internalSavedObjectsRepository, [
          {
            id: '123',
            params: { baz: false },
            source: asNotificationExecutionSource({ connectorId: 'abc', requesterId: 'foo' }),
          },
          {
            id: 'not-preconfigured',
            params: { baz: true },
            source: asNotificationExecutionSource({ connectorId: 'abc', requesterId: 'foo' }),
          },
        ])
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"not-preconfigured are not in-memory connectors and can't be scheduled for unsecured actions execution"`
      );
    }
  );

  test.each([
    [true, false],
    [false, true],
  ])(
    'throws when connector type is not enabled: isPreconfigured: %s, isSystemAction: %s',
    async (isPreconfigured, isSystemAction) => {
      const mockedConnectorTypeRegistry = actionTypeRegistryMock.create();
      const executeFn = createBulkUnsecuredExecutionEnqueuerFunction({
        taskManager: mockTaskManager,
        connectorTypeRegistry: mockedConnectorTypeRegistry,
        inMemoryConnectors: [
          {
            id: '123',
            actionTypeId: '.email',
            config: {},
            isPreconfigured,
            isDeprecated: false,
            isSystemAction,
            name: 'x',
            secrets: {},
          },
        ],
        configurationUtilities: mockActionsConfig,
      });
      mockedConnectorTypeRegistry.ensureActionTypeEnabled.mockImplementation(() => {
        throw new Error('Fail');
      });

      await expect(
        executeFn(internalSavedObjectsRepository, [
          {
            id: '123',
            params: { baz: false },
            source: asNotificationExecutionSource({ connectorId: 'abc', requesterId: 'foo' }),
          },
          {
            id: '123',
            params: { baz: true },
            source: asNotificationExecutionSource({ connectorId: 'abc', requesterId: 'foo' }),
          },
        ])
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Fail"`);
    }
  );

  test.each([
    [true, false],
    [false, true],
  ])(
    'throws when scheduling action using non allow-listed in-memory connector: isPreconfigured: %s, isSystemAction: %s',
    async (isPreconfigured, isSystemAction) => {
      const executeFn = createBulkUnsecuredExecutionEnqueuerFunction({
        taskManager: mockTaskManager,
        connectorTypeRegistry: actionTypeRegistryMock.create(),
        inMemoryConnectors: [
          {
            id: '123',
            actionTypeId: '.email',
            config: {},
            isPreconfigured,
            isDeprecated: false,
            isSystemAction,
            name: 'x',
            secrets: {},
          },
          {
            id: '456',
            actionTypeId: '.index',
            config: {},
            isPreconfigured: true,
            isDeprecated: false,
            isSystemAction: false,
            name: 'x',
            secrets: {},
          },
        ],
        configurationUtilities: mockActionsConfig,
      });
      await expect(
        executeFn(internalSavedObjectsRepository, [
          {
            id: '123',
            params: { baz: false },
            source: asNotificationExecutionSource({ connectorId: 'abc', requesterId: 'foo' }),
          },
          {
            id: '456',
            params: { baz: true },
            source: asNotificationExecutionSource({ connectorId: 'abc', requesterId: 'foo' }),
          },
        ])
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `".index actions cannot be scheduled for unsecured actions execution"`
      );
    }
  );

  test.each([
    [true, false],
    [false, true],
  ])(
    'returns queuedActionsLimitError response when the max number of queued actions has been reached: %s, isSystemAction: %s',
    async (isPreconfigured, isSystemAction) => {
      mockTaskManager.aggregate.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 2, relation: 'eq' }, max_score: null, hits: [] },
        aggregations: {},
      });
      mockActionsConfig.getMaxQueued.mockReturnValueOnce(2);
      const executeFn = createBulkUnsecuredExecutionEnqueuerFunction({
        taskManager: mockTaskManager,
        connectorTypeRegistry: actionTypeRegistryMock.create(),
        inMemoryConnectors: [
          {
            id: '123',
            actionTypeId: '.email',
            config: {},
            isPreconfigured,
            isDeprecated: false,
            isSystemAction,
            name: 'x',
            secrets: {},
          },
        ],
        configurationUtilities: mockActionsConfig,
      });

      internalSavedObjectsRepository.bulkCreate.mockResolvedValueOnce({
        saved_objects: [],
      });
      expect(
        await executeFn(internalSavedObjectsRepository, [
          {
            id: '123',
            params: { baz: false },
            source: asNotificationExecutionSource({ connectorId: 'abc', requesterId: 'foo' }),
          },
        ])
      ).toEqual({ errors: true, items: [{ id: '123', response: 'queuedActionsLimitError' }] });
      expect(mockTaskManager.bulkSchedule).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.bulkSchedule.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Array [],
        ]
      `);
    }
  );
});
