/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { actionType } from './webhook';
import { validateConfig, validateSecrets, validateParams } from '../lib';

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
    proxy: null,
    connection_timeout: null,
    read_timeout: null,
    method: 'post',
  };

  const defaultCompositeUrlValues: Record<string, any> = {
    scheme: 'http',
    path: null,
  };

  test('config validation passes when only required fields are provided', () => {
    const config: Record<string, any> = {
      url: {
        host: 'mylisteningserver',
        port: 9200,
      },
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...defaultValues,
      url: {
        ...defaultCompositeUrlValues,
        ...config.url,
      },
    });
  });

  test('config validation passes when valid schemes are provided', () => {
    const httpConfig: Record<string, any> = {
      url: {
        host: 'mylisteningserver',
        port: 9200,
        scheme: 'http',
      },
    };
    expect(validateConfig(actionType, httpConfig)).toEqual({
      ...defaultValues,
      ...httpConfig,
      url: {
        ...defaultCompositeUrlValues,
        ...httpConfig.url,
      },
    });

    const httpsConfig: Record<string, any> = {
      url: {
        host: 'mylisteningserver',
        port: 9200,
        scheme: 'https',
      },
    };
    expect(validateConfig(actionType, httpsConfig)).toEqual({
      ...defaultValues,
      url: {
        ...defaultCompositeUrlValues,
        ...httpsConfig.url,
      },
    });
  });

  test('should validate and throw error when scheme on config is invalid', () => {
    const config: Record<string, any> = {
      url: {
        host: 'mylisteningserver',
        port: 9200,
        scheme: 'ftp',
      },
    };
    expect(() => {
      validateConfig(actionType, config);
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action type config: [url]: types that failed validation:
- [url.0]: expected value of type [string] but got [Object]
- [url.1.scheme]: types that failed validation:"
`);
  });

  test('config validation passes when valid methods are provided', () => {
    ['post', 'put'].forEach(method => {
      const config: Record<string, any> = {
        url: {
          host: 'mylisteningserver',
          port: 9200,
        },
        method,
      };
      expect(validateConfig(actionType, config)).toEqual({
        ...defaultValues,
        ...config,
        url: {
          ...defaultCompositeUrlValues,
          ...config.url,
        },
      });
    });
  });

  test('should validate and throw error when method on config is invalid', () => {
    const config: Record<string, any> = {
      url: {
        host: 'mylisteningserver',
        port: 9200,
      },
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

  test('config validation passes when a valid proxy is provided', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      proxy: {
        host: 'localhost',
        port: 9200,
      },
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('config validation passes when a proxy ommits a port', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      proxy: {
        host: 'localhost',
      },
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...defaultValues,
      ...config,
      proxy: {
        host: 'localhost',
        port: null,
      },
    });
  });

  test('should validate and throw error when a proxy is specified but has no host', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      proxy: {
        port: 8080,
      },
    };
    expect(() => {
      validateConfig(actionType, config);
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action type config: [proxy]: types that failed validation:
- [proxy.0.host]: expected value of type [string] but got [undefined]
- [proxy.1]: expected value to equal [null] but got [[object Object]]"
`);
  });

  test('config validation passes when a valid connection_timeout is provided', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      connection_timeout: '10s',
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('ashould validate and throw error when an invalid connection_timeout is specified', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      connection_timeout: '10 seconds',
    };
    expect(() => {
      validateConfig(actionType, config);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [connection_timeout]: Invalid interval \\"10 seconds\\". Intervals must be of the form {number}m. Example: 5m."`
    );
  });

  test('config validation passes when a valid read_timeout is provided', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      read_timeout: '10s',
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('ashould validate and throw error when an invalid read_timeout is specified', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      read_timeout: '10 seconds',
    };
    expect(() => {
      validateConfig(actionType, config);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [read_timeout]: Invalid interval \\"10 seconds\\". Intervals must be of the form {number}m. Example: 5m."`
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
