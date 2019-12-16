/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./lib/send_email', () => ({
  sendEmail: jest.fn(),
}));

import { Logger } from '../../../../../../src/core/server';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';

import { ActionType, ActionTypeExecutorOptions } from '../types';
import { configUtilsMock } from '../actions_config.mock';
import { validateConfig, validateSecrets, validateParams } from '../lib';
import { createActionTypeRegistry } from './index.test';
import { sendEmail } from './lib/send_email';
import {
  ActionParamsType,
  ActionTypeConfigType,
  ActionTypeSecretsType,
  getActionType,
} from './email';

const sendEmailMock = sendEmail as jest.Mock;

const ACTION_TYPE_ID = '.email';
const NO_OP_FN = () => {};

const services = {
  log: NO_OP_FN,
  callCluster: async (path: string, opts: any) => {},
  savedObjectsClient: savedObjectsClientMock.create(),
};

let actionType: ActionType;
let mockedLogger: jest.Mocked<Logger>;

beforeAll(() => {
  const { actionTypeRegistry } = createActionTypeRegistry();
  actionType = actionTypeRegistry.get(ACTION_TYPE_ID);
});

beforeEach(() => {
  jest.resetAllMocks();
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
      `"error validating action type config: either [service] or [host]/[port] is required"`
    );

    // host but no port
    expect(() => {
      validateConfig(actionType, { ...baseConfig, host: 'elastic.co' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [port] is required if [service] is not provided"`
    );

    // port but no host
    expect(() => {
      validateConfig(actionType, { ...baseConfig, port: 8080 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [host] is required if [service] is not provided"`
    );

    // invalid service
    expect(() => {
      validateConfig(actionType, {
        ...baseConfig,
        service: 'bad-nodemailer-service',
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [service] value 'bad-nodemailer-service' is not valid"`
    );
  });

  // nodemailer supports a service named 'AOL' that maps to the host below
  const NODEMAILER_AOL_SERVICE = 'AOL';
  const NODEMAILER_AOL_SERVICE_HOST = 'smtp.aol.com';

  test('config validation handles email host whitelisting', () => {
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: {
        ...configUtilsMock,
        isWhitelistedHostname: hostname => hostname === NODEMAILER_AOL_SERVICE_HOST,
      },
    });
    const baseConfig = {
      from: 'bob@example.com',
    };
    const whitelistedConfig1 = {
      ...baseConfig,
      service: NODEMAILER_AOL_SERVICE,
    };
    const whitelistedConfig2 = {
      ...baseConfig,
      host: NODEMAILER_AOL_SERVICE_HOST,
      port: 42,
    };
    const notWhitelistedConfig1 = {
      ...baseConfig,
      service: 'gmail',
    };

    const notWhitelistedConfig2 = {
      ...baseConfig,
      host: 'smtp.gmail.com',
      port: 42,
    };

    const validatedConfig1 = validateConfig(actionType, whitelistedConfig1);
    expect(validatedConfig1.service).toEqual(whitelistedConfig1.service);
    expect(validatedConfig1.from).toEqual(whitelistedConfig1.from);

    const validatedConfig2 = validateConfig(actionType, whitelistedConfig2);
    expect(validatedConfig2.host).toEqual(whitelistedConfig2.host);
    expect(validatedConfig2.port).toEqual(whitelistedConfig2.port);
    expect(validatedConfig2.from).toEqual(whitelistedConfig2.from);

    expect(() => {
      validateConfig(actionType, notWhitelistedConfig1);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [service] value 'gmail' resolves to host 'smtp.gmail.com' which is not in the whitelistedHosts configuration"`
    );

    expect(() => {
      validateConfig(actionType, notWhitelistedConfig2);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [host] value 'smtp.gmail.com' is not in the whitelistedHosts configuration"`
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

    const actionId = 'some-id';
    const executorOptions: ActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
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
