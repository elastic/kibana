/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { schema } from '@kbn/config-schema';
import { AlertExecutorOptions } from '../types';
import { ConcreteTaskInstance, TaskStatus } from '../../../task_manager';
import { TaskRunnerContext, TaskRunnerFactory } from './task_runner_factory';
import { encryptedSavedObjectsMock } from '../../../../../plugins/encrypted_saved_objects/server/mocks';
import {
  savedObjectsClientMock,
  loggingServiceMock,
} from '../../../../../../src/core/server/mocks';

const alertType = {
  id: 'test',
  name: 'My test alert',
  actionGroups: ['default'],
  executor: jest.fn(),
};
let fakeTimer: sinon.SinonFakeTimers;
let taskRunnerFactory: TaskRunnerFactory;
let mockedTaskInstance: ConcreteTaskInstance;

describe('Task Runner Factory', () => {
  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers();
    mockedTaskInstance = {
      id: '',
      attempts: 0,
      status: TaskStatus.Running,
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
      ownerId: null,
    };
    taskRunnerFactory = new TaskRunnerFactory();
    taskRunnerFactory.initialize(taskRunnerFactoryInitializerParams);
  });

  afterAll(() => fakeTimer.restore());

  const savedObjectsClient = savedObjectsClientMock.create();
  const encryptedSavedObjectsPlugin = encryptedSavedObjectsMock.createStart();
  const services = {
    log: jest.fn(),
    callCluster: jest.fn(),
    savedObjectsClient,
  };

  const taskRunnerFactoryInitializerParams: jest.Mocked<TaskRunnerContext> = {
    getServices: jest.fn().mockReturnValue(services),
    executeAction: jest.fn(),
    encryptedSavedObjectsPlugin,
    logger: loggingServiceMock.create().get(),
    spaceIdToNamespace: jest.fn().mockReturnValue(undefined),
    getBasePath: jest.fn().mockReturnValue(undefined),
  };

  const mockedAlertTypeSavedObject = {
    id: '1',
    type: 'alert',
    attributes: {
      enabled: true,
      alertTypeId: '123',
      schedule: { interval: '10s' },
      mutedInstanceIds: [],
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
  };

  beforeEach(() => {
    jest.resetAllMocks();
    taskRunnerFactoryInitializerParams.getServices.mockReturnValue(services);
  });

  test(`throws an error if factory isn't initialized`, () => {
    const factory = new TaskRunnerFactory();
    expect(() =>
      factory.create(alertType, { taskInstance: mockedTaskInstance })
    ).toThrowErrorMatchingInlineSnapshot(`"TaskRunnerFactory not initialized"`);
  });

  test(`throws an error if factory is already initialized`, () => {
    const factory = new TaskRunnerFactory();
    factory.initialize(taskRunnerFactoryInitializerParams);
    expect(() =>
      factory.initialize(taskRunnerFactoryInitializerParams)
    ).toThrowErrorMatchingInlineSnapshot(`"TaskRunnerFactory already initialized"`);
  });

  test('successfully executes the task', async () => {
    const taskRunner = taskRunnerFactory.create(alertType, {
      taskInstance: mockedTaskInstance,
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
    const runnerResult = await taskRunner.run();
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
    expect(alertType.executor).toHaveBeenCalledTimes(1);
    const call = alertType.executor.mock.calls[0][0];
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
    alertType.executor.mockImplementation(
      ({ services: executorServices }: AlertExecutorOptions) => {
        executorServices.alertInstanceFactory('1').scheduleActions('default');
      }
    );
    const taskRunner = taskRunnerFactory.create(alertType, {
      taskInstance: mockedTaskInstance,
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
    await taskRunner.run();
    expect(taskRunnerFactoryInitializerParams.executeAction).toHaveBeenCalledTimes(1);
    expect(taskRunnerFactoryInitializerParams.executeAction.mock.calls[0]).toMatchInlineSnapshot(`
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
    alertType.executor.mockImplementation(
      ({ services: executorServices }: AlertExecutorOptions) => {
        executorServices.alertInstanceFactory('1').scheduleActions('default');
      }
    );
    const taskRunner = taskRunnerFactory.create(alertType, {
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
    savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
    encryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });
    const runnerResult = await taskRunner.run();
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
    const taskRunner = taskRunnerFactory.create(
      {
        ...alertType,
        validate: {
          params: schema.object({
            param1: schema.string(),
          }),
        },
      },
      { taskInstance: mockedTaskInstance }
    );
    savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
    encryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });
    expect(await taskRunner.run()).toMatchInlineSnapshot(`
      Object {
        "runAt": 1970-01-01T00:00:10.000Z,
        "state": Object {
          "previousStartedAt": 1970-01-01T00:00:00.000Z,
          "startedAt": 1969-12-31T23:55:00.000Z,
        },
      }
    `);
    expect(taskRunnerFactoryInitializerParams.logger.error).toHaveBeenCalledWith(
      `Executing Alert \"1\" has resulted in Error: params invalid: [param1]: expected value of type [string] but got [undefined]`
    );
  });

  test('throws error if reference not found', async () => {
    const taskRunner = taskRunnerFactory.create(alertType, {
      taskInstance: mockedTaskInstance,
    });
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
    expect(await taskRunner.run()).toMatchInlineSnapshot(`
      Object {
        "runAt": 1970-01-01T00:00:10.000Z,
        "state": Object {
          "previousStartedAt": 1970-01-01T00:00:00.000Z,
          "startedAt": 1969-12-31T23:55:00.000Z,
        },
      }
    `);
    expect(taskRunnerFactoryInitializerParams.logger.error).toHaveBeenCalledWith(
      `Executing Alert \"1\" has resulted in Error: Action reference \"action_0\" not found in alert id: 1`
    );
  });

  test('uses API key when provided', async () => {
    const taskRunner = taskRunnerFactory.create(alertType, {
      taskInstance: mockedTaskInstance,
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

    await taskRunner.run();
    expect(taskRunnerFactoryInitializerParams.getServices).toHaveBeenCalledWith({
      getBasePath: expect.anything(),
      headers: {
        // base64 encoded "123:abc"
        authorization: 'ApiKey MTIzOmFiYw==',
      },
      path: '/',
      route: { settings: {} },
      url: {
        href: '/',
      },
      raw: {
        req: {
          url: '/',
        },
      },
    });
  });

  test(`doesn't use API key when not provided`, async () => {
    const factory = new TaskRunnerFactory();
    factory.initialize(taskRunnerFactoryInitializerParams);
    const taskRunner = factory.create(alertType, {
      taskInstance: mockedTaskInstance,
    });
    savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
    encryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {},
      references: [],
    });

    await taskRunner.run();

    expect(taskRunnerFactoryInitializerParams.getServices).toHaveBeenCalledWith({
      getBasePath: expect.anything(),
      headers: {},
      path: '/',
      route: { settings: {} },
      url: {
        href: '/',
      },
      raw: {
        req: {
          url: '/',
        },
      },
    });
  });

  test('recovers gracefully when the AlertType executor throws an exception', async () => {
    alertType.executor.mockImplementation(
      ({ services: executorServices }: AlertExecutorOptions) => {
        throw new Error('OMG');
      }
    );

    const taskRunner = taskRunnerFactory.create(alertType, {
      taskInstance: mockedTaskInstance,
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

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toMatchInlineSnapshot(`
      Object {
        "runAt": 1970-01-01T00:00:10.000Z,
        "state": Object {
          "previousStartedAt": 1970-01-01T00:00:00.000Z,
          "startedAt": 1969-12-31T23:55:00.000Z,
        },
      }
    `);
  });
});
