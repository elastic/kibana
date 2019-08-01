/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { ActionTypeRegistry } from './action_type_registry';
import { ActionsClient } from './actions_client';
import { ExecutorType } from './types';
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

const executor: ExecutorType = async options => {
  return { status: 'ok' };
};

beforeEach(() => jest.resetAllMocks());

describe('create()', () => {
  test('creates an action with all given properties', async () => {
    const savedObjectCreateResult = {
      id: '1',
      type: 'type',
      attributes: {
        description: 'my description',
        actionTypeId: 'my-action-type',
        config: {},
      },
      references: [],
    };
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    savedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);
    const result = await actionsClient.create({
      action: {
        description: 'my description',
        actionTypeId: 'my-action-type',
        config: {},
        secrets: {},
      },
    });
    expect(result).toEqual({
      id: '1',
      description: 'my description',
      actionTypeId: 'my-action-type',
      config: {},
    });
    expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        Object {
          "actionTypeId": "my-action-type",
          "config": Object {},
          "description": "my description",
          "secrets": Object {},
        },
      ]
    `);
  });

  test('validates config', async () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      validate: {
        config: schema.object({
          param1: schema.string(),
        }),
      },
      executor,
    });
    await expect(
      actionsClient.create({
        action: {
          description: 'my description',
          actionTypeId: 'my-action-type',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [param1]: expected value of type [string] but got [undefined]"`
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
        action: {
          description: 'my description',
          actionTypeId: 'unregistered-action-type',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"unregistered-action-type\\" is not registered."`
    );
  });

  test('encrypts action type options unless specified not to', async () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'type',
      attributes: {
        description: 'my description',
        actionTypeId: 'my-action-type',
        config: {
          a: true,
          b: true,
          c: true,
        },
        secrets: {},
      },
      references: [],
    });
    const result = await actionsClient.create({
      action: {
        description: 'my description',
        actionTypeId: 'my-action-type',
        config: {
          a: true,
          b: true,
          c: true,
        },
        secrets: {},
      },
    });
    expect(result).toEqual({
      id: '1',
      description: 'my description',
      actionTypeId: 'my-action-type',
      config: {
        a: true,
        b: true,
        c: true,
      },
    });
    expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        Object {
          "actionTypeId": "my-action-type",
          "config": Object {
            "a": true,
            "b": true,
            "c": true,
          },
          "description": "my description",
          "secrets": Object {},
        },
      ]
    `);
  });
});

describe('get()', () => {
  test('calls savedObjectsClient with id', async () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'type',
      attributes: {},
      references: [],
    });
    const result = await actionsClient.get({ id: '1' });
    expect(result).toEqual({
      id: '1',
    });
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
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
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
    savedObjectsClient.update.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
        description: 'my description',
        config: {},
        secrets: {},
      },
      references: [],
    });
    const result = await actionsClient.update({
      id: 'my-action',
      action: {
        description: 'my description',
        config: {},
        secrets: {},
      },
    });
    expect(result).toEqual({
      id: 'my-action',
      actionTypeId: 'my-action-type',
      description: 'my description',
      config: {},
    });
    expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.update.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        "my-action",
        Object {
          "actionTypeId": "my-action-type",
          "config": Object {},
          "description": "my description",
          "secrets": Object {},
        },
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

  test('validates config', async () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      validate: {
        config: schema.object({
          param1: schema.string(),
        }),
      },
      executor,
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
        action: {
          description: 'my description',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [param1]: expected value of type [string] but got [undefined]"`
    );
  });

  test('encrypts action type options unless specified not to', async () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
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
    savedObjectsClient.update.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
        description: 'my description',
        config: {
          a: true,
          b: true,
          c: true,
        },
        secrets: {},
      },
      references: [],
    });
    const result = await actionsClient.update({
      id: 'my-action',
      action: {
        description: 'my description',
        config: {
          a: true,
          b: true,
          c: true,
        },
        secrets: {},
      },
    });
    expect(result).toEqual({
      id: 'my-action',
      actionTypeId: 'my-action-type',
      description: 'my description',
      config: {
        a: true,
        b: true,
        c: true,
      },
    });
    expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.update.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        "my-action",
        Object {
          "actionTypeId": "my-action-type",
          "config": Object {
            "a": true,
            "b": true,
            "c": true,
          },
          "description": "my description",
          "secrets": Object {},
        },
      ]
    `);
  });
});
