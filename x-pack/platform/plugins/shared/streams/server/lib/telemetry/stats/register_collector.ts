/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { StreamsStatsTelemetry } from './types';
import { streamsStatsSchema } from './schema';

/**
 * Registers the Streams usage statistics collector with Kibana's usage collection service
 * This is reported under stack_stats as snapshot telemetry and collected once daily
 */
export function registerStreamsUsageCollector(
  usageCollection: UsageCollectionSetup,
  collectorOptions: {
    isReady: () => boolean;
    fetch: (context: { esClient: ElasticsearchClient }) => Promise<StreamsStatsTelemetry>;
  }
) {
  const streamsUsageCollector = usageCollection.makeUsageCollector<StreamsStatsTelemetry>({
    type: 'streams',
    isReady: collectorOptions.isReady,
    fetch: collectorOptions.fetch,
    schema: streamsStatsSchema,
  });

  usageCollection.registerCollector(streamsUsageCollector);
}
