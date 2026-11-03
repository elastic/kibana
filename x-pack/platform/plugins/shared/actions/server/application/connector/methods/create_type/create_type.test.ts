/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeRegistry } from '../../../../action_type_registry';
import type { ConnectorSpec } from '@kbn/connector-specs';
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
});
