/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { Streams } from '@kbn/streams-schema';
import type { StreamsPluginStartDependencies } from '../../../types';
import { registerStreamsUsageCollector } from './streams_usage_collector';
import { createStreamsStorageClient } from '../../streams/storage/streams_storage_client';
import type { StreamsUsageReader } from './streams_usage_collector';

/**
 * Service for collecting Streams usage statistics for telemetry
 */
export class StatsTelemetryService {
  constructor() {}

  public setup(
    core: CoreSetup<StreamsPluginStartDependencies>,
    logger: Logger,
    usageCollection?: UsageCollectionSetup
  ) {
    if (!usageCollection) {
      logger.debug(
        '[Streams Stats Telemetry Service] Usage collection not available, skipping setup'
      );
      return;
    }

    logger.debug('[Streams Stats Telemetry Service] Setting up streams usage collector');

    // Provide a reader factory so future methods can share the same storage client
    registerStreamsUsageCollector(usageCollection, logger, () => this.getUsageReader(core, logger));
  }

  private async getUsageReader(
    core: CoreSetup<StreamsPluginStartDependencies>,
    logger: Logger
  ): Promise<StreamsUsageReader> {
    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const storageClient = createStreamsStorageClient(esClient, logger);

    return {
      async readAllManagedStreams(): Promise<Streams.all.Definition[]> {
        const results: Streams.all.Definition[] = [];
        const pageSize = 2000; // To avoid ES circuit_breaker_exception
        let from = 0;
        while (true) {
          const resp = await storageClient.search({
            from,
            size: pageSize,
            track_total_hits: false,
            query: { match_all: {} },
          });

          const hits = resp.hits.hits.filter(
            ({ _source: definition }) => !('group' in definition) // Filter out old Group streams
          ) as Array<{ _source?: Streams.all.Definition }>;
          if (hits.length === 0) {
            break;
          }

          for (const { _source } of hits) {
            if (_source) {
              results.push(_source);
            }
          }

          if (hits.length < pageSize) {
            break;
          }
          from += pageSize;
        }
        return results;
      },
    };
  }
}
