/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./execute', () => ({
  execute: jest.fn(),
}));

import sinon from 'sinon';
import { ExecutorError } from './executor_error';
import { ConcreteTaskInstance, TaskStatus } from '../../../task_manager';
import { TaskRunnerFactory } from './task_runner_factory';
import { actionTypeRegistryMock } from '../action_type_registry.mock';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/plugin.mock';
import {
  SavedObjectsClientMock,
  loggingServiceMock,
} from '../../../../../../src/core/server/mocks';

const spaceIdToNamespace = jest.fn();
const actionTypeRegistry = actionTypeRegistryMock.create();
const mockedEncryptedSavedObjectsPlugin = encryptedSavedObjectsMock.create();

let fakeTimer: sinon.SinonFakeTimers;
let taskRunnerFactory: TaskRunnerFactory;
let mockedTaskInstance: ConcreteTaskInstance;

beforeAll(() => {
  fakeTimer = sinon.useFakeTimers();
  mockedTaskInstance = {
    id: '',
    runAt: new Date(),
    state: {},
    attempts: 0,
    status: 'running' as TaskStatus,
    startedAt: new Date(),
    scheduledAt: new Date(),
    retryAt: new Date(Date.now() + 5 * 60 * 1000),
    params: {
      spaceId: 'test',
      actionTaskParamsId: '3',
    },
    taskType: 'actions:1',
  };
  taskRunnerFactory = new TaskRunnerFactory();
  taskRunnerFactory.initialize(taskRunnerFactoryInitializerParams);
});

afterAll(() => fakeTimer.restore());

const services = {
  log: jest.fn(),
  callCluster: jest.fn(),
  savedObjectsClient: SavedObjectsClientMock.create(),
};
const taskRunnerFactoryInitializerParams = {
  logger: loggingServiceMock.create().get(),
  getServices: jest.fn().mockReturnValue(services),
  actionTypeRegistry,
  spaceIdToNamespace,
  encryptedSavedObjectsPlugin: mockedEncryptedSavedObjectsPlugin,
  getBasePath: jest.fn().mockReturnValue(undefined),
  isSecurityEnabled: true,
};

beforeEach(() => {
  jest.resetAllMocks();
  taskRunnerFactoryInitializerParams.getServices.mockReturnValue(services);
});

test(`throws an error if factory isn't initialized`, () => {
  const factory = new TaskRunnerFactory();
  expect(() =>
    factory.create({ taskInstance: mockedTaskInstance })
  ).toThrowErrorMatchingInlineSnapshot(`"TaskRunnerFactory not initialized"`);
});

test(`throws an error if factory is already initialized`, () => {
  const factory = new TaskRunnerFactory();
  factory.initialize(taskRunnerFactoryInitializerParams);
  expect(() =>
    factory.initialize(taskRunnerFactoryInitializerParams)
  ).toThrowErrorMatchingInlineSnapshot(`"TaskRunnerFactory already initialized"`);
});

test('executes the task by calling the executor with proper parameters', async () => {
  const { execute: mockExecute } = jest.requireMock('./execute');
  const taskRunner = taskRunnerFactory.create({
    taskInstance: mockedTaskInstance,
  });

  mockExecute.mockResolvedValueOnce({ status: 'ok' });
  spaceIdToNamespace.mockReturnValueOnce('namespace-test');
  mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [],
  });

  const runnerResult = await taskRunner.run();

  expect(runnerResult).toBeUndefined();
  expect(spaceIdToNamespace).toHaveBeenCalledWith('test');
  expect(mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser).toHaveBeenCalledWith(
    'action_task_params',
    '3',
    { namespace: 'namespace-test' }
  );
  expect(mockExecute).toHaveBeenCalledWith({
    namespace: 'namespace-test',
    actionId: '2',
    actionTypeRegistry,
    encryptedSavedObjectsPlugin: mockedEncryptedSavedObjectsPlugin,
    services: expect.anything(),
    params: { baz: true },
  });
});

test('throws an error with suggested retry logic when return status is error', async () => {
  const { execute: mockExecute } = jest.requireMock('./execute');
  const taskRunner = taskRunnerFactory.create({
    taskInstance: mockedTaskInstance,
  });

  mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [],
  });
  mockExecute.mockResolvedValueOnce({
    status: 'error',
    message: 'Error message',
    data: { foo: true },
    retry: false,
  });

  try {
    await taskRunner.run();
    throw new Error('Should have thrown');
  } catch (e) {
    expect(e instanceof ExecutorError).toEqual(true);
    expect(e.data).toEqual({ foo: true });
    expect(e.retry).toEqual(false);
  }
});

test('uses API key when provided', async () => {
  const { execute: mockExecute } = jest.requireMock('./execute');
  const taskRunner = taskRunnerFactory.create({
    taskInstance: mockedTaskInstance,
  });

  mockExecute.mockResolvedValueOnce({ status: 'ok' });
  spaceIdToNamespace.mockReturnValueOnce('namespace-test');
  mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
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
  });
});

test(`doesn't use API key when not provided`, async () => {
  const { execute: mockExecute } = jest.requireMock('./execute');
  const factory = new TaskRunnerFactory();
  factory.initialize({
    ...taskRunnerFactoryInitializerParams,
    isSecurityEnabled: false,
  });
  const taskRunner = factory.create({ taskInstance: mockedTaskInstance });

  mockExecute.mockResolvedValueOnce({ status: 'ok' });
  spaceIdToNamespace.mockReturnValueOnce('namespace-test');
  mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
    },
    references: [],
  });

  await taskRunner.run();

  expect(taskRunnerFactoryInitializerParams.getServices).toHaveBeenCalledWith({
    getBasePath: expect.anything(),
    headers: {},
  });
});

test(`doesn't use API key when provided and isSecurityEnabled is set to false`, async () => {
  const { execute: mockExecute } = jest.requireMock('./execute');
  const factory = new TaskRunnerFactory();
  factory.initialize({
    ...taskRunnerFactoryInitializerParams,
    isSecurityEnabled: false,
  });
  const taskRunner = factory.create({ taskInstance: mockedTaskInstance });

  mockExecute.mockResolvedValueOnce({ status: 'ok' });
  spaceIdToNamespace.mockReturnValueOnce('namespace-test');
  mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [],
  });

  await taskRunner.run();

  expect(taskRunnerFactoryInitializerParams.getServices).toHaveBeenCalledWith({
    getBasePath: expect.anything(),
    headers: {},
  });
});

test(`throws an error when isSecurityEnabled is true but key isn't provided`, async () => {
  const { execute: mockExecute } = jest.requireMock('./execute');
  const taskRunner = taskRunnerFactory.create({
    taskInstance: mockedTaskInstance,
  });

  mockExecute.mockResolvedValueOnce({ status: 'ok' });
  spaceIdToNamespace.mockReturnValueOnce('namespace-test');
  mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
    },
    references: [],
  });

  await expect(taskRunner.run()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"API key is required. The attribute \\"apiKey\\" is missing."`
  );
});
