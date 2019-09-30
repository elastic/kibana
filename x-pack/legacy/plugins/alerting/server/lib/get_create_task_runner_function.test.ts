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
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/plugin.mock';

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
const encryptedSavedObjectsPlugin = encryptedSavedObjectsMock.create();
const services = {
  log: jest.fn(),
  callCluster: jest.fn(),
  savedObjectsClient,
};

const getCreateTaskRunnerFunctionParams = {
  isSecurityEnabled: true,
  getServices: jest.fn().mockReturnValue(services),
  alertType: {
    id: 'test',
    name: 'My test alert',
    actionGroups: ['default'],
    executor: jest.fn(),
  },
  executeAction: jest.fn(),
  encryptedSavedObjectsPlugin,
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
    mutedInstanceIds: [],
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

beforeEach(() => {
  jest.resetAllMocks();
  getCreateTaskRunnerFunctionParams.getServices.mockReturnValue(services);
});

test('successfully executes the task', async () => {
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
  encryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '1',
    type: 'alert',
    attributes: {
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [],
  });
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

test('executeAction is called per alert instance that is scheduled', async () => {
  getCreateTaskRunnerFunctionParams.alertType.executor.mockImplementation(
    ({ services: executorServices }: AlertExecutorOptions) => {
      executorServices.alertInstanceFactory('1').scheduleActions('default');
    }
  );
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
  encryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '1',
    type: 'alert',
    attributes: {
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [],
  });
  const runner = createTaskRunner({ taskInstance: mockedTaskInstance });
  await runner.run();
  expect(getCreateTaskRunnerFunctionParams.executeAction).toHaveBeenCalledTimes(1);
  expect(getCreateTaskRunnerFunctionParams.executeAction.mock.calls[0]).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "apiKey": "MTIzOmFiYw==",
                    "id": "1",
                    "params": Object {
                      "foo": true,
                    },
                    "spaceId": undefined,
                  },
                ]
        `);
});

test('persists alertInstances passed in from state, only if they are scheduled for execution', async () => {
  getCreateTaskRunnerFunctionParams.alertType.executor.mockImplementation(
    ({ services: executorServices }: AlertExecutorOptions) => {
      executorServices.alertInstanceFactory('1').scheduleActions('default');
    }
  );
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
  encryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '1',
    type: 'alert',
    attributes: {
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [],
  });
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
          "lastScheduledActions": Object {
            "date": 1970-01-01T00:00:00.000Z,
            "group": "default",
          },
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
  encryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '1',
    type: 'alert',
    attributes: {
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [],
  });
  const runner = createTaskRunner({ taskInstance: mockedTaskInstance });
  await expect(runner.run()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"alertTypeParams invalid: [param1]: expected value of type [string] but got [undefined]"`
  );
});

test('throws error if reference not found', async () => {
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  savedObjectsClient.get.mockResolvedValueOnce({
    ...mockedAlertTypeSavedObject,
    references: [],
  });
  encryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '1',
    type: 'alert',
    attributes: {
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [],
  });
  const runner = createTaskRunner({ taskInstance: mockedTaskInstance });
  await expect(runner.run()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Action reference \\"action_0\\" not found in alert id: 1"`
  );
});

test('uses API key when provided', async () => {
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
  encryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '1',
    type: 'alert',
    attributes: {
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [],
  });
  const runner = createTaskRunner({ taskInstance: mockedTaskInstance });

  await runner.run();
  expect(getCreateTaskRunnerFunctionParams.getServices).toHaveBeenCalledWith({
    getBasePath: expect.anything(),
    headers: {
      // base64 encoded "123:abc"
      authorization: 'ApiKey MTIzOmFiYw==',
    },
  });
});

test(`doesn't use API key when not provided`, async () => {
  const createTaskRunner = getCreateTaskRunnerFunction({
    ...getCreateTaskRunnerFunctionParams,
    isSecurityEnabled: false,
  });
  savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
  encryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '1',
    type: 'alert',
    attributes: {},
    references: [],
  });
  const runner = createTaskRunner({ taskInstance: mockedTaskInstance });

  await runner.run();

  expect(getCreateTaskRunnerFunctionParams.getServices).toHaveBeenCalledWith({
    getBasePath: expect.anything(),
    headers: {},
  });
});
