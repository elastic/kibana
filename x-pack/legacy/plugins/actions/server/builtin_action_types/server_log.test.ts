/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionType, Services } from '../types';
import { ActionsConfigurationUtilities } from '../actions_config';
import { ActionTypeRegistry } from '../action_type_registry';
import { taskManagerMock } from '../../../task_manager/task_manager.mock';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/plugin.mock';
import { validateParams } from '../lib';
import { SavedObjectsClientMock } from '../../../../../../src/core/server/mocks';

import { registerBuiltInActionTypes } from './index';

const ACTION_TYPE_ID = '.server-log';
const NO_OP_FN = () => {};
const MOCK_KIBANA_CONFIG_UTILS: ActionsConfigurationUtilities = {
  isWhitelistedHostname: _ => true,
  isWhitelistedUri: _ => true,
  ensureWhitelistedHostname: _ => {},
  ensureWhitelistedUri: _ => {},
};

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
    isSecurityEnabled: true,
    taskManager: taskManagerMock.create(),
    encryptedSavedObjectsPlugin: mockEncryptedSavedObjectsPlugin,
    spaceIdToNamespace: jest.fn().mockReturnValue(undefined),
    getBasePath: jest.fn().mockReturnValue(undefined),
  });
  registerBuiltInActionTypes(actionTypeRegistry, MOCK_KIBANA_CONFIG_UTILS);
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

describe('validateParams()', () => {
  let actionType: ActionType;

  beforeAll(() => {
    actionType = actionTypeRegistry.get(ACTION_TYPE_ID);
    expect(actionType).toBeTruthy();
  });

  test('should validate and pass when params is valid', () => {
    expect(validateParams(actionType, { message: 'a message' })).toEqual({
      message: 'a message',
      tags: ['info', 'alerting'],
    });
    expect(
      validateParams(actionType, {
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
      validateParams(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [message]: expected value of type [string] but got [undefined]"`
    );

    expect(() => {
      validateParams(actionType, { message: 1 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [message]: expected value of type [string] but got [number]"`
    );

    expect(() => {
      validateParams(actionType, { message: 'x', tags: 2 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [tags]: expected value of type [array] but got [number]"`
    );

    expect(() => {
      validateParams(actionType, { message: 'x', tags: [2] });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [tags.0]: expected value of type [string] but got [number]"`
    );
  });
});

describe('execute()', () => {
  test('calls the executor with proper params', async () => {
    const mockLog = jest.fn().mockResolvedValueOnce({ success: true });

    services.log = mockLog;
    const actionType = actionTypeRegistry.get(ACTION_TYPE_ID);
    const id = 'some-id';
    await actionType.executor({
      id,
      services: {
        log: mockLog,
        callCluster: async (path: string, opts: any) => {},
        savedObjectsClient: SavedObjectsClientMock.create(),
      },
      params: { message: 'message text here', tags: ['tag1', 'tag2'] },
      config: {},
      secrets: {},
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
