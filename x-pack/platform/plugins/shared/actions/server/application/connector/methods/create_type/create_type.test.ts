/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeRegistry } from '../../../../action_type_registry';
import { createConnectorTypeFromSpec } from '../../../../lib';
import { createConnectorType } from './create_type';

jest.mock('../../../../lib', () => ({
  ...jest.requireActual('../../../../lib'),
  createConnectorTypeFromSpec: jest.fn(() => ({ id: '.dynamic_type' })),
}));

const request = {
  id: '.dynamic_type',
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
    const conversionServices = {
      getActionsConfigurationUtilities: jest.fn(),
      getAxiosInstanceWithAuth: jest.fn(),
      getCredential: jest.fn(),
      getClientLeasePool: jest.fn(),
      getRelayClient: jest.fn(),
      getConnectorJwtSigner: jest.fn(),
    } as never;

    expect(
      createConnectorType({ actionTypeRegistry, conversionServices, registerType, request })
    ).toEqual({
      id: '.dynamic_type',
    });
    expect(createConnectorTypeFromSpec).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ id: '.dynamic_type' }),
        actions: expect.objectContaining({ getItem: expect.any(Object) }),
      }),
      conversionServices
    );
    expect(registerType).toHaveBeenCalledWith({ id: '.dynamic_type' });
  });

  it('rejects duplicate connector type ids', () => {
    const actionTypeRegistry = { has: jest.fn(() => true) } as unknown as ActionTypeRegistry;
    const registerType = jest.fn();
    const conversionServices = {} as never;

    expect(() =>
      createConnectorType({ actionTypeRegistry, conversionServices, registerType, request })
    ).toThrow('Connector type ".dynamic_type" is already registered.');
    expect(registerType).not.toHaveBeenCalled();
  });
});
