/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataSourceUIConfigRegistry } from './registry';
import type { DataSourceUIConfig } from './types';

describe('DataSourceUIConfigRegistry', () => {
  let registry: DataSourceUIConfigRegistry;

  beforeEach(() => {
    registry = new DataSourceUIConfigRegistry();
  });

  const createMockUIConfig = (dataSourceId: string): DataSourceUIConfig => ({
    dataSourceId,
    uiOverride: {
      formComponentImport: () => Promise.resolve({ default: () => null }),
      serializer: jest.fn(),
      deserializer: jest.fn(),
      displayName: `${dataSourceId} Display Name`,
      selectMessage: `Connect to ${dataSourceId}`,
      iconClass: 'integration',
    },
  });

  describe('register', () => {
    it('should register a UI config', () => {
      const mockConfig = createMockUIConfig('test-source');
      registry.register(mockConfig);

      expect(registry.get('test-source')).toEqual(mockConfig);
    });

    it('should throw error when registering duplicate config', () => {
      const mockConfig = createMockUIConfig('test-source');
      registry.register(mockConfig);

      expect(() => registry.register(mockConfig)).toThrow(
        'UI config for data source "test-source" already registered'
      );
    });

    it('should register multiple different configs', () => {
      const config1 = createMockUIConfig('source-1');
      const config2 = createMockUIConfig('source-2');

      registry.register(config1);
      registry.register(config2);

      expect(registry.get('source-1')).toEqual(config1);
      expect(registry.get('source-2')).toEqual(config2);
    });

    it('should register config without UI override', () => {
      const configWithoutOverride: DataSourceUIConfig = {
        dataSourceId: 'simple-source',
      };

      registry.register(configWithoutOverride);

      expect(registry.get('simple-source')).toEqual(configWithoutOverride);
    });
  });

  describe('get', () => {
    it('should return config when it exists', () => {
      const mockConfig = createMockUIConfig('test-source');
      registry.register(mockConfig);

      const config = registry.get('test-source');

      expect(config).toEqual(mockConfig);
    });

    it('should return undefined for unregistered dataSourceId', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });

    it('should return correct config when multiple are registered', () => {
      const config1 = createMockUIConfig('source-1');
      const config2 = createMockUIConfig('source-2');
      const config3 = createMockUIConfig('source-3');

      registry.register(config1);
      registry.register(config2);
      registry.register(config3);

      expect(registry.get('source-2')).toEqual(config2);
    });
  });

  describe('getUIOverride', () => {
    it('should return UI override when config has one', () => {
      const mockConfig = createMockUIConfig('test-source');
      registry.register(mockConfig);

      const override = registry.getUIOverride('test-source');

      expect(override).toEqual(mockConfig.uiOverride);
    });

    it('should return undefined when config has no override', () => {
      const configWithoutOverride: DataSourceUIConfig = {
        dataSourceId: 'no-override',
      };
      registry.register(configWithoutOverride);

      expect(registry.getUIOverride('no-override')).toBeUndefined();
    });

    it('should return undefined for unregistered source', () => {
      expect(registry.getUIOverride('non-existent')).toBeUndefined();
    });

    it('should return correct override for specific source when multiple exist', () => {
      const config1 = createMockUIConfig('github');
      const config2: DataSourceUIConfig = { dataSourceId: 'notion' }; // No override
      const config3 = createMockUIConfig('slack');

      registry.register(config1);
      registry.register(config2);
      registry.register(config3);

      expect(registry.getUIOverride('github')).toEqual(config1.uiOverride);
      expect(registry.getUIOverride('notion')).toBeUndefined();
      expect(registry.getUIOverride('slack')).toEqual(config3.uiOverride);
    });
  });
});
