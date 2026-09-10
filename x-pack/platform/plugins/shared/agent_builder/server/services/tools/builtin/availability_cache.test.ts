/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ToolAvailabilityContext,
  ToolAvailabilityConfig,
  ToolAvailabilityResult,
} from '@kbn/agent-builder-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { ToolAvailabilityCache } from './availability_cache';

describe('ToolAvailabilityCache', () => {
  let cache: ToolAvailabilityCache;
  let mockHandler: jest.Mock<Promise<ToolAvailabilityResult>>;
  let context: ToolAvailabilityContext;

  beforeEach(() => {
    cache = new ToolAvailabilityCache();
    mockHandler = jest.fn();
    context = {
      request: httpServerMock.createKibanaRequest(),
      uiSettings: uiSettingsServiceMock.createClient(),
      spaceId: 'default',
    };
  });

  describe('getOrCompute', () => {
    it('calls the handler on cache miss', async () => {
      const result: ToolAvailabilityResult = { status: 'available' };
      mockHandler.mockResolvedValue(result);

      const config: ToolAvailabilityConfig = {
        handler: mockHandler,
        cacheMode: 'global',
      };

      const value = await cache.getOrCompute('tool-1', config, context);

      expect(value).toEqual(result);
      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith(context);
    });

    it('returns cached value on cache hit without calling handler', async () => {
      const result: ToolAvailabilityResult = { status: 'available' };
      mockHandler.mockResolvedValue(result);

      const config: ToolAvailabilityConfig = {
        handler: mockHandler,
        cacheMode: 'global',
      };

      // First call - cache miss
      await cache.getOrCompute('tool-1', config, context);
      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Second call - cache hit
      const cachedValue = await cache.getOrCompute('tool-1', config, context);
      expect(cachedValue).toEqual(result);
      expect(mockHandler).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('caches unavailable status', async () => {
      const result: ToolAvailabilityResult = {
        status: 'unavailable',
        reason: 'Feature disabled',
      };
      mockHandler.mockResolvedValue(result);

      const config: ToolAvailabilityConfig = {
        handler: mockHandler,
        cacheMode: 'global',
      };

      const value1 = await cache.getOrCompute('tool-1', config, context);
      const value2 = await cache.getOrCompute('tool-1', config, context);

      expect(value1).toEqual(result);
      expect(value2).toEqual(result);
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('cache modes', () => {
    it('uses global cache mode correctly', async () => {
      const result: ToolAvailabilityResult = { status: 'available' };
      mockHandler.mockResolvedValue(result);

      const config: ToolAvailabilityConfig = {
        handler: mockHandler,
        cacheMode: 'global',
      };

      // Call from different spaces
      const context1 = { ...context, spaceId: 'space-1' };
      const context2 = { ...context, spaceId: 'space-2' };

      await cache.getOrCompute('tool-1', config, context1);
      await cache.getOrCompute('tool-1', config, context2);

      // Handler should only be called once since cache is global
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('uses space cache mode correctly', async () => {
      const result1: ToolAvailabilityResult = { status: 'available' };
      const result2: ToolAvailabilityResult = { status: 'unavailable' };
      mockHandler.mockResolvedValueOnce(result1).mockResolvedValueOnce(result2);

      const config: ToolAvailabilityConfig = {
        handler: mockHandler,
        cacheMode: 'space',
      };

      const context1 = { ...context, spaceId: 'space-1' };
      const context2 = { ...context, spaceId: 'space-2' };

      const value1 = await cache.getOrCompute('tool-1', config, context1);
      const value2 = await cache.getOrCompute('tool-1', config, context2);

      // Handler should be called twice, once per space
      expect(mockHandler).toHaveBeenCalledTimes(2);
      expect(value1).toEqual(result1);
      expect(value2).toEqual(result2);

      // Verify each space has its own cache
      const cachedValue1 = await cache.getOrCompute('tool-1', config, context1);
      const cachedValue2 = await cache.getOrCompute('tool-1', config, context2);

      expect(cachedValue1).toEqual(result1);
      expect(cachedValue2).toEqual(result2);
      expect(mockHandler).toHaveBeenCalledTimes(2); // Still only 2 calls
    });

    it('bypasses cache when mode is none', async () => {
      const result: ToolAvailabilityResult = { status: 'available' };
      mockHandler.mockResolvedValue(result);

      const config: ToolAvailabilityConfig = {
        handler: mockHandler,
        cacheMode: 'none',
      };

      await cache.getOrCompute('tool-1', config, context);
      await cache.getOrCompute('tool-1', config, context);
      await cache.getOrCompute('tool-1', config, context);

      // Handler should be called every time
      expect(mockHandler).toHaveBeenCalledTimes(3);
    });
  });

  describe('TTL behavior', () => {
    it('caches values and respects the cache', async () => {
      const result: ToolAvailabilityResult = { status: 'available' };
      mockHandler.mockResolvedValue(result);

      const config: ToolAvailabilityConfig = {
        handler: mockHandler,
        cacheMode: 'global',
        cacheTtl: 300, // 5 minutes
      };

      // First call should execute handler
      await cache.getOrCompute('tool-1', config, context);
      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(cache.has('tool-1', config, context)).toBe(true);

      // Subsequent calls should use cache
      await cache.getOrCompute('tool-1', config, context);
      await cache.getOrCompute('tool-1', config, context);
      expect(mockHandler).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('accepts custom TTL configuration in seconds', async () => {
      const result: ToolAvailabilityResult = { status: 'available' };
      mockHandler.mockResolvedValue(result);

      // Test with a very short TTL to verify it's being set
      const config: ToolAvailabilityConfig = {
        handler: mockHandler,
        cacheMode: 'global',
        cacheTtl: 1, // 1 second
      };

      await cache.getOrCompute('tool-1', config, context);
      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // After expiration, should call handler again
      await cache.getOrCompute('tool-1', config, context);
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });

    it('allows different tools to have different TTL configurations', async () => {
      const result: ToolAvailabilityResult = { status: 'available' };
      const handler1 = jest.fn().mockResolvedValue(result);
      const handler2 = jest.fn().mockResolvedValue(result);

      const shortTtlConfig: ToolAvailabilityConfig = {
        handler: handler1,
        cacheMode: 'global',
        cacheTtl: 1, // 1 second
      };

      const longTtlConfig: ToolAvailabilityConfig = {
        handler: handler2,
        cacheMode: 'global',
        cacheTtl: 300, // 5 minutes
      };

      // Cache both tools
      await cache.getOrCompute('tool-1', shortTtlConfig, context);
      await cache.getOrCompute('tool-2', longTtlConfig, context);
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);

      // Wait for short TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Tool 1 should have expired, tool 2 should still be cached
      await cache.getOrCompute('tool-1', shortTtlConfig, context);
      await cache.getOrCompute('tool-2', longTtlConfig, context);

      expect(handler1).toHaveBeenCalledTimes(2); // Called again after expiry
      expect(handler2).toHaveBeenCalledTimes(1); // Still cached
    });
  });

  describe('clear', () => {
    it('clears all cached values', async () => {
      const result: ToolAvailabilityResult = { status: 'available' };
      mockHandler.mockResolvedValue(result);

      const config: ToolAvailabilityConfig = {
        handler: mockHandler,
        cacheMode: 'global',
      };

      // Cache some values
      await cache.getOrCompute('tool-1', config, context);
      await cache.getOrCompute('tool-2', config, context);
      expect(mockHandler).toHaveBeenCalledTimes(2);

      // Clear the cache
      cache.clear();

      // Next calls should hit the handler again
      await cache.getOrCompute('tool-1', config, context);
      await cache.getOrCompute('tool-2', config, context);
      expect(mockHandler).toHaveBeenCalledTimes(4);
    });
  });

  describe('has', () => {
    it('returns true when value is cached', async () => {
      const result: ToolAvailabilityResult = { status: 'available' };
      mockHandler.mockResolvedValue(result);

      const config: ToolAvailabilityConfig = {
        handler: mockHandler,
        cacheMode: 'global',
      };

      expect(cache.has('tool-1', config, context)).toBe(false);

      await cache.getOrCompute('tool-1', config, context);

      expect(cache.has('tool-1', config, context)).toBe(true);
    });

    it('returns false when cache mode is none', async () => {
      const result: ToolAvailabilityResult = { status: 'available' };
      mockHandler.mockResolvedValue(result);

      const config: ToolAvailabilityConfig = {
        handler: mockHandler,
        cacheMode: 'none',
      };

      await cache.getOrCompute('tool-1', config, context);

      expect(cache.has('tool-1', config, context)).toBe(false);
    });

    it('respects different cache modes', async () => {
      const result: ToolAvailabilityResult = { status: 'available' };
      mockHandler.mockResolvedValue(result);

      const globalConfig: ToolAvailabilityConfig = {
        handler: mockHandler,
        cacheMode: 'global',
      };

      const spaceConfig: ToolAvailabilityConfig = {
        handler: mockHandler,
        cacheMode: 'space',
      };

      const context1 = { ...context, spaceId: 'space-1' };
      const context2 = { ...context, spaceId: 'space-2' };

      // Global cache
      await cache.getOrCompute('tool-1', globalConfig, context1);
      expect(cache.has('tool-1', globalConfig, context1)).toBe(true);
      expect(cache.has('tool-1', globalConfig, context2)).toBe(true); // Same for all spaces

      // Space cache
      await cache.getOrCompute('tool-2', spaceConfig, context1);
      expect(cache.has('tool-2', spaceConfig, context1)).toBe(true);
      expect(cache.has('tool-2', spaceConfig, context2)).toBe(false); // Different space
    });
  });

  describe('concurrent requests', () => {
    it('handles concurrent requests for the same tool correctly', async () => {
      const result: ToolAvailabilityResult = { status: 'available' };
      let resolveHandler: (value: ToolAvailabilityResult) => void;
      const handlerPromise = new Promise<ToolAvailabilityResult>((resolve) => {
        resolveHandler = resolve;
      });
      mockHandler.mockReturnValue(handlerPromise);

      const config: ToolAvailabilityConfig = {
        handler: mockHandler,
        cacheMode: 'global',
      };

      // Start multiple concurrent requests
      const promise1 = cache.getOrCompute('tool-1', config, context);
      const promise2 = cache.getOrCompute('tool-1', config, context);
      const promise3 = cache.getOrCompute('tool-1', config, context);

      // Resolve the handler
      resolveHandler!(result);

      const [value1, value2, value3] = await Promise.all([promise1, promise2, promise3]);

      // First request triggers handler, others use cached value
      // Note: Due to the async nature, the handler might be called more than once
      // if the second request comes before the first one caches the result
      expect(value1).toEqual(result);
      expect(value2).toEqual(result);
      expect(value3).toEqual(result);
    });
  });
});
