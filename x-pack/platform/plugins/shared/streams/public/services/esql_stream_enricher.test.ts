/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import type { ESQLSourceResult, EsqlView } from '@kbn/esql-types';
import { SOURCES_TYPES } from '@kbn/esql-types';
import type { StreamSummary } from '../../common';
import type { StreamsRepositoryClient } from '../api';
import { createStreamsEnrichment, STREAMS_CACHE_TTL_MS } from './esql_stream_enricher';

const makeSource = (name: string, extra: Partial<ESQLSourceResult> = {}): ESQLSourceResult => ({
  name,
  hidden: false,
  ...extra,
});

const makeView = (name: string, extra: Partial<EsqlView> = {}): EsqlView => ({
  name,
  query: `FROM ${name}`,
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

describe('createStreamsEnrichment', () => {
  describe('enrichSources', () => {
    it('returns sources unchanged when none match a stream', async () => {
      const { enrichSources } = createStreamsEnrichment(
        makeRepositoryClient([{ name: 'logs', type: 'wired', description: 'All logs' }]),
        makeApplication()
      );
      const sources = [makeSource('unrelated-index')];

      const result = await enrichSources(sources);

      expect(result).toEqual(sources);
    });

    it('enriches a source matching a wired stream with type, description, and link', async () => {
      const { enrichSources } = createStreamsEnrichment(
        makeRepositoryClient([{ name: 'logs', type: 'wired', description: 'All logs' }]),
        makeApplication()
      );
      const sources = [makeSource('logs')];

      const [result] = await enrichSources(sources);

      expect(result.type).toBe(SOURCES_TYPES.WIRED_STREAM);
      expect(result.description).toBe('All logs');
      expect(result.links).toHaveLength(1);
      expect(result.links![0].url).toBe('http://localhost/logs/management/overview');
      expect(result.links![0].label).toContain('logs');
    });

    it('enriches a source matching a classic stream with type, description, and link', async () => {
      const { enrichSources } = createStreamsEnrichment(
        makeRepositoryClient([
          { name: 'classic-logs', type: 'classic', description: 'Classic log stream' },
        ]),
        makeApplication()
      );
      const sources = [makeSource('classic-logs')];

      const [result] = await enrichSources(sources);

      expect(result.type).toBe(SOURCES_TYPES.CLASSIC_STREAM);
      expect(result.description).toBe('Classic log stream');
      expect(result.links).toHaveLength(1);
      expect(result.links![0].url).toBe('http://localhost/classic-logs/management/overview');
    });

    it('sets description to undefined when the stream has an empty description', async () => {
      const { enrichSources } = createStreamsEnrichment(
        makeRepositoryClient([{ name: 'no-desc-stream', type: 'wired', description: '' }]),
        makeApplication()
      );
      const sources = [makeSource('no-desc-stream')];

      const [result] = await enrichSources(sources);

      expect(result.description).toBeUndefined();
    });

    it('enriches only matching sources in a mixed list', async () => {
      const { enrichSources } = createStreamsEnrichment(
        makeRepositoryClient([
          { name: 'logs', type: 'wired', description: 'All logs' },
          { name: 'classic-logs', type: 'classic', description: 'Classic' },
        ]),
        makeApplication()
      );
      const sources = [makeSource('logs'), makeSource('other-index'), makeSource('classic-logs')];

      const result = await enrichSources(sources);

      expect(result[0].type).toBe(SOURCES_TYPES.WIRED_STREAM);
      expect(result[1]).toEqual(makeSource('other-index'));
      expect(result[2].type).toBe(SOURCES_TYPES.CLASSIC_STREAM);
    });

    it('preserves existing source fields when enriching', async () => {
      const { enrichSources } = createStreamsEnrichment(
        makeRepositoryClient([{ name: 'logs', type: 'wired', description: 'All logs' }]),
        makeApplication()
      );
      const source = makeSource('logs', { hidden: true, title: 'Logs title' });

      const [result] = await enrichSources([source]);

      expect(result.hidden).toBe(true);
      expect(result.title).toBe('Logs title');
      expect(result.name).toBe('logs');
    });

    it('returns sources unchanged when the streams API call fails (graceful degradation)', async () => {
      const failingClient = {
        fetch: jest.fn().mockRejectedValue(new Error('Network error')),
      } as unknown as jest.Mocked<StreamsRepositoryClient>;
      const { enrichSources } = createStreamsEnrichment(failingClient, makeApplication());
      const sources = [makeSource('logs'), makeSource('other-index')];

      const result = await enrichSources(sources);

      expect(result).toEqual(sources);
    });

    it('returns sources unchanged when streams list is empty', async () => {
      const { enrichSources } = createStreamsEnrichment(
        makeRepositoryClient([]),
        makeApplication()
      );
      const sources = [makeSource('logs'), makeSource('metrics')];

      const result = await enrichSources(sources);

      expect(result).toEqual(sources);
    });

    it('returns an empty array when sources is empty', async () => {
      const { enrichSources } = createStreamsEnrichment(
        makeRepositoryClient([{ name: 'logs', type: 'wired', description: 'All logs' }]),
        makeApplication()
      );

      const result = await enrichSources([]);

      expect(result).toEqual([]);
    });

    it('does not call the API when sources is empty', async () => {
      const client = makeRepositoryClient([]);
      const { enrichSources } = createStreamsEnrichment(client, makeApplication());

      await enrichSources([]);

      expect(client.fetch).not.toHaveBeenCalled();
    });

    it('only fetches names that are not yet cached', async () => {
      const client = makeRepositoryClient([
        { name: 'logs', type: 'wired', description: 'All logs' },
        { name: 'metrics', type: 'classic', description: 'Metrics' },
      ]);
      const { enrichSources } = createStreamsEnrichment(client, makeApplication());

      // First call: both are cache misses
      await enrichSources([makeSource('logs'), makeSource('metrics')]);
      expect(client.fetch).toHaveBeenCalledTimes(1);
      expect(client.fetch).toHaveBeenCalledWith(
        'POST /internal/streams/_bulk_get_summaries',
        expect.objectContaining({
          params: { body: { names: expect.arrayContaining(['logs', 'metrics']) } },
        })
      );

      client.fetch.mockClear();

      // Second call: both are cache hits — no fetch
      await enrichSources([makeSource('logs'), makeSource('metrics')]);
      expect(client.fetch).not.toHaveBeenCalled();
    });

    it('only fetches new names when some are cached and some are not', async () => {
      const client = makeRepositoryClient([
        { name: 'logs', type: 'wired', description: 'All logs' },
      ]);
      const { enrichSources } = createStreamsEnrichment(client, makeApplication());

      // Prime the cache with 'logs'
      await enrichSources([makeSource('logs')]);
      client.fetch.mockClear();

      // Second call adds a new source 'metrics'
      client.fetch.mockResolvedValue({
        summaries: [{ name: 'metrics', type: 'classic', description: 'Metrics' }],
      });
      await enrichSources([makeSource('logs'), makeSource('metrics')]);

      expect(client.fetch).toHaveBeenCalledTimes(1);
      expect(client.fetch).toHaveBeenCalledWith(
        'POST /internal/streams/_bulk_get_summaries',
        expect.objectContaining({ params: { body: { names: ['metrics'] } } })
      );
    });
  });

  describe('enrichViews', () => {
    it('returns views unchanged when none match a stream', async () => {
      const { enrichViews } = createStreamsEnrichment(
        makeRepositoryClient([{ name: 'logs', type: 'wired', description: 'All logs' }]),
        makeApplication()
      );
      const views = [makeView('unrelated-view')];

      const result = await enrichViews(views);

      expect(result).toEqual(views);
    });

    it('enriches a view matching a query stream with type, description, and link', async () => {
      const { enrichViews } = createStreamsEnrichment(
        makeRepositoryClient([{ name: 'my-query', type: 'query', description: 'A query stream' }]),
        makeApplication()
      );
      const views = [makeView('my-query')];

      const [result] = await enrichViews(views);

      expect(result.type).toBe(SOURCES_TYPES.QUERY_STREAM);
      expect(result.description).toBe('A query stream');
      expect(result.links).toHaveLength(1);
      expect(result.links![0].url).toBe('http://localhost/my-query/management/overview');
      expect(result.links![0].label).toContain('my-query');
    });

    it('strips $. prefix from view names for cache lookup', async () => {
      const client = makeRepositoryClient([
        { name: 'my-stream', type: 'query', description: 'Query stream' },
      ]);
      const { enrichViews } = createStreamsEnrichment(client, makeApplication());
      const views = [makeView('$.my-stream')];

      const [result] = await enrichViews(views);

      expect(result.type).toBe(SOURCES_TYPES.QUERY_STREAM);
      expect(result.description).toBe('Query stream');
      // The API should have been called with the stripped name
      expect(client.fetch).toHaveBeenCalledWith(
        'POST /internal/streams/_bulk_get_summaries',
        expect.objectContaining({
          params: { body: { names: ['my-stream'] } },
        })
      );
    });

    it('preserves the original view name (with $. prefix) in the result', async () => {
      const { enrichViews } = createStreamsEnrichment(
        makeRepositoryClient([{ name: 'my-stream', type: 'query', description: 'Query stream' }]),
        makeApplication()
      );
      const views = [makeView('$.my-stream')];

      const [result] = await enrichViews(views);

      expect(result.name).toBe('$.my-stream');
    });

    it('preserves existing view fields when enriching', async () => {
      const { enrichViews } = createStreamsEnrichment(
        makeRepositoryClient([{ name: 'my-query', type: 'query', description: 'A query stream' }]),
        makeApplication()
      );
      const view = makeView('my-query', { query: 'FROM logs | WHERE level = "error"' });

      const [result] = await enrichViews([view]);

      expect(result.query).toBe('FROM logs | WHERE level = "error"');
      expect(result.name).toBe('my-query');
      expect(result.type).toBe(SOURCES_TYPES.QUERY_STREAM);
    });

    it('returns views unchanged when the streams API call fails (graceful degradation)', async () => {
      const failingClient = {
        fetch: jest.fn().mockRejectedValue(new Error('Network error')),
      } as unknown as jest.Mocked<StreamsRepositoryClient>;
      const { enrichViews } = createStreamsEnrichment(failingClient, makeApplication());
      const views = [makeView('my-query')];

      const result = await enrichViews(views);

      expect(result).toEqual(views);
    });

    it('returns an empty array when views is empty', async () => {
      const { enrichViews } = createStreamsEnrichment(
        makeRepositoryClient([{ name: 'logs', type: 'query', description: '' }]),
        makeApplication()
      );

      const result = await enrichViews([]);

      expect(result).toEqual([]);
    });

    it('does not call the API when views is empty', async () => {
      const client = makeRepositoryClient([]);
      const { enrichViews } = createStreamsEnrichment(client, makeApplication());

      await enrichViews([]);

      expect(client.fetch).not.toHaveBeenCalled();
    });

    it('sets description to undefined when the stream has an empty description', async () => {
      const { enrichViews } = createStreamsEnrichment(
        makeRepositoryClient([{ name: 'my-query', type: 'query', description: '' }]),
        makeApplication()
      );
      const views = [makeView('my-query')];

      const [result] = await enrichViews(views);

      expect(result.description).toBeUndefined();
    });
  });

  describe('shared cache between sources and views', () => {
    it('shares cache hits between enrichSources and enrichViews', async () => {
      const client = makeRepositoryClient([
        { name: 'my-stream', type: 'query', description: 'Shared stream' },
      ]);
      const { enrichSources, enrichViews } = createStreamsEnrichment(client, makeApplication());

      // Prime cache via enrichSources
      await enrichSources([makeSource('my-stream')]);
      expect(client.fetch).toHaveBeenCalledTimes(1);

      client.fetch.mockClear();

      // enrichViews should hit the cache
      const [result] = await enrichViews([makeView('my-stream')]);
      expect(client.fetch).not.toHaveBeenCalled();
      expect(result.type).toBe(SOURCES_TYPES.QUERY_STREAM);
    });

    it('shares cache hits between enrichViews (with $. prefix) and enrichSources', async () => {
      const client = makeRepositoryClient([
        { name: 'my-stream', type: 'wired', description: 'Wired stream' },
      ]);
      const { enrichSources, enrichViews } = createStreamsEnrichment(client, makeApplication());

      // Prime cache via enrichViews with $. prefix (stripped to 'my-stream')
      await enrichViews([makeView('$.my-stream')]);
      expect(client.fetch).toHaveBeenCalledTimes(1);

      client.fetch.mockClear();

      // enrichSources for 'my-stream' should hit the cache
      const [result] = await enrichSources([makeSource('my-stream')]);
      expect(client.fetch).not.toHaveBeenCalled();
      expect(result.type).toBe(SOURCES_TYPES.WIRED_STREAM);
    });
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
      const { enrichSources } = createStreamsEnrichment(client, makeApplication(), makeFakePerf());

      await enrichSources([makeSource('logs')]);
      await enrichSources([makeSource('logs')]);

      expect(client.fetch).toHaveBeenCalledTimes(1);
    });

    it('re-fetches streams from the API after the cache TTL expires', async () => {
      const client = makeRepositoryClient([{ name: 'logs', type: 'wired', description: '' }]);
      const perf = makeFakePerf();
      const { enrichSources } = createStreamsEnrichment(client, makeApplication(), perf);

      await enrichSources([makeSource('logs')]);

      perf.tick(STREAMS_CACHE_TTL_MS + 1);

      await enrichSources([makeSource('logs')]);

      expect(client.fetch).toHaveBeenCalledTimes(2);
    });

    it('reflects updated stream data after the cache TTL expires', async () => {
      const client = makeRepositoryClient([
        { name: 'logs', type: 'wired', description: 'All logs' },
      ]);
      const perf = makeFakePerf();
      const { enrichSources } = createStreamsEnrichment(client, makeApplication(), perf);

      const [firstResult] = await enrichSources([makeSource('logs')]);
      expect(firstResult.description).toBe('All logs');

      client.fetch.mockResolvedValue({
        summaries: [{ name: 'logs', type: 'wired', description: 'Updated description' }],
      });

      perf.tick(STREAMS_CACHE_TTL_MS + 1);

      const [secondResult] = await enrichSources([makeSource('logs')]);
      expect(secondResult.description).toBe('Updated description');
      expect(client.fetch).toHaveBeenCalledTimes(2);
    });

    it('caches absent names so unmanaged indices do not trigger repeated API calls', async () => {
      const client = makeRepositoryClient([]);
      const { enrichSources } = createStreamsEnrichment(client, makeApplication());
      const sources = [makeSource('unmanaged-index')];

      const first = await enrichSources(sources);
      const second = await enrichSources(sources);

      // Both calls should leave the source unchanged.
      expect(first).toEqual(sources);
      expect(second).toEqual(sources);
      // The API should only have been hit once — the second call is a cache hit.
      expect(client.fetch).toHaveBeenCalledTimes(1);
    });

    it('re-fetches absent names after the cache TTL expires', async () => {
      const client = makeRepositoryClient([]);
      const perf = makeFakePerf();
      const { enrichSources } = createStreamsEnrichment(client, makeApplication(), perf);
      const sources = [makeSource('unmanaged-index')];

      await enrichSources(sources);

      perf.tick(STREAMS_CACHE_TTL_MS + 1);

      await enrichSources(sources);

      expect(client.fetch).toHaveBeenCalledTimes(2);
    });

    it('calls the streams API only once across multiple enrichViews invocations within the TTL', async () => {
      const client = makeRepositoryClient([{ name: 'my-query', type: 'query', description: '' }]);
      const { enrichViews } = createStreamsEnrichment(client, makeApplication(), makeFakePerf());

      await enrichViews([makeView('my-query')]);
      await enrichViews([makeView('my-query')]);

      expect(client.fetch).toHaveBeenCalledTimes(1);
    });

    it('re-fetches views from the API after the cache TTL expires', async () => {
      const client = makeRepositoryClient([{ name: 'my-query', type: 'query', description: '' }]);
      const perf = makeFakePerf();
      const { enrichViews } = createStreamsEnrichment(client, makeApplication(), perf);

      await enrichViews([makeView('my-query')]);

      perf.tick(STREAMS_CACHE_TTL_MS + 1);

      await enrichViews([makeView('my-query')]);

      expect(client.fetch).toHaveBeenCalledTimes(2);
    });

    it('reflects updated view data after the cache TTL expires', async () => {
      const client = makeRepositoryClient([
        { name: 'my-query', type: 'query', description: 'Original' },
      ]);
      const perf = makeFakePerf();
      const { enrichViews } = createStreamsEnrichment(client, makeApplication(), perf);

      const [firstResult] = await enrichViews([makeView('my-query')]);
      expect(firstResult.description).toBe('Original');

      client.fetch.mockResolvedValue({
        summaries: [{ name: 'my-query', type: 'query', description: 'Updated' }],
      });

      perf.tick(STREAMS_CACHE_TTL_MS + 1);

      const [secondResult] = await enrichViews([makeView('my-query')]);
      expect(secondResult.description).toBe('Updated');
      expect(client.fetch).toHaveBeenCalledTimes(2);
    });

    it('caches absent view names so unmanaged views do not trigger repeated API calls', async () => {
      const client = makeRepositoryClient([]);
      const { enrichViews } = createStreamsEnrichment(client, makeApplication());
      const views = [makeView('unmanaged-view')];

      const first = await enrichViews(views);
      const second = await enrichViews(views);

      expect(first).toEqual(views);
      expect(second).toEqual(views);
      expect(client.fetch).toHaveBeenCalledTimes(1);
    });

    it('re-fetches absent view names after the cache TTL expires', async () => {
      const client = makeRepositoryClient([]);
      const perf = makeFakePerf();
      const { enrichViews } = createStreamsEnrichment(client, makeApplication(), perf);
      const views = [makeView('unmanaged-view')];

      await enrichViews(views);

      perf.tick(STREAMS_CACHE_TTL_MS + 1);

      await enrichViews(views);

      expect(client.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('concurrent requests', () => {
    it('deduplicates concurrent requests for the same sources', async () => {
      const client = makeRepositoryClient([{ name: 'logs', type: 'wired', description: '' }]);
      const { enrichSources } = createStreamsEnrichment(client, makeApplication());

      const [result1, result2] = await Promise.all([
        enrichSources([makeSource('logs')]),
        enrichSources([makeSource('logs')]),
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
      const { enrichSources } = createStreamsEnrichment(client, makeApplication());

      await Promise.all([
        enrichSources([makeSource('logs'), makeSource('metrics')]),
        enrichSources([makeSource('metrics'), makeSource('traces')]),
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
      const { enrichSources } = createStreamsEnrichment(client, makeApplication());

      const promise1 = enrichSources([makeSource('logs'), makeSource('metrics')]);

      // Yield to the microtask queue so the first enricher call's API request
      // goes in-flight before the second enricher call starts.
      await Promise.resolve();

      // Second call overlaps: 'metrics' is already in-flight (deduplicated),
      // 'traces' is new and triggers a separate API request.
      const promise2 = enrichSources([makeSource('metrics'), makeSource('traces')]);

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

    it('deduplicates concurrent requests for the same views', async () => {
      const client = makeRepositoryClient([{ name: 'my-query', type: 'query', description: '' }]);
      const { enrichViews } = createStreamsEnrichment(client, makeApplication());

      const [result1, result2] = await Promise.all([
        enrichViews([makeView('my-query')]),
        enrichViews([makeView('my-query')]),
      ]);

      expect(client.fetch).toHaveBeenCalledTimes(1);
      expect(result1[0].type).toBe(SOURCES_TYPES.QUERY_STREAM);
      expect(result2[0].type).toBe(SOURCES_TYPES.QUERY_STREAM);
    });

    it('batches view cache misses from concurrent calls into a single API request', async () => {
      const client = makeRepositoryClient([
        { name: 'view-a', type: 'query', description: '' },
        { name: 'view-b', type: 'query', description: '' },
        { name: 'view-c', type: 'query', description: '' },
      ]);
      const { enrichViews } = createStreamsEnrichment(client, makeApplication());

      await Promise.all([
        enrichViews([makeView('view-a'), makeView('view-b')]),
        enrichViews([makeView('view-b'), makeView('view-c')]),
      ]);

      expect(client.fetch).toHaveBeenCalledTimes(1);
      expect(client.fetch).toHaveBeenCalledWith(
        'POST /internal/streams/_bulk_get_summaries',
        expect.objectContaining({
          params: { body: { names: expect.arrayContaining(['view-a', 'view-b', 'view-c']) } },
        })
      );
    });

    it('handles overlapping view sets across separate async calls correctly', async () => {
      const client = {
        fetch: jest
          .fn()
          .mockResolvedValueOnce({
            summaries: [
              { name: 'view-a', type: 'query', description: '' },
              { name: 'view-b', type: 'query', description: '' },
            ],
          })
          .mockResolvedValueOnce({
            summaries: [{ name: 'view-c', type: 'query', description: '' }],
          }),
      } as unknown as jest.Mocked<StreamsRepositoryClient>;
      const { enrichViews } = createStreamsEnrichment(client, makeApplication());

      const promise1 = enrichViews([makeView('view-a'), makeView('view-b')]);

      // Yield to the microtask queue so the first API request goes in-flight.
      await Promise.resolve();

      // Second call: 'view-b' is already in-flight, 'view-c' is new.
      const promise2 = enrichViews([makeView('view-b'), makeView('view-c')]);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(client.fetch).toHaveBeenCalledTimes(2);
      expect(client.fetch).toHaveBeenNthCalledWith(
        1,
        'POST /internal/streams/_bulk_get_summaries',
        expect.objectContaining({
          params: { body: { names: expect.arrayContaining(['view-a', 'view-b']) } },
        })
      );
      expect(client.fetch).toHaveBeenNthCalledWith(
        2,
        'POST /internal/streams/_bulk_get_summaries',
        expect.objectContaining({ params: { body: { names: ['view-c'] } } })
      );

      expect(result1[0].type).toBe(SOURCES_TYPES.QUERY_STREAM); // view-a
      expect(result1[1].type).toBe(SOURCES_TYPES.QUERY_STREAM); // view-b
      expect(result2[0].type).toBe(SOURCES_TYPES.QUERY_STREAM); // view-b (deduplicated)
      expect(result2[1].type).toBe(SOURCES_TYPES.QUERY_STREAM); // view-c
    });
  });
});
