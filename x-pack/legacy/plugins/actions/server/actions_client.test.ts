/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { ActionTypeRegistry } from './action_type_registry';
import { ActionsClient } from './actions_client';
import { ExecutorType } from './types';
import { ActionExecutor, TaskRunnerFactory } from './lib';
import { taskManagerMock } from '../../task_manager/task_manager.mock';
import { configUtilsMock } from './actions_config.mock';
import { getActionsConfigurationUtilities } from './actions_config';

import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '../../../../../src/core/server/mocks';

const defaultKibanaIndex = '.kibana';
const savedObjectsClient = savedObjectsClientMock.create();
const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();

const mockTaskManager = taskManagerMock.create();

const actionTypeRegistryParams = {
  taskManager: mockTaskManager,
  taskRunnerFactory: new TaskRunnerFactory(new ActionExecutor()),
  actionsConfigUtils: configUtilsMock,
};

let actionsClient: ActionsClient;
let actionTypeRegistry: ActionTypeRegistry;
const executor: ExecutorType = async options => {
  return { status: 'ok', actionId: options.actionId };
};

beforeEach(() => {
  jest.resetAllMocks();
  actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
  actionsClient = new ActionsClient({
    actionTypeRegistry,
    savedObjectsClient,
    scopedClusterClient,
    defaultKibanaIndex,
  });
});

describe('create()', () => {
  test('creates an action with all given properties', async () => {
    const savedObjectCreateResult = {
      id: '1',
      type: 'type',
      attributes: {
        name: 'my name',
        actionTypeId: 'my-action-type',
        config: {},
      },
      references: [],
    };
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    savedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);
    const result = await actionsClient.create({
      action: {
        name: 'my name',
        actionTypeId: 'my-action-type',
        config: {},
        secrets: {},
      },
    });
    expect(result).toEqual({
      id: '1',
      name: 'my name',
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
          "name": "my name",
          "secrets": Object {},
        },
      ]
    `);
  });

  test('validates config', async () => {
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
          name: 'my name',
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
    await expect(
      actionsClient.create({
        action: {
          name: 'my name',
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
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'type',
      attributes: {
        name: 'my name',
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
        name: 'my name',
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
      name: 'my name',
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
          "name": "my name",
          "secrets": Object {},
        },
      ]
    `);
  });

  test('throws error creating action with disabled actionType', async () => {
    const localConfigUtils = getActionsConfigurationUtilities({
      enabled: true,
      enabledActionTypes: ['some-not-ignored-action-type'],
      whitelistedHosts: ['*'],
    });

    const localActionTypeRegistryParams = {
      taskManager: mockTaskManager,
      taskRunnerFactory: new TaskRunnerFactory(new ActionExecutor()),
      actionsConfigUtils: localConfigUtils,
    };

    actionTypeRegistry = new ActionTypeRegistry(localActionTypeRegistryParams);
    actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
      scopedClusterClient,
      defaultKibanaIndex,
    });

    const savedObjectCreateResult = {
      id: '1',
      type: 'type',
      attributes: {
        name: 'my name',
        actionTypeId: 'my-action-type',
        config: {},
      },
      references: [],
    };
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    savedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

    await expect(
      actionsClient.create({
        action: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"action type \\"my-action-type\\" is not enabled in the Kibana config xpack.actions.enabledActionTypes"`
    );
  });
});

describe('get()', () => {
  test('calls savedObjectsClient with id', async () => {
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
          attributes: {
            config: {
              foo: 'bar',
            },
          },
          references: [],
        },
      ],
    };
    savedObjectsClient.find.mockResolvedValueOnce(expectedResult);
    scopedClusterClient.callAsInternalUser.mockResolvedValueOnce({
      aggregations: {
        '1': { doc_count: 6 },
      },
    });
    const result = await actionsClient.find({});
    expect(result).toEqual({
      total: 1,
      perPage: 10,
      page: 1,
      data: [
        {
          id: '1',
          config: {
            foo: 'bar',
          },
          referencedByCount: 6,
        },
      ],
    });
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
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
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
        name: 'my name',
        config: {},
        secrets: {},
      },
      references: [],
    });
    const result = await actionsClient.update({
      id: 'my-action',
      action: {
        name: 'my name',
        config: {},
        secrets: {},
      },
    });
    expect(result).toEqual({
      id: 'my-action',
      actionTypeId: 'my-action-type',
      name: 'my name',
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
          "name": "my name",
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
          name: 'my name',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [param1]: expected value of type [string] but got [undefined]"`
    );
  });

  test('encrypts action type options unless specified not to', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
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
    savedObjectsClient.update.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
        name: 'my name',
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
        name: 'my name',
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
      name: 'my name',
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
          "name": "my name",
          "secrets": Object {},
        },
      ]
    `);
  });
});
