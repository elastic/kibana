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
import { SavedObjectsClientMock } from '../../../../../src/core/server/mocks';

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
  taskManager: mockTaskManager,
  encryptedSavedObjectsPlugin: encryptedSavedObjectsMock.create(),
};

beforeEach(() => jest.resetAllMocks());

describe('register()', () => {
  test('able to register action types', () => {
    const executor = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getCreateTaskRunnerFunction } = require('./lib/get_create_task_runner_function');
    getCreateTaskRunnerFunction.mockReturnValueOnce(jest.fn());
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: [],
      executor,
    });
    expect(actionTypeRegistry.has('my-action-type')).toEqual(true);
    expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
    expect(mockTaskManager.registerTaskDefinitions.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  Object {
    "actions:my-action-type": Object {
      "createTaskRunner": [MockFunction],
      "title": "My action type",
      "type": "actions:my-action-type",
    },
  },
]
`);
    expect(getCreateTaskRunnerFunction).toHaveBeenCalledTimes(1);
    const call = getCreateTaskRunnerFunction.mock.calls[0][0];
    expect(call.actionTypeRegistry).toBeTruthy();
    expect(call.encryptedSavedObjectsPlugin).toBeTruthy();
    expect(call.getServices).toBeTruthy();
  });

  test('throws error if action type already registered', () => {
    const executor = jest.fn();
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: [],
      executor,
    });
    expect(() =>
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        unencryptedAttributes: [],
        executor,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"my-action-type\\" is already registered."`
    );
  });
});

describe('get()', () => {
  test('returns action type', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: [],
      async executor() {},
    });
    const actionType = actionTypeRegistry.get('my-action-type');
    expect(actionType).toMatchInlineSnapshot(`
Object {
  "executor": [Function],
  "id": "my-action-type",
  "name": "My action type",
  "unencryptedAttributes": Array [],
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
      unencryptedAttributes: [],
      async executor() {},
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
    const executor = jest.fn();
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: [],
      executor,
    });
    expect(actionTypeRegistry.has('my-action-type'));
  });
});
