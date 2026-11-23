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
import type { PrincipalKeyResolver } from './principal_key';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default TTL
// Bounded by resources x spaces. Going over a cap only costs recomputation.
const MAX_SHARED_ENTRIES = 5000;
// Bounded by resources x spaces x principals, where every API key is a principal of its own.
const MAX_PRINCIPAL_ENTRIES = 10000;

type AvailabilityStore = LRUCache<string, AvailabilityResult>;

interface CacheLocation {
  store: AvailabilityStore;
  key: string;
}

const createStore = (max: number): AvailabilityStore =>
  new LRUCache<string, AvailabilityResult>({
    max,
    ttl: DEFAULT_TTL,
    allowStale: false,
    ttlAutopurge: false,
  });

export interface AvailabilityCacheOptions {
  /**
   * Resolves the principal part of the key for the `space-user` cache mode.
   * Without it, or when it resolves no key, `space-user` results are not cached.
   */
  getPrincipalKey?: PrincipalKeyResolver;
}

export class AvailabilityCache {
  /** Results for the `global` and `space` cache modes. */
  private readonly sharedStore = createStore(MAX_SHARED_ENTRIES);
  /** Results for the `space-user` cache mode, kept apart so that principals cannot evict shared results. */
  private readonly principalStore = createStore(MAX_PRINCIPAL_ENTRIES);
  private readonly getPrincipalKey?: PrincipalKeyResolver;

  constructor({ getPrincipalKey }: AvailabilityCacheOptions = {}) {
    this.getPrincipalKey = getPrincipalKey;
  }

  async getOrCompute(
    resourceId: string,
    config: AvailabilityConfig,
    context: AvailabilityContext
  ): Promise<AvailabilityResult> {
    const location = this.getCacheLocation(resourceId, config, context);
    const cachedValue = location ? location.store.get(location.key) : undefined;
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    const newValue = await config.handler(context);
    if (location) {
      location.store.set(location.key, newValue, {
        ttl: config.cacheTtl ? config.cacheTtl * 1000 : DEFAULT_TTL,
      });
    }
    return newValue;
  }

  clear() {
    this.sharedStore.clear();
    this.principalStore.clear();
  }

  has(resourceId: string, config: AvailabilityConfig, context: AvailabilityContext): boolean {
    const location = this.getCacheLocation(resourceId, config, context);
    return location ? location.store.has(location.key) : false;
  }

  private getCacheLocation(
    resourceId: string,
    config: AvailabilityConfig,
    context: AvailabilityContext
  ): CacheLocation | undefined {
    switch (config.cacheMode) {
      case 'global':
        return { store: this.sharedStore, key: resourceId };
      case 'space':
        return { store: this.sharedStore, key: `${resourceId}||${context.spaceId}` };
      case 'space-user': {
        const principalKey = this.getPrincipalKey?.(context.request);
        if (!principalKey) {
          return undefined;
        }
        return {
          store: this.principalStore,
          key: `${resourceId}||${context.spaceId}||${principalKey}`,
        };
      }
      case 'none':
        return undefined;
    }
  }
}
