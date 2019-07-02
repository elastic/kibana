/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { ActionTypeRegistry } from './action_type_registry';
import { ActionsClient } from './actions_client';
import { taskManagerMock } from '../../task_manager/task_manager.mock';
import { EncryptedSavedObjectsPlugin } from '../../encrypted_saved_objects';
import { SavedObjectsClientMock } from '../../../../../src/core/server/mocks';

const savedObjectsClient = SavedObjectsClientMock.create();

const mockTaskManager = taskManagerMock.create();

const mockEncryptedSavedObjectsPlugin = {
  getDecryptedAsInternalUser: jest.fn() as EncryptedSavedObjectsPlugin['getDecryptedAsInternalUser'],
} as EncryptedSavedObjectsPlugin;

function getServices() {
  return {
    log: jest.fn(),
    callCluster: jest.fn(),
    savedObjectsClient: SavedObjectsClientMock.create(),
  };
}

const actionTypeRegistryParams = {
  getServices,
  taskManager: mockTaskManager,
  encryptedSavedObjectsPlugin: mockEncryptedSavedObjectsPlugin,
};

beforeEach(() => jest.resetAllMocks());

describe('create()', () => {
  test('creates an action with all given properties', async () => {
    const expectedResult = {
      id: '1',
      type: 'type',
      attributes: {},
      references: [],
    };
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: [],
      async executor() {},
    });
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    savedObjectsClient.create.mockResolvedValueOnce(expectedResult);
    const result = await actionsClient.create({
      attributes: {
        description: 'my description',
        actionTypeId: 'my-action-type',
        actionTypeConfig: {},
      },
      options: {
        migrationVersion: {},
        references: [],
      },
    });
    expect(result).toEqual(expectedResult);
    expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  "action",
  Object {
    "actionTypeConfig": Object {},
    "actionTypeConfigSecrets": Object {},
    "actionTypeId": "my-action-type",
    "description": "my description",
  },
  Object {
    "migrationVersion": Object {},
    "references": Array [],
  },
]
`);
  });

  test('validates actionTypeConfig', async () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: [],
      validate: {
        config: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
      },
      async executor() {},
    });
    await expect(
      actionsClient.create({
        attributes: {
          description: 'my description',
          actionTypeId: 'my-action-type',
          actionTypeConfig: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The following actionTypeConfig attributes are invalid: param1 [any.required]"`
    );
  });

  test(`throws an error when an action type doesn't exist`, async () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    await expect(
      actionsClient.create({
        attributes: {
          description: 'my description',
          actionTypeId: 'unregistered-action-type',
          actionTypeConfig: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"unregistered-action-type\\" is not registered."`
    );
  });

  test('encrypts action type options unless specified not to', async () => {
    const expectedResult = {
      id: '1',
      type: 'type',
      attributes: {},
      references: [],
    };
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: ['a', 'c'],
      async executor() {},
    });
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    savedObjectsClient.create.mockResolvedValueOnce(expectedResult);
    const result = await actionsClient.create({
      attributes: {
        description: 'my description',
        actionTypeId: 'my-action-type',
        actionTypeConfig: {
          a: true,
          b: true,
          c: true,
        },
      },
    });
    expect(result).toEqual(expectedResult);
    expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  "action",
  Object {
    "actionTypeConfig": Object {
      "a": true,
      "c": true,
    },
    "actionTypeConfigSecrets": Object {
      "b": true,
    },
    "actionTypeId": "my-action-type",
    "description": "my description",
  },
  undefined,
]
`);
  });
});

describe('get()', () => {
  test('calls savedObjectsClient with id', async () => {
    const expectedResult = {
      id: '1',
      type: 'type',
      attributes: {},
      references: [],
    };
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    savedObjectsClient.get.mockResolvedValueOnce(expectedResult);
    const result = await actionsClient.get({ id: '1' });
    expect(result).toEqual(expectedResult);
    expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  "action",
  "1",
]
`);
  });
});

describe('find()', () => {
  test('calls savedObjectsClient with parameters', async () => {
    const expectedResult = {
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'type',
          attributes: {},
          references: [],
        },
      ],
    };
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    savedObjectsClient.find.mockResolvedValueOnce(expectedResult);
    const result = await actionsClient.find({});
    expect(result).toEqual(expectedResult);
    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.find.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  Object {
    "type": "action",
  },
]
`);
  });
});

describe('delete()', () => {
  test('calls savedObjectsClient with id', async () => {
    const expectedResult = Symbol();
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    savedObjectsClient.delete.mockResolvedValueOnce(expectedResult);
    const result = await actionsClient.delete({ id: '1' });
    expect(result).toEqual(expectedResult);
    expect(savedObjectsClient.delete).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.delete.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  "action",
  "1",
]
`);
  });
});

describe('update()', () => {
  test('updates an action with all given properties', async () => {
    const expectedResult = {
      id: '1',
      type: 'action',
      attributes: {},
      references: [],
    };
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: [],
      async executor() {},
    });
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
      },
      references: [],
    });
    savedObjectsClient.update.mockResolvedValueOnce(expectedResult);
    const result = await actionsClient.update({
      id: 'my-action',
      attributes: {
        description: 'my description',
        actionTypeConfig: {},
      },
      options: {},
    });
    expect(result).toEqual(expectedResult);
    expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.update.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  "action",
  "my-action",
  Object {
    "actionTypeConfig": Object {},
    "actionTypeConfigSecrets": Object {},
    "actionTypeId": "my-action-type",
    "description": "my description",
  },
  Object {},
]
`);
    expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  "action",
  "my-action",
]
`);
  });

  test('validates actionTypeConfig', async () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: [],
      validate: {
        config: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
      },
      async executor() {},
    });
    savedObjectsClient.get.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
      },
      references: [],
    });
    await expect(
      actionsClient.update({
        id: 'my-action',
        attributes: {
          description: 'my description',
          actionTypeConfig: {},
        },
        options: {},
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The following actionTypeConfig attributes are invalid: param1 [any.required]"`
    );
  });

  test('encrypts action type options unless specified not to', async () => {
    const expectedResult = {
      id: '1',
      type: 'type',
      attributes: {},
      references: [],
    };
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: ['a', 'c'],
      async executor() {},
    });
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    savedObjectsClient.get.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
      },
      references: [],
    });
    savedObjectsClient.update.mockResolvedValueOnce(expectedResult);
    const result = await actionsClient.update({
      id: 'my-action',
      attributes: {
        description: 'my description',
        actionTypeConfig: {
          a: true,
          b: true,
          c: true,
        },
      },
      options: {},
    });
    expect(result).toEqual(expectedResult);
    expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.update.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  "action",
  "my-action",
  Object {
    "actionTypeConfig": Object {
      "a": true,
      "c": true,
    },
    "actionTypeConfigSecrets": Object {
      "b": true,
    },
    "actionTypeId": "my-action-type",
    "description": "my description",
  },
  Object {},
]
`);
  });
});
