/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Option, none, some } from 'fp-ts/lib/Option';
import { actionType, validateConfig as validateWebhookConfig } from './webhook';
import { validateConfig, validateSecrets, validateParams } from '../lib';
import { ActionKibanaConfig } from '../actions_config';

function actionTypeWithDefaults() {
  return actionType.configure(
    some({
      whitelistedEndpoints: 'any',
    })
  );
}

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
    expect(validateSecrets(actionTypeWithDefaults(), secrets)).toEqual(secrets);
  });

  test('fails when secret password is omitted', () => {
    expect(() => {
      validateSecrets(actionTypeWithDefaults(), { user: 'bob' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [password]: expected value of type [string] but got [undefined]"`
    );
  });

  test('fails when secret user is omitted', () => {
    expect(() => {
      validateSecrets(actionTypeWithDefaults(), {});
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
    expect(validateConfig(actionTypeWithDefaults(), config)).toEqual({
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
      expect(validateConfig(actionTypeWithDefaults(), config)).toEqual({
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
      validateConfig(actionTypeWithDefaults(), config);
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
    expect(validateConfig(actionTypeWithDefaults(), config)).toEqual({
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
    expect(validateConfig(actionTypeWithDefaults(), config)).toEqual({
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
      validateConfig(actionTypeWithDefaults(), config);
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action type config: [headers]: types that failed validation:
- [headers.0]: expected value of type [object] but got [string]
- [headers.1]: expected value to equal [null] but got [application/json]"
`);
  });

  test('config validation returns an error if no configuration is available', () => {
    const kiabanaActionConfig = none;
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    expect(
      validateWebhookConfig(kiabanaActionConfig as Option<ActionKibanaConfig>)(config)
    ).toMatchInlineSnapshot(
      `"an error occurred configuring webhook with unwhitelisted target url \\"http://mylisteningserver:9200/endpoint\\""`
    );
  });

  test('config validation passes when kibana config whitelists all URLs', () => {
    const kiabanaActionConfig = some({
      whitelistedEndpoints: 'any',
    });
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    expect(
      validateWebhookConfig(kiabanaActionConfig as Option<ActionKibanaConfig>)(config)
    ).toBeUndefined();
  });

  test('config validation passes when kibana config whitelists the hostname in the specified URL', () => {
    const kiabanaActionConfig = some({
      whitelistedEndpoints: ['http://mylisteningserver'],
    });
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    expect(
      validateWebhookConfig(kiabanaActionConfig as Option<ActionKibanaConfig>)(config)
    ).toBeUndefined();
  });

  test('config validation passes when kibana config whitelists multiple hostnames, including the specified URL', () => {
    const kiabanaActionConfig = some({
      whitelistedEndpoints: ['http://localhost', 'http://mylisteningserver'],
    });
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    expect(
      validateWebhookConfig(kiabanaActionConfig as Option<ActionKibanaConfig>)(config)
    ).toBeUndefined();
  });

  test('config validation passes when kibana config whitelists just the hostname', () => {
    const kiabanaActionConfig = some({
      whitelistedEndpoints: ['http://localhost', 'mylisteningserver.com'],
    });
    const config: Record<string, any> = {
      url: 'http://mylisteningserver.com:9200/endpoint',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    expect(
      validateWebhookConfig(kiabanaActionConfig as Option<ActionKibanaConfig>)(config)
    ).toBeUndefined();
  });

  test('config validation returns an error if there is a whitelist but the specified URL isnt on it', () => {
    const kiabanaActionConfig = some({
      whitelistedEndpoints: ['http://localhost', 'http://webhook.elastic.co'],
    });
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    expect(
      validateWebhookConfig(kiabanaActionConfig as Option<ActionKibanaConfig>)(config)
    ).toMatchInlineSnapshot(
      `"an error occurred configuring webhook with unwhitelisted target url \\"http://mylisteningserver:9200/endpoint\\""`
    );
  });
});

describe('params validation', () => {
  test('param validation passes when no fields are provided as none are required', () => {
    const params: Record<string, any> = {};
    expect(validateParams(actionTypeWithDefaults(), params)).toEqual({});
  });

  test('params validation passes when a valid body is provided', () => {
    const params: Record<string, any> = {
      body: 'count: {{ctx.payload.hits.total}}',
    };
    expect(validateParams(actionTypeWithDefaults(), params)).toEqual({
      ...params,
    });
  });
});
