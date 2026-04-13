/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import type { ESQLSourceResult } from '@kbn/esql-types';
import { SOURCES_TYPES } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import type { Streams as StreamsSchema } from '@kbn/streams-schema';
import type { StreamsRepositoryClient } from '../api';

export const STREAMS_CACHE_TTL_MS = 60_000;

/**
 * Creates a source enricher function that adds Streams metadata to ES|QL source suggestions.
 *
 * When registered with the ESQL plugin, this enricher fetches all managed streams and
 * annotates matching autocomplete sources with the stream's description, a link to its
 * streams page, and a visual indicator of the stream type (wired vs classic).
 *
 * @param repositoryClient - Streams repository client for fetching stream definitions
 * @param application - Promise resolving to the Core Application service
 * @param perf - Optional performance-like object with a `now()` method; defaults to `performance`.
 *               Injectable for testing to control TTL expiry without global timer mocks.
 */
export function createStreamsSourceEnricher(
  repositoryClient: StreamsRepositoryClient,
  application: Promise<Pick<ApplicationStart, 'getUrlForApp'>>,
  perf: { now: () => number } = performance
): (sources: ESQLSourceResult[]) => Promise<ESQLSourceResult[]> {
  let cachedStreams: Map<string, StreamsSchema.all.Definition> | undefined;
  let cacheExpiry = 0;
  let pendingFetch: Promise<Map<string, StreamsSchema.all.Definition>> | undefined;

  const getStreams = (): Promise<Map<string, StreamsSchema.all.Definition>> => {
    if (cachedStreams !== undefined && perf.now() < cacheExpiry) {
      return Promise.resolve(cachedStreams);
    }
    if (!pendingFetch) {
      pendingFetch = repositoryClient
        .fetch('GET /api/streams 2023-10-31', {
          signal: null,
        })
        .then(({ streams }) => {
          const map = new Map(streams.map((stream) => [stream.name, stream]));
          cachedStreams = map;
          cacheExpiry = perf.now() + STREAMS_CACHE_TTL_MS;
          pendingFetch = undefined;
          return map;
        })
        .catch((err) => {
          pendingFetch = undefined;
          throw err;
        });
    }
    return pendingFetch;
  };

  // Importing the streams schema here so it stays outside the main code path
  // but is still loaded lazily
  const streamsSchemaPromise = import('@kbn/streams-schema');

  return async (sources: ESQLSourceResult[]): Promise<ESQLSourceResult[]> => {
    try {
      const app = await application;
      const { Streams } = await streamsSchemaPromise;

      const streams = await getStreams();

      return sources.map((source) => {
        const stream = streams.get(source.name);
        if (!stream) {
          return source;
        }

        const isWired = Streams.WiredStream.Definition.is(stream);

        const streamUrl = app.getUrlForApp('streams', {
          absolute: true,
          path: `/${stream.name}/management/overview`,
        });

        return {
          ...source,
          description: stream.description || undefined,
          links: [
            {
              label: i18n.translate('xpack.streams.esqlSourceEnricher.viewStreamDetailsLabel', {
                defaultMessage: 'View {streamName} details',
                values: { streamName: stream.name },
              }),
              url: streamUrl,
            },
          ],
          type: isWired ? SOURCES_TYPES.WIRED_STREAM : SOURCES_TYPES.CLASSIC_STREAM,
        };
      });
    } catch (_error) {
      // Graceful degradation: if the streams API is unavailable, return sources unchanged
      // so the ES|QL editor continues working normally.
      return sources;
    }
  };
}
