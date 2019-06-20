/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/plugin.mock';
import { getCreateTaskRunnerFunction } from './get_create_task_runner_function';
import { SavedObjectsClientMock } from '../../../../../../src/core/server/mocks';

const mockedEncryptedSavedObjectsPlugin = encryptedSavedObjectsMock.create();

const getCreateTaskRunnerFunctionParams = {
  getServices() {
    return {
      log: jest.fn(),
      callCluster: jest.fn(),
      savedObjectsClient: SavedObjectsClientMock.create(),
    };
  },
  actionType: {
    id: '1',
    name: '1',
    executor: jest.fn(),
  },
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

test('successfully executes the task', async () => {
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  const runner = createTaskRunner({ taskInstance: taskInstanceMock });
  mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '1',
    type: 'action',
    references: [],
    attributes: {
      actionTypeConfig: { foo: true },
      actionTypeConfigSecrets: { bar: true },
    },
  });
  const runnerResult = await runner.run();
  expect(runnerResult).toBeUndefined();
  expect(mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser).toHaveBeenCalledTimes(1);
  expect(mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mock.calls[0])
    .toMatchInlineSnapshot(`
Array [
  "action",
  "2",
  Object {
    "namespace": "test",
  },
]
`);
  expect(getCreateTaskRunnerFunctionParams.actionType.executor).toHaveBeenCalledTimes(1);
  const call = getCreateTaskRunnerFunctionParams.actionType.executor.mock.calls[0][0];
  expect(call.config).toMatchInlineSnapshot(`
Object {
  "bar": true,
  "foo": true,
}
`);
  expect(call.params).toMatchInlineSnapshot(`
Object {
  "baz": true,
}
`);
  expect(call.services).toBeTruthy();
});

test('validates params before executing the task', async () => {
  const createTaskRunner = getCreateTaskRunnerFunction({
    ...getCreateTaskRunnerFunctionParams,
    actionType: {
      ...getCreateTaskRunnerFunctionParams.actionType,
      validate: {
        params: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
      },
    },
  });
  const runner = createTaskRunner({ taskInstance: taskInstanceMock });
  mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '1',
    type: 'action',
    references: [],
    attributes: {
      actionTypeConfig: { foo: true },
      actionTypeConfigSecrets: { bar: true },
    },
  });
  await expect(runner.run()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"params invalid: child \\"param1\\" fails because [\\"param1\\" is required]"`
  );
});

test('validates config before executing the task', async () => {
  const createTaskRunner = getCreateTaskRunnerFunction({
    ...getCreateTaskRunnerFunctionParams,
    actionType: {
      ...getCreateTaskRunnerFunctionParams.actionType,
      validate: {
        config: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
      },
    },
  });
  const runner = createTaskRunner({ taskInstance: taskInstanceMock });
  mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '1',
    type: 'action',
    references: [],
    attributes: {
      actionTypeConfig: { foo: true },
      actionTypeConfigSecrets: { bar: true },
    },
  });
  await expect(runner.run()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"The following actionTypeConfig attributes are invalid: param1 [any.required]"`
  );
});
