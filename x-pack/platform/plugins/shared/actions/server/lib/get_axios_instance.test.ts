/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { AuthTypeRegistry, registerAuthTypes } from '../auth_types';
import { getAxiosInstanceWithAuth } from './get_axios_instance';
import { actionsConfigMock } from '../actions_config.mock';
import { getCustomAgents } from './get_custom_agents';

jest.mock('./get_custom_agents', () => ({
  getCustomAgents: jest.fn().mockReturnValue({
    httpAgent: undefined,
    httpsAgent: undefined,
  }),
}));

const logger = loggerMock.create();

describe('getAxiosInstance', () => {
  const configurationUtilities = actionsConfigMock.create();
  const authTypeRegistry = new AuthTypeRegistry();
  registerAuthTypes(authTypeRegistry);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns axios instance with no auth when no authType is specified', async () => {
    const getAxios = getAxiosInstanceWithAuth({
      authTypeRegistry,
      configurationUtilities,
      logger,
    });
    const result = await getAxios({});

    expect(result).not.toBeUndefined();
    expect(result!.defaults.auth).toBeUndefined();

    // @ts-expect-error
    expect(result!.interceptors.request.handlers.length).toBe(0);
  });

  test('throws error when auth type is not supported', async () => {
    const getAxios = getAxiosInstanceWithAuth({
      authTypeRegistry,
      configurationUtilities,
      logger,
    });
    await expect(getAxios({ authType: 'foo' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Auth type \\"foo\\" is not registered."`
    );
  });

  test('returns axios instance configured for basic auth', async () => {
    const getAxios = getAxiosInstanceWithAuth({
      authTypeRegistry,
      configurationUtilities,
      logger,
    });
    const result = await getAxios({ authType: 'basic', username: 'user', password: 'pass' });

    expect(result).not.toBeUndefined();
    expect(result!.defaults.auth).toEqual({ username: 'user', password: 'pass' });

    // @ts-expect-error
    expect(result!.interceptors.request.handlers.length).toBe(1);

    // @ts-expect-error
    const result2 = result!.interceptors.request.handlers[0].fulfilled({ url: 'http://test1' });
    expect(getCustomAgents).toHaveBeenCalledWith(
      configurationUtilities,
      logger,
      'http://test1',
      {}
    );
  });

  test('returns axios instance configured for bearer auth', async () => {
    const getAxios = getAxiosInstanceWithAuth({
      authTypeRegistry,
      configurationUtilities,
      logger,
    });
    const result = await getAxios({ authType: 'bearer', token: 'abcdxyz' });

    expect(result).not.toBeUndefined();
    expect(result!.defaults.auth).toBeUndefined();
    expect(result!.defaults.headers.common).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer abcdxyz',
      })
    );

    // @ts-expect-error
    expect(result!.interceptors.request.handlers.length).toBe(1);

    // @ts-expect-error
    const result2 = result!.interceptors.request.handlers[0].fulfilled({ url: 'http://test2' });
    expect(getCustomAgents).toHaveBeenCalledWith(
      configurationUtilities,
      logger,
      'http://test2',
      {}
    );
  });

  test('returns axios instance configured for header auth', async () => {
    const getAxios = getAxiosInstanceWithAuth({
      authTypeRegistry,
      configurationUtilities,
      logger,
    });
    const result = await getAxios({
      authType: 'header',
      headers: {
        'X-Custom-Auth': 'i-am-a-custom-auth-string',
        'another-important-header': 'foo',
      },
    });

    expect(result).not.toBeUndefined();
    expect(result!.defaults.auth).toBeUndefined();
    expect(result!.defaults.headers.common).toEqual(
      expect.objectContaining({
        'X-Custom-Auth': 'i-am-a-custom-auth-string',
        'another-important-header': 'foo',
      })
    );

    // @ts-expect-error
    expect(result!.interceptors.request.handlers.length).toBe(1);

    // @ts-expect-error
    const result2 = result!.interceptors.request.handlers[0].fulfilled({ url: 'http://test3' });
    expect(getCustomAgents).toHaveBeenCalledWith(
      configurationUtilities,
      logger,
      'http://test3',
      {}
    );
  });
});
