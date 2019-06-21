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

const actionTypeRegistry = actionTypeRegistryMock.create();
const mockedEncryptedSavedObjectsPlugin = encryptedSavedObjectsMock.create();

const actionType = {
  id: '1',
  name: '1',
  executor: jest.fn(),
};

actionTypeRegistry.get.mockReturnValue(actionType);

const getCreateTaskRunnerFunctionParams = {
  getServices() {
    return {
      log: jest.fn(),
      callCluster: jest.fn(),
      savedObjectsClient: SavedObjectsClientMock.create(),
    };
  },
  actionTypeRegistry,
  encryptedSavedObjectsPlugin: mockedEncryptedSavedObjectsPlugin,
};

const taskInstanceMock = {
  runAt: new Date(),
  state: {},
  params: {
    id: '2',
    actionTypeParams: { baz: true },
    namespace: 'test',
  },
  taskType: 'actions:1',
};

beforeEach(() => jest.resetAllMocks());

test('executes the task by calling the executor with proper parameters', async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { execute } = require('./execute');
  execute.mockResolvedValueOnce({ success: true });
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  const runner = createTaskRunner({ taskInstance: taskInstanceMock });
  const runnerResult = await runner.run();

  expect(runnerResult).toBeUndefined();
  expect(execute).toHaveBeenCalledTimes(1);

  const executeCall = execute.mock.calls[0][0];
  expect(executeCall.namespace).toBe('test');
  expect(executeCall.actionTypeRegistry).toBeTruthy();
  expect(executeCall.encryptedSavedObjectsPlugin).toBeTruthy();
  expect(executeCall.actionId).toBe('2');
  expect(executeCall.services).toBeTruthy();
  expect(executeCall.params).toEqual({
    baz: true,
  });
});
