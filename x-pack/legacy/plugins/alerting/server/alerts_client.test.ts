/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { AlertsClient } from './alerts_client';
import { SavedObjectsClientMock } from '../../../../../src/core/server/mocks';
import { taskManagerMock } from '../../task_manager/task_manager.mock';
import { alertTypeRegistryMock } from './alert_type_registry.mock';

const taskManager = taskManagerMock.create();
const alertTypeRegistry = alertTypeRegistryMock.create();
const savedObjectsClient = SavedObjectsClientMock.create();

const alertsClientParams = {
  log: jest.fn(),
  taskManager,
  alertTypeRegistry,
  savedObjectsClient,
  basePath: '/s/default',
};

beforeEach(() => jest.resetAllMocks());

const mockedDate = new Date('2019-02-12T21:01:22.479Z');
(global as any).Date = class Date {
  constructor() {
    return mockedDate;
  }
  static now() {
    return mockedDate.getTime();
  }
};

function getMockData() {
  return {
    alertTypeId: '123',
    interval: 10000,
    alertTypeParams: {
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
  };
}

describe('create()', () => {
  test('creates an alert', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const data = getMockData();
    alertTypeRegistry.get.mockReturnValueOnce({
      id: '123',
      name: 'Test',
      async executor() {},
    });
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        interval: 10000,
        alertTypeParams: {
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
    taskManager.schedule.mockResolvedValueOnce({
      id: 'task-123',
      taskType: 'alerting:123',
      sequenceNumber: 1,
      primaryTerm: 1,
      scheduledAt: new Date(),
      attempts: 1,
      status: 'idle',
      runAt: new Date(),
      state: {},
      params: {},
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
      "group": "default",
      "id": "1",
      "params": Object {
        "foo": true,
      },
    },
  ],
  "alertTypeId": "123",
  "alertTypeParams": Object {
    "bar": true,
  },
  "id": "1",
  "interval": 10000,
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
      "group": "default",
      "params": Object {
        "foo": true,
      },
    },
  ],
  "alertTypeId": "123",
  "alertTypeParams": Object {
    "bar": true,
  },
  "interval": 10000,
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
      "basePath": "/s/default",
    },
    "scope": Array [
      "alerting",
    ],
    "state": Object {
      "alertInstances": Object {},
      "alertTypeState": Object {},
      "previousScheduledRunAt": null,
      "scheduledRunAt": 2019-02-12T21:01:22.479Z,
    },
    "taskType": "alerting:123",
  },
]
`);
    expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.update.mock.calls[0]).toHaveLength(4);
    expect(savedObjectsClient.update.mock.calls[0][0]).toEqual('alert');
    expect(savedObjectsClient.update.mock.calls[0][1]).toEqual('1');
    expect(savedObjectsClient.update.mock.calls[0][2]).toMatchInlineSnapshot(`
Object {
  "scheduledTaskId": "task-123",
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
}
`);
  });

  test('should validate alertTypeParams', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const data = getMockData();
    alertTypeRegistry.get.mockReturnValueOnce({
      id: '123',
      name: 'Test',
      validate: {
        params: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
      },
      async executor() {},
    });
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"alertTypeParams invalid: child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });

  test('throws error if create saved object fails', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const data = getMockData();
    alertTypeRegistry.get.mockReturnValueOnce({
      id: '123',
      name: 'Test',
      async executor() {},
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
      async executor() {},
    });
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        interval: 10000,
        alertTypeParams: {
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
      async executor() {},
    });
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        interval: 10000,
        alertTypeParams: {
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
    taskManager.schedule.mockRejectedValueOnce(new Error('Task manager error'));
    savedObjectsClient.delete.mockRejectedValueOnce(new Error('Saved object delete error'));
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Task manager error"`
    );
    expect(alertsClientParams.log).toHaveBeenCalledTimes(1);
    expect(alertsClientParams.log.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  Array [
    "alerting",
    "error",
  ],
  "Failed to cleanup alert \\"1\\" after scheduling task failed. Error: Saved object delete error",
]
`);
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
});

describe('get()', () => {
  test('calls saved objects client with given params', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        interval: 10000,
        alertTypeParams: {
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
  "alertTypeParams": Object {
    "bar": true,
  },
  "id": "1",
  "interval": 10000,
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
        interval: 10000,
        alertTypeParams: {
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
            interval: 10000,
            alertTypeParams: {
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
Array [
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
    "alertTypeParams": Object {
      "bar": true,
    },
    "id": "1",
    "interval": 10000,
  },
]
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
        interval: 10000,
        alertTypeParams: {
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
    taskManager.remove.mockResolvedValueOnce({
      index: '.task_manager',
      id: 'task-123',
      sequenceNumber: 1,
      primaryTerm: 1,
      result: '',
    });
    const result = await alertsClient.delete({ id: '1' });
    expect(result).toMatchInlineSnapshot(`
Object {
  "success": true,
}
`);
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
    savedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        interval: 10000,
        alertTypeParams: {
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
    const result = await alertsClient.update({
      id: '1',
      data: {
        interval: 10000,
        alertTypeParams: {
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
      options: {
        version: '123',
      },
    });
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
  "alertTypeParams": Object {
    "bar": true,
  },
  "id": "1",
  "interval": 10000,
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
      "group": "default",
      "params": Object {
        "foo": true,
      },
    },
  ],
  "alertTypeParams": Object {
    "bar": true,
  },
  "interval": 10000,
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

  it('should validate alertTypeParams', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    alertTypeRegistry.get.mockReturnValueOnce({
      id: '123',
      name: 'Test',
      validate: {
        params: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
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
          interval: 10000,
          alertTypeParams: {
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
        options: {
          version: '123',
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"alertTypeParams invalid: child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });
});
