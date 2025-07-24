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
      children: React.lazy(() =>
        Promise.resolve({
          default: () => <div>Test</div>,
        })
      ),
    };

    registry.registerHandler(context);
    expect(registry.getContextByKey('test-id')).toEqual(context);
  });

  it('should throw an error when registering a duplicate key', () => {
    const context: ContextDefinitionPublic = {
      key: 'duplicate-id',
      children: React.lazy(() =>
        Promise.resolve({
          default: () => <div>Duplicate</div>,
        })
      ),
    };

    registry.registerHandler(context);
    expect(() => registry.registerHandler(context)).toThrowError(
      "Context with key 'duplicate-id' is already registered with public context registry."
    );
  });

  it('should retrieve all registered contexts', () => {
    const context1: ContextDefinitionPublic = {
      key: 'id-1',
      children: React.lazy(() =>
        Promise.resolve({
          default: () => <div>Context 1</div>,
        })
      ),
    };

    const context2: ContextDefinitionPublic = {
      key: 'id-2',
      children: React.lazy(() =>
        Promise.resolve({
          default: () => <div>Context 2</div>,
        })
      ),
    };

    registry.registerHandler(context1);
    registry.registerHandler(context2);

    expect(registry.getAll()).toEqual([context1, context2]);
  });

  it('should return undefined for a non-existent key', () => {
    expect(() => registry.getContextByKey('non-existent-id')).toThrowError(
      `Context with key 'non-existent-id' is not registered.`
    );
  });
});
