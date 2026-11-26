/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TemplateBody, TemplatesCatalog } from '@kbn/workflows-library';

import { LibraryFetchError } from './errors';
import { LibraryCache, type LibraryFailureListener } from './library_cache';

const TTL_MS = 60_000;

const catalogA: TemplatesCatalog = {
  version: 'v1',
  kibanaVersion: '9.5.0',
  generatedAt: '2026-06-01T00:00:00Z',
  templates: [
    {
      slug: 'demo',
      version: '1.0.0',
      availability: '>=9.5.0',
      name: 'Demo',
      description: 'A demo template',
      categories: ['utility'],
      definitionUrl: 'templates/demo/1.0.0.yaml',
      contentHash: `sha256:${'0'.repeat(64)}`,
      stepTypes: [],
      triggerTypes: [],
    },
  ],
};

const body: TemplateBody = {
  metadata: {
    slug: 'demo',
    version: '1.0.0',
    availability: '>=9.5.0',
    name: 'Demo',
    description: 'A demo template',
    categories: ['utility'],
  },
  body: {},
  raw: '...',
};

describe('LibraryCache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-01T12:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts empty: no catalog, not fresh, no health timestamps', () => {
    const cache = new LibraryCache(TTL_MS);

    expect(cache.catalog).toBeUndefined();
    expect(cache.versionId).toBeUndefined();
    expect(cache.isFresh()).toBe(false);
    expect(cache.getHealth()).toEqual({ sourceMode: 'http', lastRefreshAt: null });
  });

  it('treats the catalog as fresh within TTL after a successful refresh', () => {
    const cache = new LibraryCache(TTL_MS);
    cache.setCatalog(catalogA);
    cache.markRefreshSuccess();

    jest.advanceTimersByTime(TTL_MS - 1);
    expect(cache.isFresh()).toBe(true);
  });

  it('treats the catalog as stale once TTL elapses', () => {
    const cache = new LibraryCache(TTL_MS);
    cache.setCatalog(catalogA);
    cache.markRefreshSuccess();

    jest.advanceTimersByTime(TTL_MS + 1);
    expect(cache.isFresh()).toBe(false);
  });

  it('reports not-fresh when a catalog has been set but no refresh recorded', () => {
    const cache = new LibraryCache(TTL_MS);
    cache.setCatalog(catalogA);
    // No markRefreshSuccess — should still be considered stale.
    expect(cache.isFresh()).toBe(false);
  });

  it('drops the body cache when a fresh catalog arrives', () => {
    const cache = new LibraryCache(TTL_MS);
    cache.setCatalog(catalogA);
    cache.setBody('demo', body);
    expect(cache.getBody('demo')).toBe(body);

    cache.setCatalog(catalogA);
    expect(cache.getBody('demo')).toBeUndefined();
  });

  it('records and surfaces refresh failures via getHealth without clearing the catalog', () => {
    const cache = new LibraryCache(TTL_MS);
    cache.setCatalog(catalogA);
    cache.markRefreshSuccess();

    cache.markRefreshFailure(new Error('upstream blew up'));

    expect(cache.catalog).toBe(catalogA);
    expect(cache.getHealth()).toEqual({
      sourceMode: 'http',
      lastRefreshAt: expect.any(String),
      lastError: { message: 'upstream blew up', at: expect.any(String) },
    });
  });

  it('clears the last error on the next successful refresh', () => {
    const cache = new LibraryCache(TTL_MS);
    cache.markRefreshFailure(new Error('boom'));
    expect(cache.getHealth().lastError).toBeDefined();

    cache.markRefreshSuccess();
    expect(cache.getHealth().lastError).toBeUndefined();
  });

  it('emits ISO-8601 strings on getHealth', () => {
    const cache = new LibraryCache(TTL_MS);
    cache.markRefreshSuccess();
    cache.markRefreshFailure(new Error('x'));

    const health = cache.getHealth();
    expect(health.lastRefreshAt).toBe('2026-06-01T12:00:00.000Z');
    expect(health.lastError?.at).toBe('2026-06-01T12:00:00.000Z');
  });

  describe('failure listener', () => {
    const fetchError = () => new LibraryFetchError('upstream down', 'timeout', 'https://x');
    const withSlugs = (...slugs: string[]): TemplatesCatalog => ({
      ...catalogA,
      templates: slugs.map((slug) => ({ ...catalogA.templates[0], slug })),
    });
    /** A cache whose catalog lists `alpha` and `beta`. */
    const buildCache = (onFailure: LibraryFailureListener) => {
      const cache = new LibraryCache(TTL_MS, 'http', onFailure);
      cache.setCatalog(withSlugs('alpha', 'beta'));
      return cache;
    };

    it('hears only the first catalog failure until a refresh succeeds again', () => {
      const onFailure = jest.fn();
      const cache = new LibraryCache(TTL_MS, 'bundle', onFailure);

      cache.markRefreshFailure(fetchError());
      cache.markRefreshFailure(fetchError());
      expect(onFailure).toHaveBeenCalledTimes(1);
      expect(onFailure).toHaveBeenCalledWith({ operation: 'catalog', reason: 'timeout' });

      cache.markRefreshSuccess();
      cache.markRefreshFailure(fetchError());
      expect(onFailure).toHaveBeenCalledTimes(2);
    });

    it('hears only the first failure of a template until it loads again', () => {
      const onFailure = jest.fn();
      const cache = buildCache(onFailure);

      cache.markTemplateLoadFailure('alpha', fetchError());
      cache.markTemplateLoadFailure('alpha', fetchError());
      expect(onFailure).toHaveBeenCalledTimes(1);
      expect(onFailure).toHaveBeenCalledWith({
        operation: 'template',
        reason: 'timeout',
        templateSlug: 'alpha',
      });

      cache.markTemplateLoadSuccess('alpha');
      cache.markTemplateLoadFailure('alpha', fetchError());
      expect(onFailure).toHaveBeenCalledTimes(2);
    });

    it('tracks each template separately, so another template loading does not re-report a broken one', () => {
      const onFailure = jest.fn();
      const cache = buildCache(onFailure);

      cache.markTemplateLoadFailure('alpha', fetchError());
      cache.markTemplateLoadSuccess('beta');
      cache.markTemplateLoadFailure('alpha', fetchError());
      cache.markTemplateLoadFailure('beta', fetchError());

      expect(onFailure.mock.calls.map(([failure]) => failure.templateSlug)).toEqual([
        'alpha',
        'beta',
      ]);
    });

    it('stops tracking a failing template once a new catalog no longer lists it', () => {
      const onFailure = jest.fn();
      const cache = buildCache(onFailure);
      cache.markTemplateLoadFailure('alpha', fetchError());
      cache.markTemplateLoadFailure('beta', fetchError());

      // `alpha` is dropped from the catalog and later comes back; `beta` stays listed.
      cache.setCatalog(withSlugs('beta'));
      cache.setCatalog(withSlugs('alpha', 'beta'));
      cache.markTemplateLoadFailure('alpha', fetchError());
      cache.markTemplateLoadFailure('beta', fetchError());

      expect(onFailure.mock.calls.map(([failure]) => failure.templateSlug)).toEqual([
        'alpha',
        'beta',
        'alpha',
      ]);
    });

    it('ignores a failed load that started before a refresh removed the template', () => {
      const onFailure = jest.fn();
      const cache = buildCache(onFailure);
      cache.markTemplateLoadFailure('alpha', fetchError());

      // A refresh drops `alpha` while a load of it is in flight, and that load then fails.
      cache.setCatalog(withSlugs('beta'));
      cache.markTemplateLoadFailure('alpha', fetchError());
      expect(onFailure).toHaveBeenCalledTimes(1);

      // Once listed again, its next failure is the first since it came back.
      cache.setCatalog(withSlugs('alpha', 'beta'));
      cache.markTemplateLoadFailure('alpha', fetchError());
      expect(onFailure).toHaveBeenCalledTimes(2);
    });

    it('tracks the catalog and template bodies separately', () => {
      const onFailure = jest.fn();
      const cache = buildCache(onFailure);

      cache.markRefreshFailure(fetchError());
      cache.markTemplateLoadFailure('alpha', fetchError());

      expect(onFailure.mock.calls.map(([failure]) => failure.operation)).toEqual([
        'catalog',
        'template',
      ]);
    });

    it('reports an error that is not a fetch error as unknown', () => {
      const onFailure = jest.fn();
      const cache = new LibraryCache(TTL_MS, 'http', onFailure);

      cache.markRefreshFailure(new Error('bug'));

      expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({ reason: 'unknown' }));
    });

    it('still records the failure when the listener throws', () => {
      const cache = buildCache(() => {
        throw new Error('listener bug');
      });

      expect(() => cache.markRefreshFailure(fetchError())).not.toThrow();
      expect(() => cache.markTemplateLoadFailure('alpha', fetchError())).not.toThrow();
      expect(cache.getHealth().lastError).toEqual(
        expect.objectContaining({ message: 'upstream down' })
      );
    });
  });
});
