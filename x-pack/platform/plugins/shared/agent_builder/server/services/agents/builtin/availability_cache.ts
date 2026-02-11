/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LRUCache } from 'lru-cache';
import type {
  AgentAvailabilityContext,
  AgentAvailabilityConfig,
  AgentAvailabilityResult,
} from '@kbn/agent-builder-server/agents/builtin_definition';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default TTL

export class AgentAvailabilityCache {
  private cache = new LRUCache<string, AgentAvailabilityResult>({
    max: 1000,
    ttl: DEFAULT_TTL,
    allowStale: false,
    ttlAutopurge: false,
  });

  /**
   * Get from cache, or recompute and store, then return.
   */
  async getOrCompute(
    agentId: string,
    config: AgentAvailabilityConfig,
    context: AgentAvailabilityContext
  ): Promise<AgentAvailabilityResult> {
    const cacheKey = getCacheKey(agentId, config, context);
    const cachedValue = cacheKey ? this.cache.get(cacheKey) : undefined;
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    const newValue = await config.handler(context);
    if (cacheKey) {
      this.cache.set(cacheKey, newValue, {
        ttl: config.cacheTtl ? config.cacheTtl * 1000 : DEFAULT_TTL,
      });
    }
    return newValue;
  }

  clear() {
    this.cache.clear();
  }

  /**
   * Check if a value is cached for the given tool and context.
   */
  has(
    agentId: string,
    config: AgentAvailabilityConfig,
    context: AgentAvailabilityContext
  ): boolean {
    const cacheKey = getCacheKey(agentId, config, context);
    return cacheKey ? this.cache.has(cacheKey) : false;
  }
}

const getCacheKey = (
  agentId: string,
  config: AgentAvailabilityConfig,
  context: AgentAvailabilityContext
): string | undefined => {
  switch (config.cacheMode) {
    case 'global':
      return `${agentId}`;
    case 'space':
      return `${agentId}||${context.spaceId}`;
    case 'none':
      return undefined;
  }
};
