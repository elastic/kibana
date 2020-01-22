/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionType, Services, ActionTypeExecutorOptions } from '../types';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { validateParams, validateSecrets } from '../lib';
import { getActionType } from './slack';
import { configUtilsMock } from '../actions_config.mock';

const ACTION_TYPE_ID = '.slack';

const services: Services = {
  callCluster: async (path: string, opts: any) => {},
  savedObjectsClient: savedObjectsClientMock.create(),
};

let actionType: ActionType;

beforeAll(() => {
  actionType = getActionType({
    async executor(options: ActionTypeExecutorOptions): Promise<any> {},
    configurationUtilities: configUtilsMock,
  });
});

describe('action registeration', () => {
  test('returns action type', () => {
    expect(actionType.id).toEqual(ACTION_TYPE_ID);
    expect(actionType.name).toEqual('Slack');
  });
});

describe('validateParams()', () => {
  test('should validate and pass when params is valid', () => {
    expect(validateParams(actionType, { message: 'a message' })).toEqual({
      message: 'a message',
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
  });
});

describe('validateActionTypeSecrets()', () => {
  test('should validate and pass when config is valid', () => {
    validateSecrets(actionType, {
      webhookUrl: 'https://example.com',
    });
  });

  test('should validate and throw error when config is invalid', () => {
    expect(() => {
      validateSecrets(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [webhookUrl]: expected value of type [string] but got [undefined]"`
    );

    expect(() => {
      validateSecrets(actionType, { webhookUrl: 1 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [webhookUrl]: expected value of type [string] but got [number]"`
    );
  });

  test('should validate and pass when the slack webhookUrl is whitelisted', () => {
    actionType = getActionType({
      configurationUtilities: {
        ...configUtilsMock,
        ensureWhitelistedUri: url => {
          expect(url).toEqual('https://api.slack.com/');
        },
      },
    });

    expect(validateSecrets(actionType, { webhookUrl: 'https://api.slack.com/' })).toEqual({
      webhookUrl: 'https://api.slack.com/',
    });
  });

  test('config validation returns an error if the specified URL isnt whitelisted', () => {
    actionType = getActionType({
      configurationUtilities: {
        ...configUtilsMock,
        ensureWhitelistedUri: url => {
          throw new Error(`target url is not whitelisted`);
        },
      },
    });

    expect(() => {
      validateSecrets(actionType, { webhookUrl: 'https://api.slack.com/' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: error configuring slack action: target url is not whitelisted"`
    );
  });
});

describe('execute()', () => {
  beforeAll(() => {
    async function mockSlackExecutor(options: ActionTypeExecutorOptions): Promise<any> {
      const { params } = options;
      const { message } = params;
      if (message == null) throw new Error('message property required in parameter');

      const failureMatch = message.match(/^failure: (.*)$/);
      if (failureMatch != null) {
        const failMessage = failureMatch[1];
        throw new Error(`slack mockExecutor failure: ${failMessage}`);
      }

      return {
        text: `slack mockExecutor success: ${message}`,
      };
    }

    actionType = getActionType({
      executor: mockSlackExecutor,
      configurationUtilities: configUtilsMock,
    });
  });

  test('calls the mock executor with success', async () => {
    const response = await actionType.executor({
      actionId: 'some-id',
      services,
      config: {},
      secrets: { webhookUrl: 'http://example.com' },
      params: { message: 'this invocation should succeed' },
    });
    expect(response).toMatchInlineSnapshot(`
Object {
  "text": "slack mockExecutor success: this invocation should succeed",
}
`);
  });

  test('calls the mock executor with failure', async () => {
    await expect(
      actionType.executor({
        actionId: 'some-id',
        services,
        config: {},
        secrets: { webhookUrl: 'http://example.com' },
        params: { message: 'failure: this invocation should fail' },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"slack mockExecutor failure: this invocation should fail"`
    );
  });
});
