/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { execute } from './execute';
import { actionTypeRegistryMock } from '../action_type_registry.mock';
import { SavedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/plugin.mock';

const savedObjectsClient = SavedObjectsClientMock.create();

function getServices() {
  return {
    savedObjectsClient,
    log: jest.fn(),
    callCluster: jest.fn(),
  };
}
const encryptedSavedObjectsPlugin = encryptedSavedObjectsMock.create();
const actionTypeRegistry = actionTypeRegistryMock.create();

const executeParams = {
  actionId: '1',
  namespace: 'some-namespace',
  services: getServices(),
  params: {
    foo: true,
  },
  actionTypeRegistry,
  encryptedSavedObjectsPlugin,
};

beforeEach(() => jest.resetAllMocks());

test('successfully executes', async () => {
  const actionType = {
    id: 'test',
    name: 'Test',
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      actionTypeId: 'test',
      config: {
        bar: true,
      },
      secrets: {
        baz: true,
      },
    },
    references: [],
  };
  savedObjectsClient.get.mockResolvedValueOnce(actionSavedObject);
  encryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  await execute(executeParams);

  expect(encryptedSavedObjectsPlugin.getDecryptedAsInternalUser).toHaveBeenCalledWith(
    'action',
    '1',
    { namespace: 'some-namespace' }
  );

  expect(actionTypeRegistry.get).toHaveBeenCalledWith('test');

  expect(actionType.executor).toHaveBeenCalledWith({
    id: '1',
    services: expect.anything(),
    config: {
      bar: true,
    },
    secrets: {
      baz: true,
    },
    params: { foo: true },
  });
});

test('provides empty config when config and / or secrets is empty', async () => {
  const actionType = {
    id: 'test',
    name: 'Test',
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      actionTypeId: 'test',
    },
    references: [],
  };
  savedObjectsClient.get.mockResolvedValueOnce(actionSavedObject);
  encryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  await execute(executeParams);

  expect(actionType.executor).toHaveBeenCalledTimes(1);
  const executorCall = actionType.executor.mock.calls[0][0];
  expect(executorCall.config).toMatchInlineSnapshot(`undefined`);
});

test('throws an error when config is invalid', async () => {
  const actionType = {
    id: 'test',
    name: 'Test',
    validate: {
      config: schema.object({
        param1: schema.string(),
      }),
    },
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      actionTypeId: 'test',
    },
    references: [],
  };
  savedObjectsClient.get.mockResolvedValueOnce(actionSavedObject);
  encryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);

  const result = await execute(executeParams);
  expect(result).toEqual({
    status: 'error',
    retry: false,
    message: `error validating action type config: [param1]: expected value of type [string] but got [undefined]`,
  });
});

test('throws an error when params is invalid', async () => {
  const actionType = {
    id: 'test',
    name: 'Test',
    validate: {
      params: schema.object({
        param1: schema.string(),
      }),
    },
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      actionTypeId: 'test',
    },
    references: [],
  };
  savedObjectsClient.get.mockResolvedValueOnce(actionSavedObject);
  encryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);

  const result = await execute(executeParams);
  expect(result).toEqual({
    status: 'error',
    retry: false,
    message: `error validating action params: [param1]: expected value of type [string] but got [undefined]`,
  });
});

test('throws an error when failing to load action through savedObjectsClient', async () => {
  savedObjectsClient.get.mockRejectedValueOnce(new Error('No access'));
  await expect(execute(executeParams)).rejects.toThrowErrorMatchingInlineSnapshot(`"No access"`);
});
