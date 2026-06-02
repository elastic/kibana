/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import type { ESQLSourceResult, EsqlView } from '@kbn/esql-types';
import { SOURCES_TYPES } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import { LRUCache } from 'lru-cache';
import type { StreamSummary } from '../../common';
import type { StreamsRepositoryClient } from '../api';

const STREAMS_CACHE_MAX = 10_000;
export const STREAMS_CACHE_TTL_MS = 60_000;

interface PendingBatch {
  names: string[];
  promise: Promise<StreamSummary[]>;
}

/**
 * Sentinel stored in the LRU cache for stream names that the API confirmed do
 * not correspond to any managed stream. Without this, every enricher call for
 * an unmanaged index would be a cache miss and trigger a fresh API request
 * because LRUCache does not cache `undefined` values returned by `fetchMethod`.
 */
const ABSENT = Symbol('absent');
type CacheValue = StreamSummary | typeof ABSENT;

const STREAM_TYPE_MAP: Record<string, string> = {
  wired: SOURCES_TYPES.WIRED_STREAM,
  classic: SOURCES_TYPES.CLASSIC_STREAM,
  query: SOURCES_TYPES.QUERY_STREAM,
};

interface EnrichmentData {
  description?: string;
  links: Array<{ label: string; url: string }>;
  type: string;
}

/**
 * Creates source and view enricher functions that add Streams metadata
 * to ES|QL autocomplete suggestions.
 *
 * Both enrichers share a single LRU cache backed by `_bulk_get_summaries`,
 * so lookups for the same stream name (whether triggered by a source or a view)
 * never result in duplicate API calls.
 *
 * Cache hits are served immediately. Cache misses are batched within a single microtask
 * tick and resolved with a single `_bulk_get_summaries` API call. Concurrent requests for
 * the same key are deduplicated natively by LRUCache's `fetchMethod` mechanism.
 *
 * @param repositoryClient - Streams repository client for fetching stream definitions
 * @param application - Promise resolving to the Core Application service
 * @param perf - Optional performance-like object with a `now()` method; defaults to `performance`.
 *               Injectable for testing to control TTL expiry without global timer mocks.
 */
export function createStreamsEnrichment(
  repositoryClient: StreamsRepositoryClient,
  application: Promise<Pick<ApplicationStart, 'getUrlForApp'>>,
  perf: { now: () => number } = performance
): {
  enrichSources: (sources: ESQLSourceResult[]) => Promise<ESQLSourceResult[]>;
  enrichViews: (views: EsqlView[]) => Promise<EsqlView[]>;
} {
  // Microtask-batching: all cache misses within the same microtask tick are
  // collected into a single `pendingBatch` and resolved with one API call.
  // LRUCache deduplicates concurrent fetches for the same key natively, so
  // overlapping enricher calls never trigger redundant per-key requests.
  let pendingBatch: PendingBatch | null = null;

  const cache = new LRUCache<string, CacheValue>({
    max: STREAMS_CACHE_MAX,
    ttl: STREAMS_CACHE_TTL_MS,
    perf,
    fetchMethod: async (name) => {
      if (!pendingBatch) {
        // First miss in this tick: create a new batch.
        const names: string[] = [];
        const promise = Promise.resolve().then(async () => {
          // Clear `pendingBatch` *before* the await so that any fetchMethod
          // calls triggered while this API request is in flight will start a
          // fresh batch instead of appending to a stale one whose `names`
          // have already been sent.
          pendingBatch = null;
          const { summaries } = await repositoryClient.fetch(
            'POST /internal/streams/_bulk_get_summaries',
            { params: { body: { names } }, signal: null }
          );
          return summaries;
        });
        pendingBatch = { names, promise };
      }
      // Append to the current batch and wait for its shared promise.
      pendingBatch.names.push(name);
      const streams = await pendingBatch.promise;
      // Return ABSENT (not undefined) for names not found in the response so
      // that LRUCache stores the result. Returning undefined would leave the
      // entry uncached and cause a new API call on every subsequent request
      // for the same unmanaged index name.
      return streams.find((s) => s.name === name) ?? ABSENT;
    },
  });

  /** Resolves a cached summary into enrichment data (description, links, type). */
  const toEnrichmentData = (
    summary: CacheValue | undefined,
    app: Pick<ApplicationStart, 'getUrlForApp'>
  ): EnrichmentData | undefined => {
    if (!summary || summary === ABSENT) {
      return undefined;
    }

    const streamUrl = app.getUrlForApp('streams', {
      absolute: true,
      path: `/${summary.name}/management/overview`,
    });

    return {
      description: summary.description || undefined,
      links: [
        {
          label: i18n.translate('xpack.streams.esqlSourceEnricher.viewStreamDetailsLabel', {
            defaultMessage: 'View {streamName} details',
            values: { streamName: summary.name },
          }),
          url: streamUrl,
        },
      ],
      type: STREAM_TYPE_MAP[summary.type] ?? SOURCES_TYPES.CLASSIC_STREAM,
    };
  };

  const enrich = async <T extends ESQLSourceResult | EsqlView>(items: T[]): Promise<T[]> => {
    try {
      const [app, summaries] = await Promise.all([
        application,
        Promise.all(
          items.map(({ name }) =>
            // Strip '$.' prefix from view names to get the underlying stream name for enrichment lookup.
            // This is needed because ES|QL autocomplete suggestions for views currently include the '$.' prefix, but our API expects raw stream names.
            // We can remove this once ES|QL stops adding the prefix in autocomplete suggestions. See
            cache.fetch(name.replace('$.', ''))
          )
        ),
      ]);

      return items.map((item, idx) => {
        const data = toEnrichmentData(summaries[idx], app);
        if (!data) {
          return item;
        }
        return {
          ...item,
          description: data.description,
          links: data.links,
          type: data.type,
        };
      });
    } catch (_error) {
      // Graceful degradation: if the streams API is unavailable, return sources/view unchanged
      // so the ES|QL editor continues working normally.
      return items;
    }
  };

  const enrichSources = async (sources: ESQLSourceResult[]): Promise<ESQLSourceResult[]> =>
    enrich(sources);

  const enrichViews = async (views: EsqlView[]): Promise<EsqlView[]> => enrich(views);

  return { enrichSources, enrichViews };
}
