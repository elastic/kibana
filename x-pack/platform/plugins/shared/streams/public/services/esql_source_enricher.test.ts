/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import type { ESQLSourceResult } from '@kbn/esql-types';
import { SOURCES_TYPES } from '@kbn/esql-types';
import type { StreamSummary } from '../../common';
import type { StreamsRepositoryClient } from '../api';
import { createStreamsSourceEnricher, STREAMS_CACHE_TTL_MS } from './esql_source_enricher';

const makeSource = (name: string, extra: Partial<ESQLSourceResult> = {}): ESQLSourceResult => ({
  name,
  hidden: false,
  ...extra,
});

const makeRepositoryClient = (summaries: StreamSummary[]): jest.Mocked<StreamsRepositoryClient> =>
  ({
    fetch: jest.fn().mockResolvedValue({ summaries }),
  } as unknown as jest.Mocked<StreamsRepositoryClient>);

const makeApplication = (
  getUrlForApp = jest
    .fn()
    .mockImplementation((_appId: string, { path }: { path: string }) => `http://localhost${path}`)
): Promise<Pick<ApplicationStart, 'getUrlForApp'>> => Promise.resolve({ getUrlForApp });

describe('createStreamsSourceEnricher', () => {
  it('returns sources unchanged when none match a stream', async () => {
    const enricher = createStreamsSourceEnricher(
      makeRepositoryClient([{ name: 'logs', type: 'wired', description: 'All logs' }]),
      makeApplication()
    );
    const sources = [makeSource('unrelated-index')];

    const result = await enricher(sources);

    expect(result).toEqual(sources);
  });

  it('enriches a source matching a wired stream with type, description, and link', async () => {
    const enricher = createStreamsSourceEnricher(
      makeRepositoryClient([{ name: 'logs', type: 'wired', description: 'All logs' }]),
      makeApplication()
    );
    const sources = [makeSource('logs')];

    const [result] = await enricher(sources);

    expect(result.type).toBe(SOURCES_TYPES.WIRED_STREAM);
    expect(result.description).toBe('All logs');
    expect(result.links).toHaveLength(1);
    expect(result.links![0].url).toBe('http://localhost/logs/management/overview');
    expect(result.links![0].label).toContain('logs');
  });

  it('enriches a source matching a classic stream with type, description, and link', async () => {
    const enricher = createStreamsSourceEnricher(
      makeRepositoryClient([
        { name: 'classic-logs', type: 'classic', description: 'Classic log stream' },
      ]),
      makeApplication()
    );
    const sources = [makeSource('classic-logs')];

    const [result] = await enricher(sources);

    expect(result.type).toBe(SOURCES_TYPES.CLASSIC_STREAM);
    expect(result.description).toBe('Classic log stream');
    expect(result.links).toHaveLength(1);
    expect(result.links![0].url).toBe('http://localhost/classic-logs/management/overview');
  });

  it('sets description to undefined when the stream has an empty description', async () => {
    const enricher = createStreamsSourceEnricher(
      makeRepositoryClient([{ name: 'no-desc-stream', type: 'wired', description: '' }]),
      makeApplication()
    );
    const sources = [makeSource('no-desc-stream')];

    const [result] = await enricher(sources);

    expect(result.description).toBeUndefined();
  });

  it('enriches only matching sources in a mixed list', async () => {
    const enricher = createStreamsSourceEnricher(
      makeRepositoryClient([
        { name: 'logs', type: 'wired', description: 'All logs' },
        { name: 'classic-logs', type: 'classic', description: 'Classic' },
      ]),
      makeApplication()
    );
    const sources = [makeSource('logs'), makeSource('other-index'), makeSource('classic-logs')];

    const result = await enricher(sources);

    expect(result[0].type).toBe(SOURCES_TYPES.WIRED_STREAM);
    expect(result[1]).toEqual(makeSource('other-index'));
    expect(result[2].type).toBe(SOURCES_TYPES.CLASSIC_STREAM);
  });

  it('preserves existing source fields when enriching', async () => {
    const enricher = createStreamsSourceEnricher(
      makeRepositoryClient([{ name: 'logs', type: 'wired', description: 'All logs' }]),
      makeApplication()
    );
    const source = makeSource('logs', { hidden: true, title: 'Logs title' });

    const [result] = await enricher([source]);

    expect(result.hidden).toBe(true);
    expect(result.title).toBe('Logs title');
    expect(result.name).toBe('logs');
  });

  it('returns sources unchanged when the streams API call fails (graceful degradation)', async () => {
    const failingClient = {
      fetch: jest.fn().mockRejectedValue(new Error('Network error')),
    } as unknown as jest.Mocked<StreamsRepositoryClient>;
    const enricher = createStreamsSourceEnricher(failingClient, makeApplication());
    const sources = [makeSource('logs'), makeSource('other-index')];

    const result = await enricher(sources);

    expect(result).toEqual(sources);
  });

  it('returns sources unchanged when streams list is empty', async () => {
    const enricher = createStreamsSourceEnricher(makeRepositoryClient([]), makeApplication());
    const sources = [makeSource('logs'), makeSource('metrics')];

    const result = await enricher(sources);

    expect(result).toEqual(sources);
  });

  it('returns an empty array when sources is empty', async () => {
    const enricher = createStreamsSourceEnricher(
      makeRepositoryClient([{ name: 'logs', type: 'wired', description: 'All logs' }]),
      makeApplication()
    );

    const result = await enricher([]);

    expect(result).toEqual([]);
  });

  it('does not call the API when sources is empty', async () => {
    const client = makeRepositoryClient([]);
    const enricher = createStreamsSourceEnricher(client, makeApplication());

    await enricher([]);

    expect(client.fetch).not.toHaveBeenCalled();
  });

  it('only fetches names that are not yet cached', async () => {
    const client = makeRepositoryClient([
      { name: 'logs', type: 'wired', description: 'All logs' },
      { name: 'metrics', type: 'classic', description: 'Metrics' },
    ]);
    const enricher = createStreamsSourceEnricher(client, makeApplication());

    // First call: both are cache misses
    await enricher([makeSource('logs'), makeSource('metrics')]);
    expect(client.fetch).toHaveBeenCalledTimes(1);
    expect(client.fetch).toHaveBeenCalledWith(
      'POST /internal/streams/_bulk_get_summaries',
      expect.objectContaining({
        params: { body: { names: expect.arrayContaining(['logs', 'metrics']) } },
      })
    );

    client.fetch.mockClear();

    // Second call: both are cache hits — no fetch
    await enricher([makeSource('logs'), makeSource('metrics')]);
    expect(client.fetch).not.toHaveBeenCalled();
  });

  it('only fetches new names when some are cached and some are not', async () => {
    const client = makeRepositoryClient([{ name: 'logs', type: 'wired', description: 'All logs' }]);
    const enricher = createStreamsSourceEnricher(client, makeApplication());

    // Prime the cache with 'logs'
    await enricher([makeSource('logs')]);
    client.fetch.mockClear();

    // Second call adds a new source 'metrics'
    client.fetch.mockResolvedValue({
      streams: [{ name: 'metrics', type: 'classic', description: 'Metrics' }],
    });
    await enricher([makeSource('logs'), makeSource('metrics')]);

    expect(client.fetch).toHaveBeenCalledTimes(1);
    expect(client.fetch).toHaveBeenCalledWith(
      'POST /internal/streams/_bulk_get_summaries',
      expect.objectContaining({ params: { body: { names: ['metrics'] } } })
    );
  });

  describe('caching', () => {
    const makeFakePerf = () => {
      // Start at 1 rather than 0: LRUCache uses !!starts[index] to detect whether a TTL
      // start was recorded, so a start value of 0 would cause entries to never be
      // considered stale. In practice performance.now() always returns a value > 0.
      let now = 1;
      return { now: () => now, tick: (ms: number) => (now += ms) };
    };

    it('calls the streams API only once across multiple enricher invocations within the TTL', async () => {
      const client = makeRepositoryClient([{ name: 'logs', type: 'wired', description: '' }]);
      const enricher = createStreamsSourceEnricher(client, makeApplication(), makeFakePerf());

      await enricher([makeSource('logs')]);
      await enricher([makeSource('logs')]);

      expect(client.fetch).toHaveBeenCalledTimes(1);
    });

    it('re-fetches streams from the API after the cache TTL expires', async () => {
      const client = makeRepositoryClient([{ name: 'logs', type: 'wired', description: '' }]);
      const perf = makeFakePerf();
      const enricher = createStreamsSourceEnricher(client, makeApplication(), perf);

      await enricher([makeSource('logs')]);

      perf.tick(STREAMS_CACHE_TTL_MS + 1);

      await enricher([makeSource('logs')]);

      expect(client.fetch).toHaveBeenCalledTimes(2);
    });

    it('reflects updated stream data after the cache TTL expires', async () => {
      const client = makeRepositoryClient([
        { name: 'logs', type: 'wired', description: 'All logs' },
      ]);
      const perf = makeFakePerf();
      const enricher = createStreamsSourceEnricher(client, makeApplication(), perf);

      const [firstResult] = await enricher([makeSource('logs')]);
      expect(firstResult.description).toBe('All logs');

      client.fetch.mockResolvedValue({
        summaries: [{ name: 'logs', type: 'wired', description: 'Updated description' }],
      });

      perf.tick(STREAMS_CACHE_TTL_MS + 1);

      const [secondResult] = await enricher([makeSource('logs')]);
      expect(secondResult.description).toBe('Updated description');
      expect(client.fetch).toHaveBeenCalledTimes(2);
    });

    it('caches absent names so unmanaged indices do not trigger repeated API calls', async () => {
      const client = makeRepositoryClient([]);
      const enricher = createStreamsSourceEnricher(client, makeApplication());
      const sources = [makeSource('unmanaged-index')];

      const first = await enricher(sources);
      const second = await enricher(sources);

      // Both calls should leave the source unchanged.
      expect(first).toEqual(sources);
      expect(second).toEqual(sources);
      // The API should only have been hit once — the second call is a cache hit.
      expect(client.fetch).toHaveBeenCalledTimes(1);
    });

    it('re-fetches absent names after the cache TTL expires', async () => {
      const client = makeRepositoryClient([]);
      const perf = makeFakePerf();
      const enricher = createStreamsSourceEnricher(client, makeApplication(), perf);
      const sources = [makeSource('unmanaged-index')];

      await enricher(sources);

      perf.tick(STREAMS_CACHE_TTL_MS + 1);

      await enricher(sources);

      expect(client.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('concurrent requests', () => {
    it('deduplicates concurrent requests for the same sources', async () => {
      const client = makeRepositoryClient([{ name: 'logs', type: 'wired', description: '' }]);
      const enricher = createStreamsSourceEnricher(client, makeApplication());

      const [result1, result2] = await Promise.all([
        enricher([makeSource('logs')]),
        enricher([makeSource('logs')]),
      ]);

      expect(client.fetch).toHaveBeenCalledTimes(1);
      expect(result1[0].type).toBe(SOURCES_TYPES.WIRED_STREAM);
      expect(result2[0].type).toBe(SOURCES_TYPES.WIRED_STREAM);
    });

    it('batches cache misses from concurrent calls into a single API request', async () => {
      const client = makeRepositoryClient([
        { name: 'logs', type: 'wired', description: '' },
        { name: 'metrics', type: 'classic', description: '' },
        { name: 'traces', type: 'wired', description: '' },
      ]);
      const enricher = createStreamsSourceEnricher(client, makeApplication());

      await Promise.all([
        enricher([makeSource('logs'), makeSource('metrics')]),
        enricher([makeSource('metrics'), makeSource('traces')]),
      ]);

      expect(client.fetch).toHaveBeenCalledTimes(1);
      expect(client.fetch).toHaveBeenCalledWith(
        'POST /internal/streams/_bulk_get_summaries',
        expect.objectContaining({
          params: { body: { names: expect.arrayContaining(['logs', 'metrics', 'traces']) } },
        })
      );
    });

    it('handles overlapping source sets across separate async calls correctly', async () => {
      const client = {
        fetch: jest
          .fn()
          .mockResolvedValueOnce({
            summaries: [
              { name: 'logs', type: 'wired', description: '' },
              { name: 'metrics', type: 'classic', description: '' },
            ],
          })
          .mockResolvedValueOnce({
            summaries: [{ name: 'traces', type: 'wired', description: '' }],
          }),
      } as unknown as jest.Mocked<StreamsRepositoryClient>;
      const enricher = createStreamsSourceEnricher(client, makeApplication());

      const promise1 = enricher([makeSource('logs'), makeSource('metrics')]);

      // Yield to the microtask queue so the first enricher call's API request
      // goes in-flight before the second enricher call starts.
      await Promise.resolve();

      // Second call overlaps: 'metrics' is already in-flight (deduplicated),
      // 'traces' is new and triggers a separate API request.
      const promise2 = enricher([makeSource('metrics'), makeSource('traces')]);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // 'metrics' is shared across calls but fetched only once; 'traces' requires
      // its own API call because it wasn't part of the first request.
      expect(client.fetch).toHaveBeenCalledTimes(2);
      expect(client.fetch).toHaveBeenNthCalledWith(
        1,
        'POST /internal/streams/_bulk_get_summaries',
        expect.objectContaining({
          params: { body: { names: expect.arrayContaining(['logs', 'metrics']) } },
        })
      );
      expect(client.fetch).toHaveBeenNthCalledWith(
        2,
        'POST /internal/streams/_bulk_get_summaries',
        expect.objectContaining({ params: { body: { names: ['traces'] } } })
      );

      expect(result1[0].type).toBe(SOURCES_TYPES.WIRED_STREAM); // logs
      expect(result1[1].type).toBe(SOURCES_TYPES.CLASSIC_STREAM); // metrics
      expect(result2[0].type).toBe(SOURCES_TYPES.CLASSIC_STREAM); // metrics (deduplicated)
      expect(result2[1].type).toBe(SOURCES_TYPES.WIRED_STREAM); // traces
    });
  });
});
