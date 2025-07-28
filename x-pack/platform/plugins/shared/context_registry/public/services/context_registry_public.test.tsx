/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ContextRegistryPublic, ContextDefinitionPublic } from './context_registry_public';
import { OWNERS } from '../../common/constants';

const mockOwner = OWNERS[0];

describe('ContextRegistryPublic', () => {
  let registry: ContextRegistryPublic;

  beforeEach(() => {
    registry = new ContextRegistryPublic();
  });

  it('should register a public context definition successfully for an owner', () => {
    const context: ContextDefinitionPublic = {
      key: 'test-id',
      owner: mockOwner,
      children: React.lazy(() =>
        Promise.resolve({
          default: () => <div>Test</div>,
        })
      ),
    };

    registry.registerHandler(context);
    expect(registry.getContextByKey({ owner: mockOwner, key: 'test-id' })).toEqual(context);
  });

  it('should throw an error when registering a duplicate key for the same owner', () => {
    const context: ContextDefinitionPublic = {
      key: 'duplicate-id',
      owner: mockOwner,
      children: React.lazy(() =>
        Promise.resolve({
          default: () => <div>Duplicate</div>,
        })
      ),
    };

    registry.registerHandler(context);
    expect(() => registry.registerHandler(context)).toThrowError(
      `Context with key 'duplicate-id' is already registered for owner '${mockOwner}'.`
    );
  });

  it('should retrieve all registered contexts for an owner', () => {
    const context1: ContextDefinitionPublic = {
      key: 'id-1',
      owner: mockOwner,
      children: React.lazy(() =>
        Promise.resolve({
          default: () => <div>Context 1</div>,
        })
      ),
    };

    const context2: ContextDefinitionPublic = {
      key: 'id-2',
      owner: mockOwner,
      children: React.lazy(() =>
        Promise.resolve({
          default: () => <div>Context 2</div>,
        })
      ),
    };

    registry.registerHandler(context1);
    registry.registerHandler(context2);

    expect(registry.getContextByOwner(mockOwner)).toEqual([context1, context2]);
  });

  it('should throw an error for a non-existent key for an owner', () => {
    expect(() =>
      registry.getContextByKey({ owner: mockOwner, key: 'non-existent-id' })
    ).toThrowError(
      `Context with key 'non-existent-id' is not registered for owner '${mockOwner}'.`
    );
  });

  it('should throw an error when the owner is not recognized', () => {
    const invalidOwner = 'invalid-owner';
    const context: ContextDefinitionPublic = {
      key: 'test-id',
      owner: invalidOwner as any, // Intentionally using an invalid owner type
      children: React.lazy(() =>
        Promise.resolve({
          default: () => <div>Test</div>,
        })
      ),
    };

    expect(() => registry.registerHandler(context)).toThrowError(
      `Owner '${invalidOwner}' is not recognized.`
    );
  });

  it('should retrieve all contexts for a specific owner', () => {
    const context1: ContextDefinitionPublic = {
      key: 'context-1',
      owner: mockOwner,
      children: React.lazy(() =>
        Promise.resolve({
          default: () => <div>Context 1</div>,
        })
      ),
    };

    const context2: ContextDefinitionPublic = {
      key: 'context-2',
      owner: mockOwner,
      children: React.lazy(() =>
        Promise.resolve({
          default: () => <div>Context 2</div>,
        })
      ),
    };

    registry.registerHandler(context1);
    registry.registerHandler(context2);

    const contexts = registry.getContextByOwner(mockOwner);
    expect(contexts).toEqual([context1, context2]);
  });
});
