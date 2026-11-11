/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LRUCache } from 'lru-cache';
import type {
  AvailabilityContext,
  AvailabilityConfig,
  AvailabilityResult,
} from '@kbn/agent-builder-server';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default TTL

export class AvailabilityCache {
  private cache = new LRUCache<string, AvailabilityResult>({
    max: 1000,
    ttl: DEFAULT_TTL,
    allowStale: false,
    ttlAutopurge: false,
  });

  async getOrCompute(
    resourceId: string,
    config: AvailabilityConfig,
    context: AvailabilityContext
  ): Promise<AvailabilityResult> {
    const cacheKey = getCacheKey(resourceId, config, context);
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

  has(resourceId: string, config: AvailabilityConfig, context: AvailabilityContext): boolean {
    const cacheKey = getCacheKey(resourceId, config, context);
    return cacheKey ? this.cache.has(cacheKey) : false;
  }
}

const getCacheKey = (
  resourceId: string,
  config: AvailabilityConfig,
  context: AvailabilityContext
): string | undefined => {
  switch (config.cacheMode) {
    case 'global':
      return `${resourceId}`;
    case 'space':
      return `${resourceId}||${context.spaceId}`;
    case 'none':
      return undefined;
  }
};
