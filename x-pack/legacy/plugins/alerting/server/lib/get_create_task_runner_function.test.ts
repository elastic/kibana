/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { schema } from '@kbn/config-schema';
import { AlertExecutorOptions } from '../types';
import { ConcreteTaskInstance } from '../../../task_manager';
import { SavedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { getCreateTaskRunnerFunction } from './get_create_task_runner_function';

let fakeTimer: sinon.SinonFakeTimers;
let mockedTaskInstance: ConcreteTaskInstance;

beforeAll(() => {
  fakeTimer = sinon.useFakeTimers();
  mockedTaskInstance = {
    id: '',
    attempts: 0,
    status: 'running',
    version: '123',
    runAt: new Date(),
    scheduledAt: new Date(),
    startedAt: new Date(),
    retryAt: new Date(Date.now() + 5 * 60 * 1000),
    state: {
      startedAt: new Date(Date.now() - 5 * 60 * 1000),
    },
    taskType: 'alerting:test',
    params: {
      alertId: '1',
    },
  };
});

afterAll(() => fakeTimer.restore());

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
  spaceIdToNamespace: jest.fn().mockReturnValue(undefined),
  getBasePath: jest.fn().mockReturnValue(undefined),
};

const mockedAlertTypeSavedObject = {
  id: '1',
  type: 'alert',
  attributes: {
    enabled: true,
    alertTypeId: '123',
    interval: '10s',
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
          "runAt": 1970-01-01T00:00:10.000Z,
          "state": Object {
            "alertInstances": Object {},
            "alertTypeState": undefined,
            "previousStartedAt": 1970-01-01T00:00:00.000Z,
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
  expect(call.startedAt).toMatchInlineSnapshot(`1970-01-01T00:00:00.000Z`);
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
        "id": "1",
        "params": Object {
          "foo": true,
        },
        "spaceId": undefined,
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
              "lastFired": 0,
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
        params: schema.object({
          param1: schema.string(),
        }),
      },
    },
  });
  savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
  const runner = createTaskRunner({ taskInstance: mockedTaskInstance });
  await expect(runner.run()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"alertTypeParams invalid: [param1]: expected value of type [string] but got [undefined]"`
  );
});
