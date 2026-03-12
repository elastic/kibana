/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClientTypeRegistry } from './client_type_registry';

describe('ClientTypeRegistry', () => {
  let registry: ClientTypeRegistry;

  beforeEach(() => {
    registry = new ClientTypeRegistry();
  });

  describe('register', () => {
    it('registers a client type', () => {
      registry.register({
        id: 'http',
        supportedAuthTypes: '*',
        create: jest.fn(),
      });

      expect(registry.has('http')).toBe(true);
    });

    it('throws when registering a duplicate client type', () => {
      registry.register({
        id: 'http',
        supportedAuthTypes: '*',
        create: jest.fn(),
      });

      expect(() =>
        registry.register({
          id: 'http',
          supportedAuthTypes: '*',
          create: jest.fn(),
        })
      ).toThrow(/already registered/);
    });
  });

  describe('get', () => {
    it('returns a registered client type', () => {
      const mockCreate = jest.fn();
      registry.register({
        id: 'mcp',
        supportedAuthTypes: ['bearer', 'basic'],
        create: mockCreate,
      });

      const clientType = registry.get('mcp');

      expect(clientType.id).toBe('mcp');
      expect(clientType.supportedAuthTypes).toEqual(['bearer', 'basic']);
      expect(clientType.create).toBe(mockCreate);
    });

    it('throws for an unregistered client type', () => {
      expect(() => registry.get('nonexistent')).toThrow(/not registered/);
    });
  });

  describe('has', () => {
    it('returns false for an unregistered client type', () => {
      expect(registry.has('http')).toBe(false);
    });
  });

  describe('getAllTypes', () => {
    it('returns all registered client type IDs', () => {
      registry.register({ id: 'http', supportedAuthTypes: '*', create: jest.fn() });
      registry.register({ id: 'mcp', supportedAuthTypes: ['bearer'], create: jest.fn() });

      expect(registry.getAllTypes()).toEqual(['http', 'mcp']);
    });

    it('returns empty array when no types registered', () => {
      expect(registry.getAllTypes()).toEqual([]);
    });
  });
});
