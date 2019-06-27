/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./lib/send_email', () => ({
  sendEmail: jest.fn(),
}));

import { ActionType, ActionTypeExecutorOptions } from '../types';
import { ActionTypeRegistry } from '../action_type_registry';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/plugin.mock';
import { taskManagerMock } from '../../../task_manager/task_manager.mock';
import { validateActionTypeConfig, validateActionTypeParams } from '../lib';
import { SavedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { registerBuiltInActionTypes } from './index';
import { sendEmail } from './lib/send_email';
import { ActionParamsType, ActionTypeConfigType } from './email';

const sendEmailMock = sendEmail as jest.Mock;

const ACTION_TYPE_ID = '.email';
const NO_OP_FN = () => {};

const services = {
  log: NO_OP_FN,
  callCluster: async (path: string, opts: any) => {},
  savedObjectsClient: SavedObjectsClientMock.create(),
};

function getServices() {
  return services;
}

let actionTypeRegistry: ActionTypeRegistry;
let actionType: ActionType;

const mockEncryptedSavedObjectsPlugin = encryptedSavedObjectsMock.create();

beforeAll(() => {
  actionTypeRegistry = new ActionTypeRegistry({
    getServices,
    taskManager: taskManagerMock.create(),
    encryptedSavedObjectsPlugin: mockEncryptedSavedObjectsPlugin,
  });

  registerBuiltInActionTypes(actionTypeRegistry);

  actionType = actionTypeRegistry.get(ACTION_TYPE_ID);
});

beforeEach(() => {
  jest.resetAllMocks();
});

describe('action is registered', () => {
  test('gets registered with builtin actions', () => {
    expect(actionTypeRegistry.has(ACTION_TYPE_ID)).toEqual(true);
  });
});

describe('actionTypeRegistry.get() works', () => {
  test('action type static data is as expected', () => {
    expect(actionType.id).toEqual(ACTION_TYPE_ID);
    expect(actionType.name).toEqual('email');
  });
});

describe('config validation', () => {
  test('config validation succeeds when config is valid', () => {
    const config: Record<string, any> = {
      service: 'gmail',
      user: 'bob',
      password: 'supersecret',
      from: 'bob@example.com',
    };
    expect(validateActionTypeConfig(actionType, config)).toEqual(config);

    delete config.service;
    config.host = 'elastic.co';
    config.port = 8080;
    expect(validateActionTypeConfig(actionType, config)).toEqual(config);
  });

  test('config validation fails when config is not valid', () => {
    const baseConfig: Record<string, any> = {
      user: 'bob',
      password: 'supersecret',
      from: 'bob@example.com',
    };

    // empty object
    expect(() => {
      validateActionTypeConfig(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"The actionTypeConfig is invalid: [user]: expected value of type [string] but got [undefined]"`
    );

    // no service or host/port
    expect(() => {
      validateActionTypeConfig(actionType, baseConfig);
    }).toThrowErrorMatchingInlineSnapshot(
      `"The actionTypeConfig is invalid: either [service] or [host]/[port] is required"`
    );

    // host but no port
    expect(() => {
      validateActionTypeConfig(actionType, { ...baseConfig, host: 'elastic.co' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"The actionTypeConfig is invalid: [port] is required if [service] is not provided"`
    );

    // port but no host
    expect(() => {
      validateActionTypeConfig(actionType, { ...baseConfig, port: 8080 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"The actionTypeConfig is invalid: [host] is required if [service] is not provided"`
    );
  });
});

describe('params validation', () => {
  test('params validation succeeds when params is valid', () => {
    const params: Record<string, any> = {
      to: ['bob@example.com'],
      subject: 'this is a test',
      message: 'this is the message',
    };
    expect(validateActionTypeParams(actionType, params)).toMatchInlineSnapshot(`
Object {
  "bcc": Array [],
  "cc": Array [],
  "message": "this is the message",
  "subject": "this is a test",
  "to": Array [
    "bob@example.com",
  ],
}
`);
  });

  test('params validation fails when params is not valid', () => {
    // empty object
    expect(() => {
      validateActionTypeParams(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"The actionParams is invalid: [subject]: expected value of type [string] but got [undefined]"`
    );
  });
});

describe('execute()', () => {
  test('ensure parameters are as expected', async () => {
    const config: ActionTypeConfigType = {
      service: 'a service',
      host: 'a host',
      port: 42,
      secure: true,
      user: 'bob',
      password: 'supersecret',
      from: 'bob@example.com',
    };
    const params: ActionParamsType = {
      to: ['jim@example.com'],
      cc: ['james@example.com'],
      bcc: ['jimmy@example.com'],
      subject: 'the subject',
      message: 'a message to you',
    };

    const executorOptions: ActionTypeExecutorOptions = { config, params, services };
    sendEmailMock.mockReset();
    await actionType.executor(executorOptions);
    expect(sendEmailMock.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    Object {
      "content": Object {
        "message": "a message to you",
        "subject": "the subject",
      },
      "routing": Object {
        "bcc": Array [
          "jimmy@example.com",
        ],
        "cc": Array [
          "james@example.com",
        ],
        "from": "bob@example.com",
        "to": Array [
          "jim@example.com",
        ],
      },
      "transport": Object {
        "host": "a host",
        "password": "supersecret",
        "port": 42,
        "secure": true,
        "service": "a service",
        "user": "bob",
      },
    },
  ],
]
`);
  });
});
