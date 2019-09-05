/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./lib/send_email', () => ({
  sendEmail: jest.fn(),
}));

import { ActionType, ActionTypeExecutorOptions } from '../types';
import { ActionsConfigurationUtilities } from '../actions_config';
import { ActionTypeRegistry } from '../action_type_registry';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/plugin.mock';
import { taskManagerMock } from '../../../task_manager/task_manager.mock';
import { validateParams, validateConfig, validateSecrets } from '../lib';
import { SavedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { registerBuiltInActionTypes } from './index';
import { sendEmail } from './lib/send_email';
import { ActionParamsType, ActionTypeConfigType, ActionTypeSecretsType } from './email';

const sendEmailMock = sendEmail as jest.Mock;

const ACTION_TYPE_ID = '.email';
const NO_OP_FN = () => {};
const MOCK_KIBANA_CONFIG_UTILS: ActionsConfigurationUtilities = {
  isWhitelistedHostname: _ => true,
  isWhitelistedUri: _ => true,
  ensureWhitelistedHostname: _ => {},
  ensureWhitelistedUri: _ => {},
};

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
    isSecurityEnabled: true,
    taskManager: taskManagerMock.create(),
    encryptedSavedObjectsPlugin: mockEncryptedSavedObjectsPlugin,
    spaceIdToNamespace: jest.fn().mockReturnValue(undefined),
    getBasePath: jest.fn().mockReturnValue(undefined),
  });

  registerBuiltInActionTypes(actionTypeRegistry, MOCK_KIBANA_CONFIG_UTILS);

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
      from: 'bob@example.com',
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...config,
      host: null,
      port: null,
      secure: null,
    });

    delete config.service;
    config.host = 'elastic.co';
    config.port = 8080;
    expect(validateConfig(actionType, config)).toEqual({
      ...config,
      service: null,
      secure: null,
    });
  });

  test('config validation fails when config is not valid', () => {
    const baseConfig: Record<string, any> = {
      user: 'bob',
      password: 'supersecret',
      from: 'bob@example.com',
    };

    // empty object
    expect(() => {
      validateConfig(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [from]: expected value of type [string] but got [undefined]"`
    );

    // no service or host/port
    expect(() => {
      validateConfig(actionType, baseConfig);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [user]: definition for this key is missing"`
    );

    // host but no port
    expect(() => {
      validateConfig(actionType, { ...baseConfig, host: 'elastic.co' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [user]: definition for this key is missing"`
    );

    // port but no host
    expect(() => {
      validateConfig(actionType, { ...baseConfig, port: 8080 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [user]: definition for this key is missing"`
    );

    // invalid service
    expect(() => {
      validateConfig(actionType, {
        ...baseConfig,
        service: 'bad-nodemailer-service',
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [user]: definition for this key is missing"`
    );
  });
});

describe('secrets validation', () => {
  test('secrets validation succeeds when secrets is valid', () => {
    const secrets: Record<string, any> = {
      user: 'bob',
      password: 'supersecret',
    };
    expect(validateSecrets(actionType, secrets)).toEqual(secrets);
  });

  test('secrets validation fails when secrets is not valid', () => {
    expect(() => {
      validateSecrets(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [user]: expected value of type [string] but got [undefined]"`
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
    expect(validateParams(actionType, params)).toMatchInlineSnapshot(`
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
      validateParams(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [subject]: expected value of type [string] but got [undefined]"`
    );
  });
});

describe('execute()', () => {
  test('ensure parameters are as expected', async () => {
    const config: ActionTypeConfigType = {
      service: '__json',
      host: 'a host',
      port: 42,
      secure: true,
      from: 'bob@example.com',
    };
    const secrets: ActionTypeSecretsType = {
      user: 'bob',
      password: 'supersecret',
    };
    const params: ActionParamsType = {
      to: ['jim@example.com'],
      cc: ['james@example.com'],
      bcc: ['jimmy@example.com'],
      subject: 'the subject',
      message: 'a message to you',
    };

    const id = 'some-id';
    const executorOptions: ActionTypeExecutorOptions = { id, config, params, secrets, services };
    sendEmailMock.mockReset();
    await actionType.executor(executorOptions);
    expect(sendEmailMock.mock.calls[0][1]).toMatchInlineSnapshot(`
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
        "password": "supersecret",
        "service": "__json",
        "user": "bob",
      },
    }
`);
  });
});
