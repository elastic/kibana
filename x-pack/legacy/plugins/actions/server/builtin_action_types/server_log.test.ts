/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionType, Services } from '../types';
import { ActionTypeRegistry } from '../action_type_registry';
import { taskManagerMock } from '../../../task_manager/task_manager.mock';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/plugin.mock';
import { validateActionTypeParams } from '../lib';
import { SavedObjectsClientMock } from '../../../../../../src/core/server/mocks';

import { registerBuiltInActionTypes } from './index';

const ACTION_TYPE_ID = '.server-log';
const NO_OP_FN = () => {};

const services: Services = {
  log: NO_OP_FN,
  callCluster: async (path: string, opts: any) => {},
  savedObjectsClient: SavedObjectsClientMock.create(),
};

function getServices(): Services {
  return services;
}

let actionTypeRegistry: ActionTypeRegistry;

const mockEncryptedSavedObjectsPlugin = encryptedSavedObjectsMock.create();

beforeAll(() => {
  actionTypeRegistry = new ActionTypeRegistry({
    getServices,
    taskManager: taskManagerMock.create(),
    encryptedSavedObjectsPlugin: mockEncryptedSavedObjectsPlugin,
  });
  registerBuiltInActionTypes(actionTypeRegistry);
});

beforeEach(() => {
  services.log = NO_OP_FN;
});

describe('action is registered', () => {
  test('gets registered with builtin actions', () => {
    expect(actionTypeRegistry.has(ACTION_TYPE_ID)).toEqual(true);
  });
});

describe('get()', () => {
  test('returns action type', () => {
    const actionType = actionTypeRegistry.get(ACTION_TYPE_ID);
    expect(actionType.id).toEqual(ACTION_TYPE_ID);
    expect(actionType.name).toEqual('server-log');
  });
});

describe('validateActionTypeParams()', () => {
  let actionType: ActionType;

  beforeAll(() => {
    actionType = actionTypeRegistry.get(ACTION_TYPE_ID);
    expect(actionType).toBeTruthy();
  });

  test('should validate and pass when params is valid', () => {
    expect(validateActionTypeParams(actionType, { message: 'a message' })).toEqual({
      message: 'a message',
      tags: ['info', 'alerting'],
    });
    expect(
      validateActionTypeParams(actionType, {
        message: 'a message',
        tags: ['info', 'blorg'],
      })
    ).toEqual({
      message: 'a message',
      tags: ['info', 'blorg'],
    });
  });

  test('should validate and throw error when params is invalid', () => {
    expect(() => {
      validateActionTypeParams(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"The actionParams is invalid: child \\"message\\" fails because [\\"message\\" is required]"`
    );

    expect(() => {
      validateActionTypeParams(actionType, { message: 1 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"The actionParams is invalid: child \\"message\\" fails because [\\"message\\" must be a string]"`
    );

    expect(() => {
      validateActionTypeParams(actionType, { message: 'x', tags: 2 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"The actionParams is invalid: child \\"tags\\" fails because [\\"tags\\" must be an array]"`
    );

    expect(() => {
      validateActionTypeParams(actionType, { message: 'x', tags: [2] });
    }).toThrowErrorMatchingInlineSnapshot(
      `"The actionParams is invalid: child \\"tags\\" fails because [\\"tags\\" at position 0 fails because [\\"0\\" must be a string]]"`
    );
  });
});

describe('execute()', () => {
  test('calls the executor with proper params', async () => {
    const mockLog = jest.fn().mockResolvedValueOnce({ success: true });

    services.log = mockLog;
    const actionType = actionTypeRegistry.get(ACTION_TYPE_ID);
    await actionType.executor({
      services: {
        log: mockLog,
        callCluster: async (path: string, opts: any) => {},
        savedObjectsClient: SavedObjectsClientMock.create(),
      },
      config: {},
      params: { message: 'message text here', tags: ['tag1', 'tag2'] },
    });
    expect(mockLog).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Array [
        "tag1",
        "tag2",
      ],
      "message text here",
    ],
  ],
  "results": Array [
    Object {
      "type": "return",
      "value": Promise {},
    },
  ],
}
`);
  });
});
