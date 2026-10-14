/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  ConversationResolution,
  ConversationResolver,
  ConversationResolverContext,
} from '@kbn/agent-builder-server';

export interface ConversationResolverRegistry {
  register: (resolver: ConversationResolver) => void;
  /** First resolver that claims the thread wins. A throwing resolver is `unavailable`, never `unbound`. */
  resolve: (context: ConversationResolverContext) => Promise<ConversationResolution>;
}

export const createConversationResolverRegistry = (
  logger: Logger
): ConversationResolverRegistry => {
  const resolvers = new Map<string, ConversationResolver>();

  return {
    register: (resolver) => {
      if (resolvers.has(resolver.id)) {
        throw new Error(`Conversation resolver [${resolver.id}] is already registered`);
      }
      resolvers.set(resolver.id, resolver);
    },
    resolve: async (context) => {
      for (const resolver of resolvers.values()) {
        try {
          const resolution = await resolver.resolve(context);
          if (resolution.status !== 'unbound') {
            return resolution;
          }
        } catch (error) {
          logger.warn(`Conversation resolver [${resolver.id}] failed: ${error.message}`);
          return { status: 'unavailable', reason: 'resolver_failed' };
        }
      }
      return { status: 'unbound' };
    },
  };
};
