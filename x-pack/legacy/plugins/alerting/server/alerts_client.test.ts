/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import uuid from 'uuid';
import { schema } from '@kbn/config-schema';
import { AlertsClient } from './alerts_client';
import { savedObjectsClientMock, loggingServiceMock } from '../../../../../src/core/server/mocks';
import { taskManagerMock } from '../../task_manager/task_manager.mock';
import { alertTypeRegistryMock } from './alert_type_registry.mock';
import { TaskStatus } from '../../task_manager';
import { IntervalSchedule } from './types';
import { resolvable } from './test_utils';

const taskManager = taskManagerMock.create();
const alertTypeRegistry = alertTypeRegistryMock.create();
const savedObjectsClient = savedObjectsClientMock.create();

const alertsClientParams = {
  taskManager,
  alertTypeRegistry,
  savedObjectsClient,
  spaceId: 'default',
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  logger: loggingServiceMock.create().get(),
};

beforeEach(() => {
  jest.resetAllMocks();
  alertsClientParams.createAPIKey.mockResolvedValue({ created: false });
  alertsClientParams.getUserName.mockResolvedValue('elastic');
  taskManager.runNow.mockResolvedValue({ id: '' });
});

const mockedDate = new Date('2019-02-12T21:01:22.479Z');
(global as any).Date = class Date {
  constructor() {
    return mockedDate;
  }
  static now() {
    return mockedDate.getTime();
  }
};

function getMockData(overwrites: Record<string, any> = {}) {
  return {
    enabled: true,
    name: 'abc',
    tags: ['foo'],
    alertTypeId: '123',
    schedule: { interval: '10s' },
    throttle: null,
    params: {
      bar: true,
    },
    actions: [
      {
        group: 'default',
        id: '1',
        params: {
          foo: true,
        },
      },
    ],
    ...overwrites,
  };
}

describe('create()', () => {
  test('creates an alert', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const data = getMockData();
    alertTypeRegistry.get.mockReturnValueOnce({
      id: '123',
      name: 'Test',
      actionGroups: ['default'],
      async executor() {},
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    taskManager.schedule.mockResolvedValueOnce({
      id: 'task-123',
      taskType: 'alerting:123',
      scheduledAt: new Date(),
      attempts: 1,
      status: TaskStatus.Idle,
      runAt: new Date(),
      startedAt: null,
      retryAt: null,
      state: {},
      params: {},
      ownerId: null,
    });
    savedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        scheduledTaskId: 'task-123',
      },
      references: [
        {
          id: '1',
          name: 'action_0',
          type: 'action',
        },
      ],
    });
    const result = await alertsClient.create({ data });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "123",
        "id": "1",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "scheduledTaskId": "task-123",
      }
    `);
    expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.create.mock.calls[0]).toHaveLength(3);
    expect(savedObjectsClient.create.mock.calls[0][0]).toEqual('alert');
    expect(savedObjectsClient.create.mock.calls[0][1]).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionRef": "action_0",
            "actionTypeId": "test",
            "group": "default",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "123",
        "apiKey": null,
        "apiKeyOwner": null,
        "createdBy": "elastic",
        "enabled": true,
        "muteAll": false,
        "mutedInstanceIds": Array [],
        "name": "abc",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "tags": Array [
          "foo",
        ],
        "throttle": null,
        "updatedBy": "elastic",
      }
    `);
    expect(savedObjectsClient.create.mock.calls[0][2]).toMatchInlineSnapshot(`
                                                                                                                  Object {
                                                                                                                    "references": Array [
                                                                                                                      Object {
                                                                                                                        "id": "1",
                                                                                                                        "name": "action_0",
                                                                                                                        "type": "action",
                                                                                                                      },
                                                                                                                    ],
                                                                                                                  }
                                                                            `);
    expect(taskManager.schedule).toHaveBeenCalledTimes(1);
    expect(taskManager.schedule.mock.calls[0]).toMatchInlineSnapshot(`
                                                                        Array [
                                                                          Object {
                                                                            "params": Object {
                                                                              "alertId": "1",
                                                                              "spaceId": "default",
                                                                            },
                                                                            "scope": Array [
                                                                              "alerting",
                                                                            ],
                                                                            "state": Object {
                                                                              "alertInstances": Object {},
                                                                              "alertTypeState": Object {},
                                                                              "previousStartedAt": null,
                                                                            },
                                                                            "taskType": "alerting:123",
                                                                          },
                                                                        ]
                                                `);
    expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.update.mock.calls[0]).toHaveLength(3);
    expect(savedObjectsClient.update.mock.calls[0][0]).toEqual('alert');
    expect(savedObjectsClient.update.mock.calls[0][1]).toEqual('1');
    expect(savedObjectsClient.update.mock.calls[0][2]).toMatchInlineSnapshot(`
                                                                                                                  Object {
                                                                                                                    "scheduledTaskId": "task-123",
                                                                                                                  }
                                                                            `);
  });

  test('creates an alert with multiple actions', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const data = getMockData({
      actions: [
        {
          group: 'default',
          id: '1',
          params: {
            foo: true,
          },
        },
        {
          group: 'default',
          id: '1',
          params: {
            foo: true,
          },
        },
        {
          group: 'default',
          id: '2',
          params: {
            foo: true,
          },
        },
      ],
    });
    alertTypeRegistry.get.mockReturnValueOnce({
      id: '123',
      name: 'Test',
      actionGroups: ['default'],
      async executor() {},
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actionTypeId: 'test',
          },
          references: [],
        },
        {
          id: '2',
          type: 'action',
          attributes: {
            actionTypeId: 'test2',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            actionRef: 'action_1',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            actionRef: 'action_2',
            actionTypeId: 'test2',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
        {
          name: 'action_1',
          type: 'action',
          id: '1',
        },
        {
          name: 'action_2',
          type: 'action',
          id: '2',
        },
      ],
    });
    taskManager.schedule.mockResolvedValueOnce({
      id: 'task-123',
      taskType: 'alerting:123',
      scheduledAt: new Date(),
      attempts: 1,
      status: TaskStatus.Idle,
      runAt: new Date(),
      startedAt: null,
      retryAt: null,
      state: {},
      params: {},
      ownerId: null,
    });
    savedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        scheduledTaskId: 'task-123',
      },
      references: [],
    });
    const result = await alertsClient.create({ data });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
          Object {
            "actionTypeId": "test2",
            "group": "default",
            "id": "2",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "123",
        "id": "1",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "scheduledTaskId": "task-123",
      }
    `);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([
      {
        id: '1',
        type: 'action',
      },
      {
        id: '2',
        type: 'action',
      },
    ]);
  });

  test('creates a disabled alert', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const data = getMockData({ enabled: false });
    alertTypeRegistry.get.mockReturnValueOnce({
      id: '123',
      name: 'Test',
      actionGroups: ['default'],
      async executor() {},
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: false,
        alertTypeId: '123',
        schedule: { interval: 10000 },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    const result = await alertsClient.create({ data });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "123",
        "enabled": false,
        "id": "1",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": 10000,
        },
      }
    `);
    expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(taskManager.schedule).toHaveBeenCalledTimes(0);
  });

  test('should validate params', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const data = getMockData();
    alertTypeRegistry.get.mockReturnValueOnce({
      id: '123',
      name: 'Test',
      actionGroups: [],
      validate: {
        params: schema.object({
          param1: schema.string(),
          threshold: schema.number({ min: 0, max: 1 }),
        }),
      },
      async executor() {},
    });
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"params invalid: [param1]: expected value of type [string] but got [undefined]"`
    );
  });

  test('throws error if loading actions fails', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const data = getMockData();
    alertTypeRegistry.get.mockReturnValueOnce({
      id: '123',
      name: 'Test',
      actionGroups: ['default'],
      async executor() {},
    });
    savedObjectsClient.bulkGet.mockRejectedValueOnce(new Error('Test Error'));
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Test Error"`
    );
    expect(savedObjectsClient.create).not.toHaveBeenCalled();
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  test('throws error if create saved object fails', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const data = getMockData();
    alertTypeRegistry.get.mockReturnValueOnce({
      id: '123',
      name: 'Test',
      actionGroups: ['default'],
      async executor() {},
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.create.mockRejectedValueOnce(new Error('Test failure'));
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Test failure"`
    );
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  test('attempts to remove saved object if scheduling failed', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const data = getMockData();
    alertTypeRegistry.get.mockReturnValueOnce({
      id: '123',
      name: 'Test',
      actionGroups: ['default'],
      async executor() {},
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    taskManager.schedule.mockRejectedValueOnce(new Error('Test failure'));
    savedObjectsClient.delete.mockResolvedValueOnce({});
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Test failure"`
    );
    expect(savedObjectsClient.delete).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.delete.mock.calls[0]).toMatchInlineSnapshot(`
                                                                                                                  Array [
                                                                                                                    "alert",
                                                                                                                    "1",
                                                                                                                  ]
                                                                            `);
  });

  test('returns task manager error if cleanup fails, logs to console', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const data = getMockData();
    alertTypeRegistry.get.mockReturnValueOnce({
      id: '123',
      name: 'Test',
      actionGroups: ['default'],
      async executor() {},
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    taskManager.schedule.mockRejectedValueOnce(new Error('Task manager error'));
    savedObjectsClient.delete.mockRejectedValueOnce(new Error('Saved object delete error'));
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Task manager error"`
    );
    expect(alertsClientParams.logger.error).toHaveBeenCalledWith(
      'Failed to cleanup alert "1" after scheduling task failed. Error: Saved object delete error'
    );
  });

  test('throws an error if alert type not registerd', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const data = getMockData();
    alertTypeRegistry.get.mockImplementation(() => {
      throw new Error('Invalid type');
    });
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid type"`
    );
  });

  test('calls the API key function', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const data = getMockData();
    alertTypeRegistry.get.mockReturnValueOnce({
      id: '123',
      name: 'Test',
      actionGroups: ['default'],
      async executor() {},
    });
    alertsClientParams.createAPIKey.mockResolvedValueOnce({
      created: true,
      result: { id: '123', api_key: 'abc' },
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    taskManager.schedule.mockResolvedValueOnce({
      id: 'task-123',
      taskType: 'alerting:123',
      scheduledAt: new Date(),
      attempts: 1,
      status: TaskStatus.Idle,
      runAt: new Date(),
      startedAt: null,
      retryAt: null,
      state: {},
      params: {},
      ownerId: null,
    });
    savedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        scheduledTaskId: 'task-123',
      },
      references: [
        {
          id: '1',
          name: 'action_0',
          type: 'action',
        },
      ],
    });
    await alertsClient.create({ data });

    expect(alertsClientParams.createAPIKey).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      'alert',
      {
        actions: [
          {
            actionRef: 'action_0',
            group: 'default',
            actionTypeId: 'test',
            params: { foo: true },
          },
        ],
        alertTypeId: '123',
        name: 'abc',
        params: { bar: true },
        apiKey: Buffer.from('123:abc').toString('base64'),
        apiKeyOwner: 'elastic',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        enabled: true,
        schedule: { interval: '10s' },
        throttle: null,
        muteAll: false,
        mutedInstanceIds: [],
        tags: ['foo'],
      },
      {
        references: [
          {
            id: '1',
            name: 'action_0',
            type: 'action',
          },
        ],
      }
    );
  });
});

describe('enable()', () => {
  test('enables an alert', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: false,
      },
      version: '123',
      references: [],
    });
    taskManager.schedule.mockResolvedValueOnce({
      id: 'task-123',
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      runAt: new Date(),
      state: {},
      params: {},
      taskType: '',
      startedAt: null,
      retryAt: null,
      ownerId: null,
    });

    await alertsClient.enable({ id: '1' });
    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        updatedBy: 'elastic',
        apiKey: null,
        apiKeyOwner: null,
      },
      {
        version: '123',
      }
    );
    expect(taskManager.schedule).toHaveBeenCalledWith({
      taskType: `alerting:2`,
      params: {
        alertId: '1',
        spaceId: 'default',
      },
      state: {
        alertInstances: {},
        alertTypeState: {},
        previousStartedAt: null,
      },
      scope: ['alerting'],
    });
  });

  test(`doesn't enable already enabled alerts`, async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
      },
      references: [],
    });

    await alertsClient.enable({ id: '1' });
    expect(taskManager.schedule).toHaveBeenCalledTimes(0);
    expect(savedObjectsClient.update).toHaveBeenCalledTimes(0);
  });

  test('calls the API key function', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: false,
      },
      version: '123',
      references: [],
    });
    taskManager.schedule.mockResolvedValueOnce({
      id: 'task-123',
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      runAt: new Date(),
      state: {},
      params: {},
      taskType: '',
      startedAt: null,
      retryAt: null,
      ownerId: null,
    });
    alertsClientParams.createAPIKey.mockResolvedValueOnce({
      created: true,
      result: { id: '123', api_key: 'abc' },
    });

    await alertsClient.enable({ id: '1' });
    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        apiKey: Buffer.from('123:abc').toString('base64'),
        apiKeyOwner: 'elastic',
        updatedBy: 'elastic',
      },
      {
        version: '123',
      }
    );
    expect(taskManager.schedule).toHaveBeenCalledWith({
      taskType: `alerting:2`,
      params: {
        alertId: '1',
        spaceId: 'default',
      },
      state: {
        alertInstances: {},
        alertTypeState: {},
        previousStartedAt: null,
      },
      scope: ['alerting'],
    });
  });
});

describe('disable()', () => {
  test('disables an alert', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
      },
      version: '123',
      references: [],
    });

    await alertsClient.disable({ id: '1' });
    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        schedule: { interval: '10s' },
        alertTypeId: '2',
        apiKey: null,
        apiKeyOwner: null,
        enabled: false,
        scheduledTaskId: null,
        updatedBy: 'elastic',
      },
      {
        version: '123',
      }
    );
    expect(taskManager.remove).toHaveBeenCalledWith('task-123');
  });

  test(`doesn't disable already disabled alerts`, async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: false,
        scheduledTaskId: 'task-123',
      },
      references: [],
    });

    await alertsClient.disable({ id: '1' });
    expect(savedObjectsClient.update).toHaveBeenCalledTimes(0);
    expect(taskManager.remove).toHaveBeenCalledTimes(0);
  });
});

describe('muteAll()', () => {
  test('mutes an alert', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        muteAll: false,
      },
      references: [],
    });

    await alertsClient.muteAll({ id: '1' });
    expect(savedObjectsClient.update).toHaveBeenCalledWith('alert', '1', {
      muteAll: true,
      mutedInstanceIds: [],
      updatedBy: 'elastic',
    });
  });
});

describe('unmuteAll()', () => {
  test('unmutes an alert', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        muteAll: true,
      },
      references: [],
    });

    await alertsClient.unmuteAll({ id: '1' });
    expect(savedObjectsClient.update).toHaveBeenCalledWith('alert', '1', {
      muteAll: false,
      mutedInstanceIds: [],
      updatedBy: 'elastic',
    });
  });
});

describe('muteInstance()', () => {
  test('mutes an alert instance', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: [],
      },
      version: '123',
      references: [],
    });

    await alertsClient.muteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        mutedInstanceIds: ['2'],
        updatedBy: 'elastic',
      },
      { version: '123' }
    );
  });

  test('skips muting when alert instance already muted', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: ['2'],
      },
      references: [],
    });

    await alertsClient.muteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(savedObjectsClient.update).not.toHaveBeenCalled();
  });

  test('skips muting when alert is muted', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: [],
        muteAll: true,
      },
      references: [],
    });

    await alertsClient.muteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(savedObjectsClient.update).not.toHaveBeenCalled();
  });
});

describe('unmuteInstance()', () => {
  test('unmutes an alert instance', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: ['2'],
      },
      version: '123',
      references: [],
    });

    await alertsClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        mutedInstanceIds: [],
        updatedBy: 'elastic',
      },
      { version: '123' }
    );
  });

  test('skips unmuting when alert instance not muted', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: [],
      },
      references: [],
    });

    await alertsClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(savedObjectsClient.update).not.toHaveBeenCalled();
  });

  test('skips unmuting when alert is muted', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: [],
        muteAll: true,
      },
      references: [],
    });

    await alertsClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(savedObjectsClient.update).not.toHaveBeenCalled();
  });
});

describe('get()', () => {
  test('calls saved objects client with given params', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    const result = await alertsClient.get({ id: '1' });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "123",
        "id": "1",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
      }
    `);
    expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
                                                                                                                  Array [
                                                                                                                    "alert",
                                                                                                                    "1",
                                                                                                                  ]
                                                                            `);
  });

  test(`throws an error when references aren't found`, async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [],
    });
    await expect(alertsClient.get({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Reference action_0 not found"`
    );
  });
});

describe('find()', () => {
  test('calls saved objects client with given params', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'alert',
          attributes: {
            alertTypeId: '123',
            schedule: { interval: '10s' },
            params: {
              bar: true,
            },
            actions: [
              {
                group: 'default',
                actionRef: 'action_0',
                params: {
                  foo: true,
                },
              },
            ],
          },
          references: [
            {
              name: 'action_0',
              type: 'action',
              id: '1',
            },
          ],
        },
      ],
    });
    const result = await alertsClient.find();
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Array [
          Object {
            "actions": Array [
              Object {
                "group": "default",
                "id": "1",
                "params": Object {
                  "foo": true,
                },
              },
            ],
            "alertTypeId": "123",
            "id": "1",
            "params": Object {
              "bar": true,
            },
            "schedule": Object {
              "interval": "10s",
            },
          },
        ],
        "page": 1,
        "perPage": 10,
        "total": 1,
      }
    `);
    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.find.mock.calls[0]).toMatchInlineSnapshot(`
                                                                                                                  Array [
                                                                                                                    Object {
                                                                                                                      "type": "alert",
                                                                                                                    },
                                                                                                                  ]
                                                                            `);
  });
});

describe('delete()', () => {
  test('successfully removes an alert', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        scheduledTaskId: 'task-123',
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    savedObjectsClient.delete.mockResolvedValueOnce({
      success: true,
    });
    const result = await alertsClient.delete({ id: '1' });
    expect(result).toEqual({ success: true });
    expect(savedObjectsClient.delete).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.delete.mock.calls[0]).toMatchInlineSnapshot(`
                                                                                                                  Array [
                                                                                                                    "alert",
                                                                                                                    "1",
                                                                                                                  ]
                                                                            `);
    expect(taskManager.remove).toHaveBeenCalledTimes(1);
    expect(taskManager.remove.mock.calls[0]).toMatchInlineSnapshot(`
                                                                                                                  Array [
                                                                                                                    "task-123",
                                                                                                                  ]
                                                                            `);
  });
});

describe('update()', () => {
  test('updates given parameters', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    alertTypeRegistry.get.mockReturnValueOnce({
      id: '123',
      name: 'Test',
      actionGroups: ['default'],
      async executor() {},
    });
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
        alertTypeId: '123',
        scheduledTaskId: 'task-123',
      },
      references: [],
      version: '123',
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
        scheduledTaskId: 'task-123',
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    const result = await alertsClient.update({
      id: '1',
      data: {
        schedule: { interval: '10s' },
        name: 'abc',
        tags: ['foo'],
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
        ],
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "enabled": true,
        "id": "1",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "scheduledTaskId": "task-123",
      }
    `);
    expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.update.mock.calls[0]).toHaveLength(4);
    expect(savedObjectsClient.update.mock.calls[0][0]).toEqual('alert');
    expect(savedObjectsClient.update.mock.calls[0][1]).toEqual('1');
    expect(savedObjectsClient.update.mock.calls[0][2]).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionRef": "action_0",
            "actionTypeId": "test",
            "group": "default",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "123",
        "apiKey": null,
        "apiKeyOwner": null,
        "enabled": true,
        "name": "abc",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "scheduledTaskId": "task-123",
        "tags": Array [
          "foo",
        ],
        "updatedBy": "elastic",
      }
    `);
    expect(savedObjectsClient.update.mock.calls[0][3]).toMatchInlineSnapshot(`
                                                                                                                  Object {
                                                                                                                    "references": Array [
                                                                                                                      Object {
                                                                                                                        "id": "1",
                                                                                                                        "name": "action_0",
                                                                                                                        "type": "action",
                                                                                                                      },
                                                                                                                    ],
                                                                                                                    "version": "123",
                                                                                                                  }
                                                                            `);
  });

  it('updates with multiple actions', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    alertTypeRegistry.get.mockReturnValueOnce({
      id: '123',
      name: 'Test',
      actionGroups: ['default'],
      async executor() {},
    });
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
        alertTypeId: '123',
        scheduledTaskId: 'task-123',
      },
      references: [],
      version: '123',
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actionTypeId: 'test',
          },
          references: [],
        },
        {
          id: '2',
          type: 'action',
          attributes: {
            actionTypeId: 'test2',
          },
          references: [],
        },
      ],
    });
    savedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            actionRef: 'action_1',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            actionRef: 'action_2',
            actionTypeId: 'test2',
            params: {
              foo: true,
            },
          },
        ],
        scheduledTaskId: 'task-123',
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
        {
          name: 'action_1',
          type: 'action',
          id: '1',
        },
        {
          name: 'action_2',
          type: 'action',
          id: '2',
        },
      ],
    });
    const result = await alertsClient.update({
      id: '1',
      data: {
        schedule: { interval: '10s' },
        name: 'abc',
        tags: ['foo'],
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            id: '2',
            params: {
              foo: true,
            },
          },
        ],
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
          Object {
            "actionTypeId": "test2",
            "group": "default",
            "id": "2",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "enabled": true,
        "id": "1",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "scheduledTaskId": "task-123",
      }
    `);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([
      {
        id: '1',
        type: 'action',
      },
      {
        id: '2',
        type: 'action',
      },
    ]);
  });

  it('calls the createApiKey function', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    alertTypeRegistry.get.mockReturnValueOnce({
      id: '123',
      name: 'Test',
      actionGroups: ['default'],
      async executor() {},
    });
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
        alertTypeId: '123',
        scheduledTaskId: 'task-123',
      },
      references: [],
      version: '123',
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    alertsClientParams.createAPIKey.mockResolvedValueOnce({
      created: true,
      result: { id: '123', api_key: 'abc' },
    });
    savedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
        apiKey: Buffer.from('123:abc').toString('base64'),
        scheduledTaskId: 'task-123',
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    const result = await alertsClient.update({
      id: '1',
      data: {
        schedule: { interval: '10s' },
        name: 'abc',
        tags: ['foo'],
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
        ],
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "apiKey": "MTIzOmFiYw==",
        "enabled": true,
        "id": "1",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "scheduledTaskId": "task-123",
      }
    `);
    expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.update.mock.calls[0]).toHaveLength(4);
    expect(savedObjectsClient.update.mock.calls[0][0]).toEqual('alert');
    expect(savedObjectsClient.update.mock.calls[0][1]).toEqual('1');
    expect(savedObjectsClient.update.mock.calls[0][2]).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionRef": "action_0",
            "actionTypeId": "test",
            "group": "default",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "123",
        "apiKey": "MTIzOmFiYw==",
        "apiKeyOwner": "elastic",
        "enabled": true,
        "name": "abc",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "scheduledTaskId": "task-123",
        "tags": Array [
          "foo",
        ],
        "updatedBy": "elastic",
      }
    `);
    expect(savedObjectsClient.update.mock.calls[0][3]).toMatchInlineSnapshot(`
                                                Object {
                                                  "references": Array [
                                                    Object {
                                                      "id": "1",
                                                      "name": "action_0",
                                                      "type": "action",
                                                    },
                                                  ],
                                                  "version": "123",
                                                }
                                `);
  });

  it('should validate params', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    alertTypeRegistry.get.mockReturnValueOnce({
      id: '123',
      name: 'Test',
      actionGroups: ['default'],
      validate: {
        params: schema.object({
          param1: schema.string(),
        }),
      },
      async executor() {},
    });
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
      },
      references: [],
    });
    await expect(
      alertsClient.update({
        id: '1',
        data: {
          schedule: { interval: '10s' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          actions: [
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
            },
          ],
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"params invalid: [param1]: expected value of type [string] but got [undefined]"`
    );
  });

  describe('updating an alert schedule', () => {
    function mockApiCalls(
      alertId: string,
      taskId: string,
      currentSchedule: IntervalSchedule,
      updatedSchedule: IntervalSchedule
    ) {
      // mock return values from deps
      alertTypeRegistry.get.mockReturnValueOnce({
        id: '123',
        name: 'Test',
        actionGroups: ['default'],
        async executor() {},
      });
      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '1',
            type: 'action',
            attributes: {
              actionTypeId: 'test',
            },
            references: [],
          },
        ],
      });
      savedObjectsClient.get.mockResolvedValueOnce({
        id: alertId,
        type: 'alert',
        attributes: {
          enabled: true,
          alertTypeId: '123',
          schedule: currentSchedule,
          scheduledTaskId: 'task-123',
        },
        references: [],
        version: '123',
      });

      taskManager.schedule.mockResolvedValueOnce({
        id: taskId,
        taskType: 'alerting:123',
        scheduledAt: new Date(),
        attempts: 1,
        status: TaskStatus.Idle,
        runAt: new Date(),
        startedAt: null,
        retryAt: null,
        state: {},
        params: {},
        ownerId: null,
      });
      savedObjectsClient.update.mockResolvedValueOnce({
        id: alertId,
        type: 'alert',
        attributes: {
          enabled: true,
          schedule: updatedSchedule,
          actions: [
            {
              group: 'default',
              actionRef: 'action_0',
              actionTypeId: 'test',
              params: {
                foo: true,
              },
            },
          ],
          scheduledTaskId: taskId,
        },
        references: [
          {
            name: 'action_0',
            type: 'action',
            id: alertId,
          },
        ],
      });

      taskManager.runNow.mockReturnValueOnce(Promise.resolve({ id: alertId }));
    }

    test('updating the alert schedule should rerun the task immediately', async () => {
      const alertId = uuid.v4();
      const taskId = uuid.v4();
      const alertsClient = new AlertsClient(alertsClientParams);

      mockApiCalls(alertId, taskId, { interval: '60m' }, { interval: '10s' });

      await alertsClient.update({
        id: alertId,
        data: {
          schedule: { interval: '10s' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          actions: [
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
            },
          ],
        },
      });

      expect(taskManager.runNow).toHaveBeenCalledWith(taskId);
    });

    test('updating the alert without changing the schedule should not rerun the task', async () => {
      const alertId = uuid.v4();
      const taskId = uuid.v4();
      const alertsClient = new AlertsClient(alertsClientParams);

      mockApiCalls(alertId, taskId, { interval: '10s' }, { interval: '10s' });

      await alertsClient.update({
        id: alertId,
        data: {
          schedule: { interval: '10s' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          actions: [
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
            },
          ],
        },
      });

      expect(taskManager.runNow).not.toHaveBeenCalled();
    });

    test('updating the alert should not wait for the rerun the task to complete', async done => {
      const alertId = uuid.v4();
      const taskId = uuid.v4();
      const alertsClient = new AlertsClient(alertsClientParams);

      mockApiCalls(alertId, taskId, { interval: '10s' }, { interval: '30s' });

      const resolveAfterAlertUpdatedCompletes = resolvable<{ id: string }>();
      resolveAfterAlertUpdatedCompletes.then(() => done());

      taskManager.runNow.mockReset();
      taskManager.runNow.mockReturnValue(resolveAfterAlertUpdatedCompletes);

      await alertsClient.update({
        id: alertId,
        data: {
          schedule: { interval: '10s' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          actions: [
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
            },
          ],
        },
      });

      expect(taskManager.runNow).toHaveBeenCalled();

      resolveAfterAlertUpdatedCompletes.resolve({ id: alertId });
    });

    test('logs when the rerun of an alerts underlying task fails', async () => {
      const alertId = uuid.v4();
      const taskId = uuid.v4();
      const alertsClient = new AlertsClient(alertsClientParams);

      mockApiCalls(alertId, taskId, { interval: '10s' }, { interval: '30s' });

      taskManager.runNow.mockReset();
      taskManager.runNow.mockRejectedValue(new Error('Failed to run alert'));

      await alertsClient.update({
        id: alertId,
        data: {
          schedule: { interval: '10s' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          actions: [
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
            },
          ],
        },
      });

      expect(taskManager.runNow).toHaveBeenCalled();

      expect(alertsClientParams.logger.error).toHaveBeenCalledWith(
        `Alert update failed to run its underlying task. TaskManager runNow failed with Error: Failed to run alert`
      );
    });
  });
});

describe('updateApiKey()', () => {
  test('updates the API key for the alert', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
      },
      version: '123',
      references: [],
    });
    alertsClientParams.createAPIKey.mockResolvedValueOnce({
      created: true,
      result: { id: '123', api_key: 'abc' },
    });

    await alertsClient.updateApiKey({ id: '1' });
    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        apiKey: Buffer.from('123:abc').toString('base64'),
        apiKeyOwner: 'elastic',
        updatedBy: 'elastic',
      },
      { version: '123' }
    );
  });
});
