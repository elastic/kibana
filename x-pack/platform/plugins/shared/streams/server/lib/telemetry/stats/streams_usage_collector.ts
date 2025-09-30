/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { Logger } from '@kbn/core/server';
import {
  hasChangedRetention,
  percentiles,
  isClassicStream,
  isWiredStream,
  isGroupStream,
} from './utils';
import type { StreamsStatsTelemetry } from './types';
import { registerStreamsUsageCollector as registerCollector } from './register_collector';

/**
 * Creates a fetch function for Streams usage statistics with logger closure
 */
function createFetchFunction(logger: Logger) {
  return async function fetchStreamsUsageStats({
    esClient,
  }: {
    esClient: any;
  }): Promise<StreamsStatsTelemetry> {
    try {
      const [allStreamsData, significantEventsMetrics, ruleExecutionMetrics] = await Promise.all([
        fetchAllStreamsData(esClient),
        fetchSignificantEventsMetrics(esClient),
        fetchRuleExecutionMetrics(esClient),
      ]);

      const { classicStreamsMetrics, wiredStreamsCount, streamsCache } =
        processStreamsData(allStreamsData);

      // Pass the cache to avoid additional ES calls
      const categorizedSignificantEventsMetrics = await categorizeSignificantEvents(
        significantEventsMetrics,
        streamsCache
      );

      return {
        classic_streams: classicStreamsMetrics,
        wired_streams: { count: wiredStreamsCount },
        significant_events: {
          ...categorizedSignificantEventsMetrics,
          ...ruleExecutionMetrics,
        },
      };
    } catch (error) {
      logger.error('Failed to collect Streams telemetry data', error);
      throw error;
    }
  };

  async function fetchAllStreamsData(esClient: any) {
    const allStreams = await esClient.search({
      index: '.kibana_streams',
      size: 10000,
      sort: [{ name: 'asc' }],
      track_total_hits: false,
      _source: true,
      query: { match_all: {} },
    });

    return allStreams.hits?.hits ?? [];
  }

  function processStreamsData(hits: any[]) {
    let changedCount = 0;
    let withProcessingCount = 0;
    let withFieldsCount = 0;
    let withChangedRetentionCount = 0;
    let wiredCount = 0;

    const streamsCache = new Map();

    for (const hit of hits) {
      const definition = hit._source ?? {};

      if (isClassicStream(definition)) {
        // Presence of a classic stream in `.kibana_streams` implies it has been stored/changed
        changedCount++;

        if (hasProcessingSteps(definition)) {
          withProcessingCount++;
        }

        if (hasFieldOverrides(definition)) {
          withFieldsCount++;
        }

        if (hasChangedRetention(definition.ingest?.lifecycle)) {
          withChangedRetentionCount++;
        }
      }

      if (isWiredStream(definition) && !isGroupStream(definition)) {
        wiredCount++;
      }

      // Cache the stream definition for later use
      streamsCache.set(definition.name, definition);
    }

    return {
      classicStreamsMetrics: {
        changed_count: changedCount,
        with_processing_count: withProcessingCount,
        with_fields_count: withFieldsCount,
        with_changed_retention_count: withChangedRetentionCount,
      },
      wiredStreamsCount: wiredCount,
      allStreamsData: hits, // Return for potential reuse in categorizeStreamsByType
      streamsCache, // Return the cache
    };
  }

  async function fetchSignificantEventsMetrics(esClient: any) {
    const [rulesCount, eventsData] = await Promise.all([
      fetchSignificantEventRulesCount(esClient),
      fetchSignificantEventsData(esClient),
    ]);

    return {
      rules_count: rulesCount,
      ...eventsData,
    };
  }

  async function fetchSignificantEventRulesCount(esClient: any) {
    const rulesCountResponse = await esClient.search({
      index: '.kibana*',
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { type: 'alert' } },
            { terms: { 'alert.alertTypeId': STREAMS_RULE_TYPE_IDS } },
          ],
        },
      },
      track_total_hits: true,
    });

    return (rulesCountResponse.hits?.total as any)?.value ?? 0;
  }

  async function fetchSignificantEventsData(esClient: any) {
    const significantEventsResponse = await esClient.search({
      index: '.alerts-streams.alerts-*', // Changed from .alerts-streams.alerts-default to capture all spaces
      size: 0,
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  { terms: { 'kibana.alert.rule.category': STREAMS_RULE_TYPE_IDS } },
                  { terms: { 'kibana.alert.rule.category': ['ES|QL Rule'] } },
                ],
              },
            },
            { terms: { 'kibana.alert.rule.tags': ['streams'] } },
          ],
        },
      },
      aggs: {
        by_stream_tags: {
          terms: {
            field: 'kibana.alert.rule.tags',
            size: 10000,
            exclude: 'streams',
          },
        },
      },
      track_total_hits: true,
    });

    const storedCount = (significantEventsResponse.hits?.total as any)?.value ?? 0;
    const streamTagsAgg = significantEventsResponse.aggregations?.by_stream_tags as any;
    const streamTags = streamTagsAgg?.buckets || [];

    return {
      stored_count: storedCount,
      stream_tags: streamTags.map((bucket: any) => bucket.key),
    };
  }

  async function categorizeSignificantEvents(
    significantEventsMetrics: any,
    streamsCache: Map<string, any>
  ) {
    const { stored_count: storedCount, stream_tags: streamTags } = significantEventsMetrics;

    if (streamTags.length === 0) {
      return {
        rules_count: significantEventsMetrics.rules_count,
        stored_count: storedCount,
        unique_wired_streams_with_stored_count: 0,
        unique_classic_streams_with_stored_count: 0,
      };
    }

    const { uniqueWiredStreamsCount, uniqueClassicStreamsCount } = categorizeStreamsByTypeFromCache(
      streamTags,
      streamsCache
    );

    return {
      rules_count: significantEventsMetrics.rules_count,
      stored_count: storedCount,
      unique_wired_streams_with_stored_count: uniqueWiredStreamsCount,
      unique_classic_streams_with_stored_count: uniqueClassicStreamsCount,
    };
  }

  function categorizeStreamsByTypeFromCache(streamNames: string[], streamsCache: Map<string, any>) {
    let wiredCount = 0;
    let classicCount = 0;

    for (const streamName of streamNames) {
      const definition = streamsCache.get(streamName);

      if (!definition) {
        // Stream not found in cache, skip
        continue;
      }

      if (isWiredStream(definition) && !isGroupStream(definition)) {
        wiredCount++;
      } else if (isClassicStream(definition) && !isGroupStream(definition)) {
        classicCount++;
      }
    }

    return {
      uniqueWiredStreamsCount: wiredCount,
      uniqueClassicStreamsCount: classicCount,
    };
  }

  async function fetchRuleExecutionMetrics(esClient: any) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const eventLogResponse = await esClient.search({
      index: '.kibana-event-log-*',
      size: 10000,
      query: {
        bool: {
          filter: [
            { term: { 'event.action': 'execute' } },
            { terms: { 'rule.category': STREAMS_RULE_TYPE_IDS } },
            { range: { '@timestamp': { gte: twentyFourHoursAgo } } },
          ],
        },
      },
      _source: ['event.duration'],
    });

    const durationsNs = extractValidDurations(eventLogResponse.hits.hits);
    const executionsCount24h = durationsNs.length;

    if (executionsCount24h === 0) {
      return {
        rule_execution_ms_avg_24h: null,
        rule_execution_ms_p95_24h: null,
        executions_count_24h: 0,
      };
    }

    const durationsMs = durationsNs.map((ns: number) => ns / 1e6);
    const sum = durationsMs.reduce((a: number, b: number) => a + b, 0);
    const ruleExecutionMsAvg24h = Math.round((sum / durationsMs.length) * 1000) / 1000;
    const ruleExecutionMsP9524h = Math.round(percentiles(durationsMs, [95])[0] * 1000) / 1000;

    return {
      rule_execution_ms_avg_24h: ruleExecutionMsAvg24h,
      rule_execution_ms_p95_24h: ruleExecutionMsP9524h,
      executions_count_24h: executionsCount24h,
    };
  }

  function hasProcessingSteps(definition: any): boolean {
    const processors = definition.ingest?.processing?.steps as unknown[] | undefined;
    return Array.isArray(processors) && processors.length > 0;
  }

  function hasFieldOverrides(definition: any): boolean {
    const fieldOverrides = definition.ingest?.classic?.field_overrides ?? {};
    return fieldOverrides && Object.keys(fieldOverrides).length > 0;
  }

  function extractValidDurations(hits: any[]): number[] {
    return hits
      .map((hit: any) => (hit._source as any)?.event?.duration)
      .filter((v: any) => v != null)
      .map((v: any) => (typeof v === 'string' ? parseInt(v, 10) : v))
      .filter((v: any) => typeof v === 'number' && !isNaN(v));
  }
}

/**
 * Registers the Streams usage statistics collector
 */
export function registerStreamsUsageCollector(
  usageCollection: UsageCollectionSetup,
  logger: Logger
) {
  registerCollector(usageCollection, {
    isReady: () => true,
    fetch: createFetchFunction(logger),
  });
}
