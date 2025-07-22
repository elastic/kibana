/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ContextRegistryPublic, ContextDefinitionPublic } from './context_registry_public';

describe('ContextRegistryPublic', () => {
  let registry: ContextRegistryPublic;

  beforeEach(() => {
    registry = new ContextRegistryPublic();
  });

  it('should register a public context definition successfully', () => {
    const context: ContextDefinitionPublic = {
      key: 'test-id',
      displayName: 'Test Context',
      description: 'A test context',
      children: React.lazy(() =>
        Promise.resolve({
          default: () => <div>Test</div>,
        })
      ),
    };

    registry.register(context);
    expect(registry.get('test-id')).toEqual(context);
  });

  it('should throw an error when registering a duplicate key', () => {
    const context: ContextDefinitionPublic = {
      key: 'duplicate-id',
      displayName: 'Duplicate Context',
      description: 'A duplicate context',
      children: React.lazy(() =>
        Promise.resolve({
          default: () => <div>Duplicate</div>,
        })
      ),
    };

    registry.register(context);
    expect(() => registry.register(context)).toThrowError(
      "Context with key 'duplicate-id' is already registered with public context registry."
    );
  });

  it('should retrieve all registered contexts', () => {
    const context1: ContextDefinitionPublic = {
      key: 'id-1',
      displayName: 'Context 1',
      description: 'First context',
      children: React.lazy(() =>
        Promise.resolve({
          default: () => <div>Context 1</div>,
        })
      ),
    };

    const context2: ContextDefinitionPublic = {
      key: 'id-2',
      displayName: 'Context 2',
      description: 'Second context',
      children: React.lazy(() =>
        Promise.resolve({
          default: () => <div>Context 2</div>,
        })
      ),
    };

    registry.register(context1);
    registry.register(context2);

    expect(registry.getAll()).toEqual([context1, context2]);
  });

  it('should return undefined for a non-existent key', () => {
    expect(registry.get('non-existent-id')).toBeUndefined();
  });
});
