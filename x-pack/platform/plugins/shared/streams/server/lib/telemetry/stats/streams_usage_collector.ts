/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import {
  hasChangedRetention,
  isDevMode,
  percentiles,
  isClassicStream,
  isWiredStream,
  isGroupStream,
} from './utils';
import type { StreamsStatsTelemetry } from './types';
import { registerStreamsUsageCollector as registerCollector } from './register_collector';

/**
 * Fetches Streams usage statistics for telemetry collection
 */
export async function fetchStreamsUsageStats({
  soClient,
  esClient,
}: {
  soClient: any;
  esClient: any;
}): Promise<StreamsStatsTelemetry> {
  const result: StreamsStatsTelemetry = {
    classic_streams: {
      changed_count: 0,
      with_processing_count: 0,
      with_fields_count: 0,
      with_changed_retention_count: 0,
    },
    wired_streams: { count: 0 },
    significant_events: {
      rules_count: 0,
      stored_count: 0,
      unique_wired_streams_count: 0,
      unique_classic_streams_count: 0,
      rule_execution_ms_avg_24h: null,
      rule_execution_ms_p95_24h: null,
      executions_count_24h: 0,
    },
  };

  // 1) Streams metrics (guarded)
  try {
    const allStreams = await esClient.search({
      index: '.kibana_streams',
      size: 10000,
      sort: [{ name: 'asc' }],
      track_total_hits: false,
      _source: true,
      query: { match_all: {} },
    });
    // Note: We no longer need defaultRetention since we use schema-based type guards
    const hits = allStreams.hits?.hits ?? [];
    for (const hit of hits) {
      const definition = hit._source ?? {};

      // Use lightweight type detection for better telemetry performance
      const isClassic = isClassicStream(definition);
      const isWired = isWiredStream(definition);
      const isGroup = isGroupStream(definition);

      if (isClassic) {
        // Presence of a classic stream in `.kibana_streams` implies it has been stored/changed
        // from its unmanaged defaults. Count it as "changed".
        result.classic_streams.changed_count++;
        const processors = definition.ingest?.processing?.steps as unknown[] | undefined;
        if (Array.isArray(processors) && processors.length > 0)
          result.classic_streams.with_processing_count++;
        const fieldOverrides = definition.ingest?.classic?.field_overrides ?? {};
        if (fieldOverrides && Object.keys(fieldOverrides).length > 0)
          result.classic_streams.with_fields_count++;
        // Check for changed retention using reusable utility
        if (hasChangedRetention(definition.ingest?.lifecycle)) {
          result.classic_streams.with_changed_retention_count++;
        }
      }
      if (isWired && !isGroup) {
        result.wired_streams.count++;
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      '[Streams Stats Telemetry] Failed to list streams or compute stream metrics',
      err
    );
    if (isDevMode()) {
      throw err;
    }
  }

  // 2) Rules count (guarded)
  try {
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
    } as any);

    result.significant_events.rules_count = (rulesCountResponse.hits?.total as any)?.value ?? 0;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Streams Stats Telemetry] Failed to count significant event rules', err);
    if (isDevMode()) {
      throw err;
    }
  }

  // 3) Stored events count and unique streams (guarded)
  try {
    const significantEventsResponse = await esClient.search({
      index: '.alerts-streams.alerts-default',
      size: 0, // We only want aggregations, not documents
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  // Handle both possible field values for rule category
                  { terms: { 'kibana.alert.rule.category': STREAMS_RULE_TYPE_IDS } },
                  { terms: { 'kibana.alert.rule.category': ['ES|QL Rule'] } },
                ],
              },
            },
            // Also filter by tags to ensure these are streams alerts
            { terms: { 'kibana.alert.rule.tags': ['streams'] } },
          ],
        },
      },
      aggs: {
        by_stream_tags: {
          terms: {
            field: 'kibana.alert.rule.tags',
            size: 10000,
            // Filter to only get stream names (exclude 'streams' tag)
            exclude: 'streams',
          },
        },
      },
      track_total_hits: true,
    } as any);

    result.significant_events.stored_count =
      (significantEventsResponse.hits?.total as any)?.value ?? 0;

    // Count unique streams by counting unique tags (excluding 'streams' tag)
    const streamTagsAgg = significantEventsResponse.aggregations?.by_stream_tags as any;
    const streamTags = streamTagsAgg?.buckets || [];
    // Note: unique_wired_streams_count and unique_classic_streams_count will be set below

    // Determine stream types for streams with events
    if (streamTags.length > 0) {
      try {
        const streamNames = streamTags.map((bucket: any) => bucket.key);
        const streamDefinitionsResponse = await esClient.search({
          index: '.kibana_streams',
          size: streamNames.length,
          query: {
            bool: {
              filter: [{ terms: { name: streamNames } }],
            },
          },
          _source: true, // Get full stream definition for type guards
        } as any);

        let wiredCount = 0;
        let classicCount = 0;

        for (const hit of streamDefinitionsResponse.hits?.hits || []) {
          const definition = hit._source ?? {};

          // Use lightweight type detection for better telemetry performance
          const isClassic = isClassicStream(definition);
          const isWired = isWiredStream(definition);
          const isGroup = isGroupStream(definition);

          if (isWired && !isGroup) {
            wiredCount++;
          } else if (isClassic && !isGroup) {
            classicCount++;
          }
          // Note: Group streams are not counted in either category
        }

        result.significant_events.unique_wired_streams_count = wiredCount;
        result.significant_events.unique_classic_streams_count = classicCount;
      } catch (streamTypeErr) {
        // eslint-disable-next-line no-console
        console.error(
          '[Streams Stats Telemetry] Failed to determine stream types for events',
          streamTypeErr
        );
        // Leave unique_wired_streams_count and unique_classic_streams_count at 0
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Streams Stats Telemetry] Failed to count significant events', err);
    if (isDevMode()) {
      throw err;
    }
  }

  // 4) Event log metrics - 24h rolling window (guarded)
  try {
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

    const durationsNs = eventLogResponse.hits.hits
      .map((hit: any) => (hit._source as any)?.event?.duration)
      .filter((v: any) => v != null)
      .map((v: any) => (typeof v === 'string' ? parseInt(v, 10) : v))
      .filter((v: any) => typeof v === 'number' && !isNaN(v));
    result.significant_events.executions_count_24h = durationsNs.length;
    if (durationsNs.length > 0) {
      const durationsMs = durationsNs.map((ns: number) => ns / 1e6);
      const sum = durationsMs.reduce((a: number, b: number) => a + b, 0);
      result.significant_events.rule_execution_ms_avg_24h =
        Math.round((sum / durationsMs.length) * 1000) / 1000;
      result.significant_events.rule_execution_ms_p95_24h =
        Math.round(percentiles(durationsMs, [95])[0] * 1000) / 1000;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Streams Stats Telemetry] Failed to fetch event log execution metrics', {
      error: err,
      message: (err as any)?.message,
      statusCode: (err as any)?.meta?.statusCode,
      body: (err as any)?.meta?.body,
    });
    if (isDevMode()) {
      throw err;
    }
  }

  return result;
}

/**
 * Registers the Streams usage statistics collector
 */
export function registerStreamsUsageCollector(usageCollection: UsageCollectionSetup) {
  registerCollector(usageCollection, {
    isReady: () => true,
    fetch: fetchStreamsUsageStats,
  });
}
