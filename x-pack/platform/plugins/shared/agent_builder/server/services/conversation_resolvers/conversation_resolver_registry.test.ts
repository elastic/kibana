/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { createConversationResolverRegistry } from './conversation_resolver_registry';

const context = {
  origin: { type: 'slack', external_conversation_id: 'slack:T:C:1.1' },
  spaceId: 'default',
};

describe('createConversationResolverRegistry', () => {
  it('is unbound without resolvers', async () => {
    const registry = createConversationResolverRegistry(loggerMock.create());
    expect(await registry.resolve(context)).toEqual({ status: 'unbound' });
  });

  it('returns the first non-unbound resolution', async () => {
    const registry = createConversationResolverRegistry(loggerMock.create());
    registry.register({ id: 'a', resolve: async () => ({ status: 'unbound' }) });
    registry.register({
      id: 'b',
      resolve: async () => ({ status: 'held', conversationId: 'conv-1' }),
    });
    expect(await registry.resolve(context)).toEqual({ status: 'held', conversationId: 'conv-1' });
  });

  it('reports a throwing resolver as unavailable, not unbound', async () => {
    const registry = createConversationResolverRegistry(loggerMock.create());
    registry.register({
      id: 'a',
      resolve: async () => {
        throw new Error('boom');
      },
    });
    expect(await registry.resolve(context)).toEqual({
      status: 'unavailable',
      reason: 'resolver_failed',
    });
  });

  it('rejects a duplicate id', () => {
    const registry = createConversationResolverRegistry(loggerMock.create());
    registry.register({ id: 'a', resolve: async () => ({ status: 'unbound' }) });
    expect(() =>
      registry.register({ id: 'a', resolve: async () => ({ status: 'unbound' }) })
    ).toThrow(/already registered/);
  });
});
