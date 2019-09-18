/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./execute', () => ({
  execute: jest.fn(),
}));

import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/plugin.mock';
import { getCreateTaskRunnerFunction } from './get_create_task_runner_function';
import { SavedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { actionTypeRegistryMock } from '../action_type_registry.mock';
import { ExecutorError } from './executor_error';

const spaceIdToNamespace = jest.fn();
const actionTypeRegistry = actionTypeRegistryMock.create();
const mockedEncryptedSavedObjectsPlugin = encryptedSavedObjectsMock.create();

const actionType = {
  id: '1',
  name: '1',
  executor: jest.fn(),
};
const services = {
  log: jest.fn(),
  callCluster: jest.fn(),
  savedObjectsClient: SavedObjectsClientMock.create(),
};

actionTypeRegistry.get.mockReturnValue(actionType);

const getCreateTaskRunnerFunctionParams = {
  getServices: jest.fn().mockReturnValue(services),
  actionTypeRegistry,
  spaceIdToNamespace,
  encryptedSavedObjectsPlugin: mockedEncryptedSavedObjectsPlugin,
  getBasePath: jest.fn().mockReturnValue(undefined),
  isSecurityEnabled: true,
};

const taskInstanceMock = {
  runAt: new Date(),
  state: {},
  params: {
    spaceId: 'test',
    actionTaskParamsId: '3',
  },
  taskType: 'actions:1',
};

beforeEach(() => {
  jest.resetAllMocks();
  getCreateTaskRunnerFunctionParams.getServices.mockReturnValue(services);
});

test('executes the task by calling the executor with proper parameters', async () => {
  const { execute: mockExecute } = jest.requireMock('./execute');
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  const runner = createTaskRunner({ taskInstance: taskInstanceMock });

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

  const runnerResult = await runner.run();

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
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  const runner = createTaskRunner({ taskInstance: taskInstanceMock });

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
    await runner.run();
    throw new Error('Should have thrown');
  } catch (e) {
    expect(e instanceof ExecutorError).toEqual(true);
    expect(e.data).toEqual({ foo: true });
    expect(e.retry).toEqual(false);
  }
});

test('uses API key when provided', async () => {
  const { execute: mockExecute } = jest.requireMock('./execute');
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  const runner = createTaskRunner({ taskInstance: taskInstanceMock });

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
  const { execute: mockExecute } = jest.requireMock('./execute');
  const createTaskRunner = getCreateTaskRunnerFunction({
    ...getCreateTaskRunnerFunctionParams,
    isSecurityEnabled: false,
  });
  const runner = createTaskRunner({ taskInstance: taskInstanceMock });

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

  await runner.run();

  expect(getCreateTaskRunnerFunctionParams.getServices).toHaveBeenCalledWith({
    getBasePath: expect.anything(),
    headers: {},
  });
});

test(`doesn't use API key when provided and isSecurityEnabled is set to false`, async () => {
  const { execute: mockExecute } = jest.requireMock('./execute');
  const createTaskRunner = getCreateTaskRunnerFunction({
    ...getCreateTaskRunnerFunctionParams,
    isSecurityEnabled: false,
  });
  const runner = createTaskRunner({ taskInstance: taskInstanceMock });

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

  await runner.run();

  expect(getCreateTaskRunnerFunctionParams.getServices).toHaveBeenCalledWith({
    getBasePath: expect.anything(),
    headers: {},
  });
});

test(`throws an error when isSecurityEnabled is true but key isn't provided`, async () => {
  const { execute: mockExecute } = jest.requireMock('./execute');
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  const runner = createTaskRunner({ taskInstance: taskInstanceMock });

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

  await expect(runner.run()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"API key is required. The attribute \\"apiKey\\" is missing."`
  );
});
