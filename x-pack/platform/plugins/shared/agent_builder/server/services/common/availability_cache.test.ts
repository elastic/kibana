/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AvailabilityConfig,
  AvailabilityContext,
  AvailabilityResult,
} from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { AvailabilityCache } from './availability_cache';

describe('AvailabilityCache', () => {
  const available: AvailabilityResult = { status: 'available' };
  const unavailable: AvailabilityResult = { status: 'unavailable', reason: 'missing privilege' };

  let handler: jest.Mock<Promise<AvailabilityResult>, [AvailabilityContext]>;
  let principalKeys: Map<KibanaRequest, string>;
  let cache: AvailabilityCache;

  const createContext = ({
    principalKey,
    spaceId = 'default',
  }: {
    principalKey?: string;
    spaceId?: string;
  } = {}): AvailabilityContext => {
    const request = httpServerMock.createKibanaRequest();
    if (principalKey) {
      principalKeys.set(request, principalKey);
    }
    return { request, uiSettings: uiSettingsServiceMock.createClient(), spaceId };
  };

  const createConfig = (overrides: Partial<AvailabilityConfig> = {}): AvailabilityConfig => ({
    handler,
    cacheMode: 'space-user',
    ...overrides,
  });

  beforeEach(() => {
    handler = jest.fn().mockResolvedValue(available);
    principalKeys = new Map();
    cache = new AvailabilityCache({
      getPrincipalKey: (request) => principalKeys.get(request),
    });
  });

  describe('space-user cache mode', () => {
    it('reuses the result for the same principal across requests', async () => {
      const config = createConfig();

      await cache.getOrCompute('tool-1', config, createContext({ principalKey: 'user:jane' }));
      const result = await cache.getOrCompute(
        'tool-1',
        config,
        createContext({ principalKey: 'user:jane' })
      );

      expect(result).toEqual(available);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('never serves the result of one principal to another', async () => {
      handler.mockResolvedValueOnce(available).mockResolvedValueOnce(unavailable);
      const config = createConfig();
      const janeContext = createContext({ principalKey: 'user:jane' });
      const johnContext = createContext({ principalKey: 'user:john' });

      const janeResult = await cache.getOrCompute('tool-1', config, janeContext);
      const johnResult = await cache.getOrCompute('tool-1', config, johnContext);

      expect(janeResult).toEqual(available);
      expect(johnResult).toEqual(unavailable);
      expect(handler).toHaveBeenCalledTimes(2);

      expect(await cache.getOrCompute('tool-1', config, janeContext)).toEqual(available);
      expect(await cache.getOrCompute('tool-1', config, johnContext)).toEqual(unavailable);
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('caches the result of a principal per space', async () => {
      const config = createConfig();

      await cache.getOrCompute(
        'tool-1',
        config,
        createContext({ principalKey: 'user:jane', spaceId: 'space-1' })
      );
      await cache.getOrCompute(
        'tool-1',
        config,
        createContext({ principalKey: 'user:jane', spaceId: 'space-2' })
      );

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('caches the result of a principal per resource', async () => {
      const config = createConfig();
      const context = createContext({ principalKey: 'user:jane' });

      await cache.getOrCompute('tool-1', config, context);
      await cache.getOrCompute('tool-2', config, context);

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('does not cache when the principal cannot be identified', async () => {
      const config = createConfig();
      const context = createContext();

      await cache.getOrCompute('tool-1', config, context);
      await cache.getOrCompute('tool-1', config, context);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(cache.has('tool-1', config, context)).toBe(false);
    });

    it('does not cache when the cache has no principal key resolver', async () => {
      const cacheWithoutResolver = new AvailabilityCache();
      const config = createConfig();
      const context = createContext({ principalKey: 'user:jane' });

      await cacheWithoutResolver.getOrCompute('tool-1', config, context);
      await cacheWithoutResolver.getOrCompute('tool-1', config, context);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(cacheWithoutResolver.has('tool-1', config, context)).toBe(false);
    });

    it('honours the configured TTL', async () => {
      const config = createConfig({ cacheTtl: 1 });
      const context = createContext({ principalKey: 'user:jane' });

      await cache.getOrCompute('tool-1', config, context);
      await cache.getOrCompute('tool-1', config, context);
      expect(handler).toHaveBeenCalledTimes(1);

      await new Promise((resolve) => setTimeout(resolve, 1100));

      await cache.getOrCompute('tool-1', config, context);
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('has', () => {
    it('reports results cached per principal', async () => {
      const config = createConfig();
      const janeContext = createContext({ principalKey: 'user:jane' });

      expect(cache.has('tool-1', config, janeContext)).toBe(false);

      await cache.getOrCompute('tool-1', config, janeContext);

      expect(cache.has('tool-1', config, janeContext)).toBe(true);
      expect(cache.has('tool-1', config, createContext({ principalKey: 'user:john' }))).toBe(false);
    });
  });

  describe('clear', () => {
    it('clears results of every cache mode', async () => {
      const spaceUserConfig = createConfig();
      const spaceConfig = createConfig({ cacheMode: 'space' });
      const globalConfig = createConfig({ cacheMode: 'global' });
      const context = createContext({ principalKey: 'user:jane' });

      await cache.getOrCompute('tool-1', spaceUserConfig, context);
      await cache.getOrCompute('tool-2', spaceConfig, context);
      await cache.getOrCompute('tool-3', globalConfig, context);

      cache.clear();

      expect(cache.has('tool-1', spaceUserConfig, context)).toBe(false);
      expect(cache.has('tool-2', spaceConfig, context)).toBe(false);
      expect(cache.has('tool-3', globalConfig, context)).toBe(false);
    });
  });

  describe('isolation between cache modes', () => {
    it('keeps shared results when results cached per principal are evicted', async () => {
      const spaceConfig = createConfig({ cacheMode: 'space' });
      const spaceUserConfig = createConfig();
      const sharedContext = createContext();

      await cache.getOrCompute('shared-tool', spaceConfig, sharedContext);

      // More principals than the per-principal store can hold.
      const context = createContext();
      for (let index = 0; index < 10_050; index++) {
        principalKeys.set(context.request, `user:${index}`);
        await cache.getOrCompute('user-tool', spaceUserConfig, context);
      }

      expect(cache.has('shared-tool', spaceConfig, sharedContext)).toBe(true);

      principalKeys.set(context.request, 'user:0');
      expect(cache.has('user-tool', spaceUserConfig, context)).toBe(false);
      principalKeys.set(context.request, 'user:10049');
      expect(cache.has('user-tool', spaceUserConfig, context)).toBe(true);
    });

    it('does not mix up a principal key with a space id', async () => {
      const spaceConfig = createConfig({ cacheMode: 'space' });
      const spaceUserConfig = createConfig();

      await cache.getOrCompute('tool-1', spaceConfig, createContext({ spaceId: 'default||jane' }));

      expect(
        cache.has(
          'tool-1',
          spaceUserConfig,
          createContext({ principalKey: 'jane', spaceId: 'default' })
        )
      ).toBe(false);
    });
  });
});
