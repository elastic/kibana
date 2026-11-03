/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeRegistry } from '../../../../action_type_registry';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';
import { createConnectorType } from './create_type';

const request = {
  id: 'dynamic_type',
  displayName: 'Dynamic type',
  description: 'A connector type created at runtime.',
  config: [],
  auth: { type: 'none' as const },
  actions: {
    getItem: {
      description: 'Get one item.',
      scope: 'read' as const,
      input: [],
      request: { method: 'GET' as const, url: 'https://example.test/items' },
    },
  },
};

describe('createConnectorType', () => {
  it('keeps a documented default in the runtime and form schemas', () => {
    const createTypeFromSpec = jest.fn(() => ({ id: '.dynamic_type' })) as never;
    createConnectorType({
      actionTypeRegistry: { has: jest.fn(() => false) } as unknown as ActionTypeRegistry,
      createTypeFromSpec,
      registerType: jest.fn(),
      request: {
        ...request,
        config: [
          {
            name: 'baseUrl',
            type: 'string',
            format: 'uri',
            required: true,
            default: 'https://api.abuseipdb.com',
          },
        ],
      },
    });
    const spec = (createTypeFromSpec as jest.Mock).mock.calls[0][0] as ConnectorSpec;
    if (!spec.schema) throw new Error('Expected connector config schema.');

    expect(spec.schema.parse({})).toEqual({ baseUrl: 'https://api.abuseipdb.com' });
    expect(z.toJSONSchema(spec.schema)).toMatchObject({
      properties: { baseUrl: { default: 'https://api.abuseipdb.com' } },
    });
  });

  it('converts and registers the requested connector type', () => {
    const actionTypeRegistry = { has: jest.fn(() => false) } as unknown as ActionTypeRegistry;
    const registerType = jest.fn();
    const createTypeFromSpec = jest.fn(() => ({ id: '.dynamic_type' })) as never;

    expect(
      createConnectorType({ actionTypeRegistry, createTypeFromSpec, registerType, request })
    ).toEqual({
      id: '.dynamic_type',
    });
    expect(createTypeFromSpec).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          id: '.dynamic_type',
          supportedFeatureIds: ['alerting', 'workflows'],
        }),
        actions: expect.objectContaining({ getItem: expect.any(Object) }),
      })
    );
    expect(registerType).toHaveBeenCalledWith({ id: '.dynamic_type' });
  });

  it('rejects duplicate connector type ids', () => {
    const has = jest.fn((id: string) => id === '.dynamic_type');
    const actionTypeRegistry = { has } as unknown as ActionTypeRegistry;
    const registerType = jest.fn();
    const createTypeFromSpec = jest.fn() as never;

    expect(() =>
      createConnectorType({ actionTypeRegistry, createTypeFromSpec, registerType, request })
    ).toThrow('Connector type ".dynamic_type" is already registered.');
    expect(has).toHaveBeenCalledWith('.dynamic_type');
    expect(registerType).not.toHaveBeenCalled();
  });

  it.each([
    ['https://example.test', 'https://example.test/items/a%2Fb%3Fc'],
    ['https://example.test/api/', 'https://example.test/api/items/a%2Fb%3Fc'],
  ])('appends the action path to %s', async (baseUrl, expectedUrl) => {
    const actionTypeRegistry = { has: jest.fn(() => false) } as unknown as ActionTypeRegistry;
    const createTypeFromSpec = jest.fn(() => ({ id: '.dynamic_type' })) as never;
    createConnectorType({
      actionTypeRegistry,
      createTypeFromSpec,
      registerType: jest.fn(),
      request: {
        ...request,
        actions: {
          getItem: {
            ...request.actions.getItem,
            input: [{ name: 'itemId', type: 'string', required: true }],
            request: {
              method: 'GET',
              url: '{{config.baseUrl}}',
              path: '/items/{{input.itemId}}',
            },
          },
        },
      },
    });
    const spec = (createTypeFromSpec as jest.Mock).mock.calls[0][0] as ConnectorSpec;
    const client = { request: jest.fn().mockResolvedValue({ data: { ok: true } }) };

    await spec.actions.getItem.handler({ config: { baseUrl }, secrets: {}, client } as never, {
      itemId: 'a/b?c',
    });

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({ url: expectedUrl, method: 'GET' })
    );
  });

  it('keeps a full URL template when no path is given', async () => {
    const actionTypeRegistry = { has: jest.fn(() => false) } as unknown as ActionTypeRegistry;
    const createTypeFromSpec = jest.fn(() => ({ id: '.dynamic_type' })) as never;
    createConnectorType({
      actionTypeRegistry,
      createTypeFromSpec,
      registerType: jest.fn(),
      request,
    });
    const spec = (createTypeFromSpec as jest.Mock).mock.calls[0][0] as ConnectorSpec;
    const client = { request: jest.fn().mockResolvedValue({ data: {} }) };

    await spec.actions.getItem.handler({ config: {}, secrets: {}, client } as never, {});

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://example.test/items' })
    );
  });

  it('preserves typed whole-value placeholders in JSON bodies and interpolates embedded values as strings', async () => {
    const createTypeFromSpec = jest.fn(() => ({ id: '.dynamic_type' })) as never;
    createConnectorType({
      actionTypeRegistry: { has: jest.fn(() => false) } as unknown as ActionTypeRegistry,
      createTypeFromSpec,
      registerType: jest.fn(),
      request: {
        ...request,
        actions: {
          submit: {
            ...request.actions.getItem,
            input: [
              { name: 'ids', type: 'array', items: 'number', required: true },
              { name: 'enabled', type: 'boolean', required: true },
              { name: 'count', type: 'number', required: true },
            ],
            request: {
              method: 'POST',
              url: 'https://example.test/items',
              body: {
                ids: '{{input.ids}}',
                enabled: '{{input.enabled}}',
                count: 'count={{input.count}}',
              },
            },
          },
        },
      },
    });
    const spec = (createTypeFromSpec as jest.Mock).mock.calls[0][0] as ConnectorSpec;
    const client = { request: jest.fn().mockResolvedValue({ data: {} }) };

    await spec.actions.submit.handler({ config: {}, secrets: {}, client } as never, {
      ids: [2, 5],
      enabled: true,
      count: 3,
    });

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { ids: [2, 5], enabled: true, count: 'count=3' },
      })
    );
  });

  it('maps multiple auth choices, array config fields, and an HTTP connector test', async () => {
    const createTypeFromSpec = jest.fn(() => ({ id: '.dynamic_type' })) as never;
    createConnectorType({
      actionTypeRegistry: { has: jest.fn(() => false) } as unknown as ActionTypeRegistry,
      createTypeFromSpec,
      registerType: jest.fn(),
      request: {
        ...request,
        config: [{ name: 'hosts', type: 'array', items: 'string', required: true }],
        auth: { types: ['basic', { type: 'api_key_header', defaults: { headerField: 'X-Key' } }] },
        test: { description: 'Ping', request: { method: 'GET', url: 'https://example.test/ping' } },
      },
    });
    const spec = (createTypeFromSpec as jest.Mock).mock.calls[0][0] as ConnectorSpec;
    expect(spec.auth?.types).toEqual([
      'basic',
      { type: 'api_key_header', defaults: { headerField: 'X-Key' } },
    ]);
    const schema = spec.schema;
    if (!schema) throw new Error('Expected connector config schema.');
    expect(schema.safeParse({ hosts: ['a', 'b'] }).success).toBe(true);
    expect(schema.safeParse({ hosts: Array.from({ length: 101 }, () => 'host') }).success).toBe(
      false
    );
    const client = { request: jest.fn().mockResolvedValue({ data: { ok: true } }) };
    await spec.test.handler({ config: {}, secrets: {}, client } as never);
    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://example.test/ping' })
    );
  });

  it('maps legacy API key auth to ConnectorSpec defaults', () => {
    const createTypeFromSpec = jest.fn(() => ({ id: '.dynamic_type' })) as never;
    createConnectorType({
      actionTypeRegistry: { has: jest.fn(() => false) } as unknown as ActionTypeRegistry,
      createTypeFromSpec,
      registerType: jest.fn(),
      request: { ...request, auth: { type: 'api_key_header', headerName: 'X-API-Key' } },
    });
    const spec = (createTypeFromSpec as jest.Mock).mock.calls[0][0] as ConnectorSpec;
    expect(spec.auth?.types).toEqual([
      { type: 'api_key_header', defaults: { headerField: 'X-API-Key' } },
    ]);
  });

  it('enforces URI, IPv4, and date-time config formats in the generated schema', () => {
    const createTypeFromSpec = jest.fn(() => ({ id: '.dynamic_type' })) as never;
    createConnectorType({
      actionTypeRegistry: { has: jest.fn(() => false) } as unknown as ActionTypeRegistry,
      createTypeFromSpec,
      registerType: jest.fn(),
      request: {
        ...request,
        config: [
          { name: 'endpoint', type: 'string', format: 'uri', required: true },
          { name: 'address', type: 'string', format: 'ipv4', required: true },
          { name: 'createdAt', type: 'string', format: 'date-time', required: true },
        ],
      },
    });
    const spec = (createTypeFromSpec as jest.Mock).mock.calls[0][0] as ConnectorSpec;
    const schema = spec.schema;
    if (!schema) throw new Error('Expected connector config schema.');

    expect(
      schema.safeParse({
        endpoint: 'https://example.test',
        address: '192.0.2.1',
        createdAt: '2026-11-03T12:00:00Z',
      }).success
    ).toBe(true);
    expect(
      schema.safeParse({
        endpoint: 'not a URI',
        address: '999.0.2.1',
        createdAt: 'yesterday',
      }).success
    ).toBe(false);
  });
});
