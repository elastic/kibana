/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { loggerMock } from '@kbn/logging-mocks';
import { actionTypeRegistryMock } from '../action_type_registry.mock';
import { AuthTypeRegistry, registerAuthTypes } from '../auth_types';
import { getAxiosInstanceWithAuth, type ConnectorInfo } from './get_axios_instance';
import { actionsConfigMock } from '../actions_config.mock';
import { getConnectorType } from '../fixtures';
import { getCustomAgents } from './get_custom_agents';

jest.mock('./get_custom_agents', () => ({
  getCustomAgents: jest.fn().mockReturnValue({
    httpAgent: undefined,
    httpsAgent: undefined,
  }),
}));

const getConnectorInfo = (overrides = {}): ConnectorInfo => ({
  actionTypeId: '.test',
  name: 'Test connector',
  config: {},
  secrets: {},
  actionId: '1',
  ...overrides,
});

const connectorTypeRegistry = actionTypeRegistryMock.create();
const logger = loggerMock.create();

describe('getAxiosInstance', () => {
  const configurationUtilities = actionsConfigMock.create();
  const authTypeRegistry = new AuthTypeRegistry();
  registerAuthTypes(authTypeRegistry);

  beforeEach(() => {
    jest.clearAllMocks();
    connectorTypeRegistry.getUtils.mockReturnValue(configurationUtilities);
  });

  test('returns axios instance with no auth when no authType is specified', async () => {
    connectorTypeRegistry.get.mockReturnValue(getConnectorType());
    const result = await getAxiosInstanceWithAuth({
      authTypeRegistry,
      connector: getConnectorInfo(),
      connectorTypeRegistry,
      logger,
    });

    expect(result).not.toBeUndefined();
    expect(result!.defaults.auth).toBeUndefined();

    // @ts-expect-error
    expect(result!.interceptors.request.handlers.length).toBe(0);
  });

  test('throws error when auth type is not supported', async () => {
    connectorTypeRegistry.get.mockReturnValue(
      getConnectorType({
        validate: {
          config: { schema: z.object({}) },
          secrets: {
            schema: z.object({
              authType: z.literal('foo'),
            }),
          },
          params: { schema: z.object({}) },
        },
      })
    );
    await expect(
      getAxiosInstanceWithAuth({
        authTypeRegistry,
        connector: getConnectorInfo({
          secrets: { authType: 'foo' },
        }),
        connectorTypeRegistry,
        logger,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Auth type \\"foo\\" is not registered."`);
  });

  test('throws error when secrets do not match schema', async () => {
    connectorTypeRegistry.get.mockReturnValue(
      getConnectorType({
        validate: {
          config: { schema: z.object({}) },
          secrets: {
            schema: z.object({
              authType: z.literal('basic'),
              username: z.string(),
              password: z.string(),
            }),
          },
          params: { schema: z.object({}) },
        },
      })
    );
    await expect(
      getAxiosInstanceWithAuth({
        authTypeRegistry,
        connector: getConnectorInfo({
          secrets: { authType: 'basic', email: 'user', password: 'pass' },
        }),
        connectorTypeRegistry,
        logger,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error validating connector type secrets: Field \\"username\\": Required"`
    );
  });

  test('returns axios instance configured for basic auth', async () => {
    connectorTypeRegistry.get.mockReturnValue(
      getConnectorType({
        validate: {
          config: { schema: z.object({}) },
          secrets: {
            schema: z.object({
              authType: z.literal('basic'),
              username: z.string(),
              password: z.string(),
            }),
          },
          params: { schema: z.object({}) },
        },
      })
    );
    const result = await getAxiosInstanceWithAuth({
      authTypeRegistry,
      connector: getConnectorInfo({
        secrets: { authType: 'basic', username: 'user', password: 'pass' },
      }),
      connectorTypeRegistry,
      logger,
    });

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
    connectorTypeRegistry.get.mockReturnValue(
      getConnectorType({
        validate: {
          config: { schema: z.object({}) },
          secrets: {
            schema: z.object({
              authType: z.literal('bearer'),
              token: z.string(),
            }),
          },
          params: { schema: z.object({}) },
        },
      })
    );
    const result = await getAxiosInstanceWithAuth({
      authTypeRegistry,
      connector: getConnectorInfo({
        secrets: { authType: 'bearer', token: 'abcdxyz' },
      }),
      connectorTypeRegistry,
      logger,
    });

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
    connectorTypeRegistry.get.mockReturnValue(
      getConnectorType({
        validate: {
          config: { schema: z.object({}) },
          secrets: {
            schema: z.object({
              authType: z.literal('header'),
              headers: z.object({
                'X-Custom-Auth': z.string(),
                'another-important-header': z.string(),
              }),
            }),
          },
          params: { schema: z.object({}) },
        },
      })
    );
    const result = await getAxiosInstanceWithAuth({
      authTypeRegistry,
      connector: getConnectorInfo({
        secrets: {
          authType: 'header',
          headers: {
            'X-Custom-Auth': 'i-am-a-custom-auth-string',
            'another-important-header': 'foo',
          },
        },
      }),
      connectorTypeRegistry,
      logger,
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
