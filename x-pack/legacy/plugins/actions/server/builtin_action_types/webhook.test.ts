/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getActionType } from './webhook';
import { validateConfig, validateSecrets, validateParams } from '../lib';
import { getMockActionConfig } from '../actions_config.mock';
import { ActionType } from '../types';
import { createActionTypeRegistry } from './index.test';
import { Logger } from '../../../../../../src/core/server';

const ACTION_TYPE_ID = '.webhook';
const configUtilsMock = getMockActionConfig();

let actionType: ActionType;
let mockedLogger: jest.Mocked<Logger>;

beforeAll(() => {
  const { logger, actionTypeRegistry } = createActionTypeRegistry();
  actionType = actionTypeRegistry.get(ACTION_TYPE_ID);
  mockedLogger = logger;
});

describe('actionType', () => {
  test('exposes the action as `webhook` on its Id and Name', () => {
    expect(actionType.id).toEqual('.webhook');
    expect(actionType.name).toEqual('webhook');
  });
});

describe('secrets validation', () => {
  test('succeeds when secrets is valid', () => {
    const secrets: Record<string, any> = {
      user: 'bob',
      password: 'supersecret',
    };
    expect(validateSecrets(actionType, secrets)).toEqual(secrets);
  });

  test('fails when secret password is omitted', () => {
    expect(() => {
      validateSecrets(actionType, { user: 'bob' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [password]: expected value of type [string] but got [undefined]"`
    );
  });

  test('fails when secret user is omitted', () => {
    expect(() => {
      validateSecrets(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [user]: expected value of type [string] but got [undefined]"`
    );
  });
});

describe('config validation', () => {
  const defaultValues: Record<string, any> = {
    headers: null,
    method: 'post',
  };

  test('config validation passes when only required fields are provided', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('config validation passes when valid methods are provided', () => {
    ['post', 'put'].forEach(method => {
      const config: Record<string, any> = {
        url: 'http://mylisteningserver:9200/endpoint',
        method,
      };
      expect(validateConfig(actionType, config)).toEqual({
        ...defaultValues,
        ...config,
      });
    });
  });

  test('should validate and throw error when method on config is invalid', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      method: 'https',
    };
    expect(() => {
      validateConfig(actionType, config);
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action type config: [method]: types that failed validation:
- [method.0]: expected value to equal [post] but got [https]
- [method.1]: expected value to equal [put] but got [https]"
`);
  });

  test('config validation passes when a url is specified', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('config validation passes when valid headers are provided', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('should validate and throw error when headers on config is invalid', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      headers: 'application/json',
    };
    expect(() => {
      validateConfig(actionType, config);
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action type config: [headers]: types that failed validation:
- [headers.0]: expected value of type [object] but got [string]
- [headers.1]: expected value to equal [null] but got [application/json]"
`);
  });

  test('config validation passes when kibana config whitelists the url', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver.com:9200/endpoint',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    expect(validateConfig(actionType, config)).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('config validation returns an error if the specified URL isnt whitelisted', () => {
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: {
        ...configUtilsMock,
        ensureWhitelistedUri: _ => {
          throw new Error(`target url is not whitelisted`);
        },
      },
    });

    const config: Record<string, any> = {
      url: 'http://mylisteningserver.com:9200/endpoint',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    expect(() => {
      validateConfig(actionType, config);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: error configuring webhook action: target url is not whitelisted"`
    );
  });
});

describe('params validation', () => {
  test('param validation passes when no fields are provided as none are required', () => {
    const params: Record<string, any> = {};
    expect(validateParams(actionType, params)).toEqual({});
  });

  test('params validation passes when a valid body is provided', () => {
    const params: Record<string, any> = {
      body: 'count: {{ctx.payload.hits.total}}',
    };
    expect(validateParams(actionType, params)).toEqual({
      ...params,
    });
  });
});
