/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { hasChangedRetention, hasProcessingSteps, hasFieldOverrides } from './utils';
import type { StreamsStatsTelemetry } from './types';
import { registerStreamsUsageCollector as registerCollector } from './register_collector';
import { getErrorMessage } from '../../streams/errors/parse_error';

// Reader abstraction to hide storage/client specifics from the collector
export interface StreamsUsageReader {
  readAllManagedStreams(): Promise<Streams.all.Definition[]>;
}

function createFetchFunction(logger: Logger, getReader: () => Promise<StreamsUsageReader>) {
  return async function fetchStreamsUsageStats(_: {
    esClient: ElasticsearchClient;
  }): Promise<StreamsStatsTelemetry> {
    try {
      const reader = await getReader();
      const allStreamsData = await reader.readAllManagedStreams();

      const { classicStreamsMetrics, wiredStreamsCount } = processStreamsData(allStreamsData);

      return {
        classic_streams: classicStreamsMetrics,
        wired_streams: { count: wiredStreamsCount },
      };
    } catch (error) {
      logger.error(`Failed to collect Streams telemetry data: ${getErrorMessage(error)}`);
      throw error;
    }
  };

  function processStreamsData(streamDefinitions: Streams.all.Definition[]) {
    let changedCount = 0;
    let withProcessingCount = 0;
    let withFieldsCount = 0;
    let withChangedRetentionCount = 0;
    let wiredCount = 0;

    for (const definition of streamDefinitions) {
      if (Streams.WiredStream.Definition.is(definition)) {
        wiredCount++;
      } else if (Streams.ClassicStream.Definition.is(definition)) {
        // Presence of a classic stream in storage implies it has been stored/changed
        changedCount++;

        if (hasProcessingSteps(definition)) {
          withProcessingCount++;
        }

        if (hasFieldOverrides(definition)) {
          withFieldsCount++;
        }

        if (hasChangedRetention(definition.ingest.lifecycle)) {
          withChangedRetentionCount++;
        }
      }
    }

    return {
      classicStreamsMetrics: {
        changed_count: changedCount,
        with_processing_count: withProcessingCount,
        with_fields_count: withFieldsCount,
        with_changed_retention_count: withChangedRetentionCount,
      },
      wiredStreamsCount: wiredCount,
    };
  }
}

/**
 * Registers the Streams usage statistics collector
 */
export function registerStreamsUsageCollector(
  usageCollection: UsageCollectionSetup,
  logger: Logger,
  getReader: () => Promise<StreamsUsageReader>
) {
  registerCollector(usageCollection, {
    isReady: () => true,
    fetch: createFetchFunction(logger, getReader),
  });
}
