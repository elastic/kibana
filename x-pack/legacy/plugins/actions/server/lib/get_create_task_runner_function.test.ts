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
  unencryptedAttributes: [],
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
  const { execute: mockExecute } = jest.requireMock('./execute');
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  const runner = createTaskRunner({ taskInstance: taskInstanceMock });
  const runnerResult = await runner.run();

  expect(runnerResult).toBeUndefined();
  expect(mockExecute).toHaveBeenCalledWith({
    namespace: 'test',
    actionId: '2',
    actionTypeRegistry,
    encryptedSavedObjectsPlugin: mockedEncryptedSavedObjectsPlugin,
    services: expect.anything(),
    params: { baz: true },
  });
});
