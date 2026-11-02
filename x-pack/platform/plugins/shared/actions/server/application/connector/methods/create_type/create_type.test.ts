/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeRegistry } from '../../../../action_type_registry';
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
});
