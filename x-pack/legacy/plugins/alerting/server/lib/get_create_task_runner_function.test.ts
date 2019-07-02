/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { AlertExecutorOptions } from '../types';
import { SavedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { getCreateTaskRunnerFunction } from './get_create_task_runner_function';

const mockedNow = new Date('2019-06-03T18:55:25.982Z');
const mockedLastRunAt = new Date('2019-06-03T18:55:20.982Z');
(global as any).Date = class Date extends global.Date {
  static now() {
    return mockedNow.getTime();
  }
};

const savedObjectsClient = SavedObjectsClientMock.create();

const getCreateTaskRunnerFunctionParams = {
  getServices() {
    return {
      log: jest.fn(),
      callCluster: jest.fn(),
      savedObjectsClient: SavedObjectsClientMock.create(),
    };
  },
  alertType: {
    id: 'test',
    name: 'My test alert',
    executor: jest.fn(),
  },
  fireAction: jest.fn(),
  internalSavedObjectsRepository: savedObjectsClient,
};

const mockedTaskInstance = {
  runAt: mockedLastRunAt,
  state: {
    scheduledRunAt: mockedLastRunAt,
  },
  taskType: 'alerting:test',
  params: {
    alertId: '1',
  },
};

const mockedAlertTypeSavedObject = {
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
};

beforeEach(() => jest.resetAllMocks());

test('successfully executes the task', async () => {
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
  const runner = createTaskRunner({ taskInstance: mockedTaskInstance });
  const runnerResult = await runner.run();
  expect(runnerResult).toMatchInlineSnapshot(`
Object {
  "runAt": 2019-06-03T18:55:30.982Z,
  "state": Object {
    "alertInstances": Object {},
    "alertTypeState": undefined,
    "previousScheduledRunAt": 2019-06-03T18:55:20.982Z,
    "scheduledRunAt": 2019-06-03T18:55:30.982Z,
  },
}
`);
  expect(getCreateTaskRunnerFunctionParams.alertType.executor).toHaveBeenCalledTimes(1);
  const call = getCreateTaskRunnerFunctionParams.alertType.executor.mock.calls[0][0];
  expect(call.params).toMatchInlineSnapshot(`
Object {
  "bar": true,
}
`);
  expect(call.scheduledRunAt).toMatchInlineSnapshot(`2019-06-03T18:55:20.982Z`);
  expect(call.state).toMatchInlineSnapshot(`Object {}`);
  expect(call.services.alertInstanceFactory).toBeTruthy();
  expect(call.services.callCluster).toBeTruthy();
  expect(call.services).toBeTruthy();
});

test('fireAction is called per alert instance that fired', async () => {
  getCreateTaskRunnerFunctionParams.alertType.executor.mockImplementation(
    ({ services }: AlertExecutorOptions) => {
      services.alertInstanceFactory('1').fire('default');
    }
  );
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
  const runner = createTaskRunner({ taskInstance: mockedTaskInstance });
  await runner.run();
  expect(getCreateTaskRunnerFunctionParams.fireAction).toHaveBeenCalledTimes(1);
  expect(getCreateTaskRunnerFunctionParams.fireAction.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  Object {
    "basePath": undefined,
    "id": "1",
    "params": Object {
      "foo": true,
    },
  },
]
`);
});

test('persists alertInstances passed in from state, only if they fire', async () => {
  getCreateTaskRunnerFunctionParams.alertType.executor.mockImplementation(
    ({ services }: AlertExecutorOptions) => {
      services.alertInstanceFactory('1').fire('default');
    }
  );
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
  const runner = createTaskRunner({
    taskInstance: {
      ...mockedTaskInstance,
      state: {
        ...mockedTaskInstance.state,
        alertInstances: {
          '1': { meta: {}, state: { bar: false } },
          '2': { meta: {}, state: { bar: false } },
        },
      },
    },
  });
  const runnerResult = await runner.run();
  expect(runnerResult.state.alertInstances).toMatchInlineSnapshot(`
Object {
  "1": Object {
    "meta": Object {
      "lastFired": 1559588125982,
    },
    "state": Object {
      "bar": false,
    },
  },
}
`);
});

test('validates params before executing the alert type', async () => {
  const createTaskRunner = getCreateTaskRunnerFunction({
    ...getCreateTaskRunnerFunctionParams,
    alertType: {
      ...getCreateTaskRunnerFunctionParams.alertType,
      validate: {
        params: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
      },
    },
  });
  savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
  const runner = createTaskRunner({ taskInstance: mockedTaskInstance });
  await expect(runner.run()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"alertTypeParams invalid: child \\"param1\\" fails because [\\"param1\\" is required]"`
  );
});
