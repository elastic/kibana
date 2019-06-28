/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
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
    unencryptedAttributes: [],
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      actionTypeId: 'test',
      actionTypeConfig: {
        bar: true,
      },
      actionTypeConfigSecrets: {
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
    services: expect.anything(),
    config: {
      bar: true,
      baz: true,
    },
    params: { foo: true },
  });
});

test('provides empty config when actionTypeConfig and / or actionTypeConfigSecrets is empty', async () => {
  const actionType = {
    id: 'test',
    name: 'Test',
    unencryptedAttributes: [],
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
  expect(executorCall.config).toMatchInlineSnapshot(`Object {}`);
});

test('throws an error when config is invalid', async () => {
  const actionType = {
    id: 'test',
    name: 'Test',
    unencryptedAttributes: [],
    validate: {
      config: Joi.object()
        .keys({
          param1: Joi.string().required(),
        })
        .required(),
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

  await expect(execute(executeParams)).rejects.toThrowErrorMatchingInlineSnapshot(
    `"The following actionTypeConfig attributes are invalid: param1 [any.required]"`
  );
});

test('throws an error when params is invalid', async () => {
  const actionType = {
    id: 'test',
    name: 'Test',
    unencryptedAttributes: [],
    validate: {
      params: Joi.object()
        .keys({
          param1: Joi.string().required(),
        })
        .required(),
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

  await expect(execute(executeParams)).rejects.toThrowErrorMatchingInlineSnapshot(
    `"The actionParams is invalid: child \\"param1\\" fails because [\\"param1\\" is required]"`
  );
});
