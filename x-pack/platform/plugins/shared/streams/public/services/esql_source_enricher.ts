/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import type { ESQLSourceResult } from '@kbn/esql-types';
import { Streams } from '@kbn/streams-schema';
import type { StreamsRepositoryClient } from '../api';

/**
 * Creates a source enricher function that adds Streams metadata to ESQL source suggestions.
 * This enricher fetches all streams once using the public API and enriches sources that
 * correspond to streams with descriptions and links.
 *
 * @param repositoryClient - Streams repository client for fetching streams
 * @param application - Core Application service for generating app URLs
 * @returns An enricher function that can be registered with the ESQL plugin
 */
export function createStreamsSourceEnricher(
  repositoryClient: StreamsRepositoryClient,
  application: ApplicationStart
): (sources: ESQLSourceResult[]) => Promise<ESQLSourceResult[]> {
  return async (sources: ESQLSourceResult[]): Promise<ESQLSourceResult[]> => {
    try {
      // Fetch all streams once using the public API
      const response = await repositoryClient.fetch('GET /api/streams 2023-10-31', {
        signal: new AbortController().signal,
      });

      // Create a lookup map by stream name for efficient matching
      const streamsByName = new Map(
        response.streams.map((streamDef) => [streamDef.name, streamDef])
      );

      // Enrich sources that match stream names
      return sources.map((source) => {
        const streamDef = streamsByName.get(source.name);
        if (!streamDef) {
          return source;
        }

        // Determine icon type based on stream type
        const isWiredStream = Streams.WiredStream.Definition.is(streamDef);
        const iconType = isWiredStream ? 'streamWired' : 'streamClassic';

        return {
          ...source,
          enrichment: {
            description: streamDef.description,
            links: [
              {
                label: 'View Stream Details',
                url: `${window.location.origin}${application.getUrlForApp('streams', {
                  path: `/${streamDef.name}/management/retention`,
                })}`,
              },
            ],
            iconType,
          },
        };
      });
    } catch (error) {
      // Graceful degradation - if streams API fails, return original sources unchanged
      // This ensures the ESQL editor continues to work even if streams plugin has issues
      // eslint-disable-next-line no-console
      console.error('Failed to enrich ESQL sources with streams metadata:', error);
      return sources;
    }
  };
}
