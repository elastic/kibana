/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./lib/get_create_task_runner_function', () => ({
  getCreateTaskRunnerFunction: jest.fn(),
}));

import { taskManagerMock } from '../../task_manager/task_manager.mock';
import { encryptedSavedObjectsMock } from '../../encrypted_saved_objects/server/plugin.mock';
import { ActionTypeRegistry } from './action_type_registry';
import { ExecutorType } from './types';
import { SavedObjectsClientMock } from '../../../../../src/core/server/mocks';
import { ExecutorError } from './lib';

const mockTaskManager = taskManagerMock.create();

function getServices() {
  return {
    log: jest.fn(),
    callCluster: jest.fn(),
    savedObjectsClient: SavedObjectsClientMock.create(),
  };
}
const actionTypeRegistryParams = {
  getServices,
  isSecurityEnabled: true,
  taskManager: mockTaskManager,
  encryptedSavedObjectsPlugin: encryptedSavedObjectsMock.create(),
  spaceIdToNamespace: jest.fn().mockReturnValue(undefined),
  getBasePath: jest.fn().mockReturnValue(undefined),
};

beforeEach(() => jest.resetAllMocks());

const executor: ExecutorType = async options => {
  return { status: 'ok' };
};

describe('register()', () => {
  test('able to register action types', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getCreateTaskRunnerFunction } = require('./lib/get_create_task_runner_function');
    getCreateTaskRunnerFunction.mockReturnValueOnce(jest.fn());
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    expect(actionTypeRegistry.has('my-action-type')).toEqual(true);
    expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
    expect(mockTaskManager.registerTaskDefinitions.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "actions:my-action-type": Object {
            "createTaskRunner": [MockFunction],
            "getRetry": [Function],
            "maxAttempts": 1,
            "title": "My action type",
            "type": "actions:my-action-type",
          },
        },
      ]
    `);
    expect(getCreateTaskRunnerFunction).toHaveBeenCalledWith({
      actionTypeRegistry,
      isSecurityEnabled: true,
      encryptedSavedObjectsPlugin: actionTypeRegistryParams.encryptedSavedObjectsPlugin,
      getServices: actionTypeRegistryParams.getServices,
      getBasePath: actionTypeRegistryParams.getBasePath,
      spaceIdToNamespace: actionTypeRegistryParams.spaceIdToNamespace,
    });
  });

  test('throws error if action type already registered', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    expect(() =>
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        executor,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"my-action-type\\" is already registered."`
    );
  });

  test('provides a getRetry function that handles ExecutorError', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
    const registerTaskDefinitionsCall = mockTaskManager.registerTaskDefinitions.mock.calls[0][0];
    const getRetry = registerTaskDefinitionsCall['actions:my-action-type'].getRetry!;

    const retryTime = new Date();
    expect(getRetry(0, new Error())).toEqual(false);
    expect(getRetry(0, new ExecutorError('my message', {}, true))).toEqual(true);
    expect(getRetry(0, new ExecutorError('my message', {}, false))).toEqual(false);
    expect(getRetry(0, new ExecutorError('my message', {}, undefined))).toEqual(false);
    expect(getRetry(0, new ExecutorError('my message', {}, retryTime))).toEqual(retryTime);
  });
});

describe('get()', () => {
  test('returns action type', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    const actionType = actionTypeRegistry.get('my-action-type');
    expect(actionType).toMatchInlineSnapshot(`
      Object {
        "executor": [Function],
        "id": "my-action-type",
        "name": "My action type",
      }
    `);
  });

  test(`throws an error when action type doesn't exist`, () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    expect(() => actionTypeRegistry.get('my-action-type')).toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"my-action-type\\" is not registered."`
    );
  });
});

describe('list()', () => {
  test('returns list of action types', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    const actionTypes = actionTypeRegistry.list();
    expect(actionTypes).toEqual([
      {
        id: 'my-action-type',
        name: 'My action type',
      },
    ]);
  });
});

describe('has()', () => {
  test('returns false for unregistered action types', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    expect(actionTypeRegistry.has('my-action-type')).toEqual(false);
  });

  test('returns true after registering an action type', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    expect(actionTypeRegistry.has('my-action-type'));
  });
});
