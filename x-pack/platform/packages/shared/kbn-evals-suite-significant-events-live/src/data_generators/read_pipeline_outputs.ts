/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { Detection, Discovery, SignificantEvent } from '@kbn/significant-events-schema';
import {
  DETECTIONS_DATA_STREAM,
  DISCOVERIES_DATA_STREAM,
  EVENTS_DATA_STREAM,
} from '@kbn/evals-suite-significant-events';
import { RULE_EVENTS_DATA_STREAM } from './wipe_pipeline_data';

const MAX_DOCS = 500;

/**
 * Read the change-point detections the detection workflow wrote. Scan markers and processed
 * markers live in the same stream but carry no `change_point_type`, so the `exists` filter
 * returns detections only.
 */
export async function readDetections(esClient: Client): Promise<Detection[]> {
  await esClient.indices.refresh({ index: DETECTIONS_DATA_STREAM }).catch(() => {});

  const response = await esClient.search<Record<string, unknown>>({
    index: DETECTIONS_DATA_STREAM,
    ignore_unavailable: true,
    size: MAX_DOCS,
    sort: [{ '@timestamp': 'asc' }],
    query: { bool: { filter: [{ exists: { field: 'change_point_type' } }] } },
  });

  return response.hits.hits.flatMap((hit) => {
    const source = hit._source;
    if (!source) {
      return [];
    }
    return [
      {
        '@timestamp': String(source['@timestamp']),
        detection_id: String(source.detection_id ?? hit._id),
        rule_uuid: String(source.rule_uuid),
        rule_name: source.rule_name ? String(source.rule_name) : undefined,
        stream_name: String(source.stream_name ?? ''),
        change_point_type: source.change_point_type,
        p_value: Number(source.p_value ?? 0),
        // Derived at read time in production; nothing has processed these detections yet.
        processed: false,
      } as Detection,
    ];
  });
}

/**
 * Read the discoveries the discovery agent wrote, deduplicated to the latest version per
 * `event_id` and filtered to `kind: discovery` (handled/clearance markers share the stream).
 */
export async function readLatestDiscoveries(esClient: Client): Promise<Discovery[]> {
  await esClient.indices.refresh({ index: DISCOVERIES_DATA_STREAM }).catch(() => {});

  const response = await esClient.search<Discovery & { kind?: string }>({
    index: DISCOVERIES_DATA_STREAM,
    ignore_unavailable: true,
    size: MAX_DOCS,
    sort: [{ '@timestamp': 'asc' }],
    query: { match_all: {} },
  });

  // Handled/clearance markers carry no discovery content — keep the latest full discovery doc
  // per event_id (ascending sort: last write wins).
  const latestByEventId = new Map<string, Discovery>();
  for (const hit of response.hits.hits) {
    const discovery = hit._source;
    if (discovery?.event_id && discovery.kind === 'discovery') {
      latestByEventId.set(discovery.event_id, discovery);
    }
  }

  return [...latestByEventId.values()];
}

/** Count `.rule-events` signal docs per `rule.id` — how often each installed rule fired. */
export async function readSignalCountsByRule(esClient: Client): Promise<Record<string, number>> {
  await esClient.indices.refresh({ index: RULE_EVENTS_DATA_STREAM }).catch(() => {});

  const response = await esClient.search({
    index: RULE_EVENTS_DATA_STREAM,
    ignore_unavailable: true,
    size: 0,
    query: { term: { type: 'signal' } },
    aggs: { by_rule: { terms: { field: 'rule.id', size: 1000 } } },
  });

  const buckets =
    (
      response.aggregations?.by_rule as
        | { buckets?: Array<{ key: string; doc_count: number }> }
        | undefined
    )?.buckets ?? [];

  return Object.fromEntries(buckets.map((bucket) => [bucket.key, bucket.doc_count]));
}

/**
 * Read significant events, deduplicated to the latest version per `event_id` — events_write
 * appends a new `event_uuid` version per judge decision, and only the latest one is the final
 * lifecycle state.
 */
export async function readLatestSignificantEvents(esClient: Client): Promise<SignificantEvent[]> {
  await esClient.indices.refresh({ index: EVENTS_DATA_STREAM }).catch(() => {});

  const response = await esClient.search<SignificantEvent>({
    index: EVENTS_DATA_STREAM,
    ignore_unavailable: true,
    size: MAX_DOCS,
    sort: [{ '@timestamp': 'asc' }],
    query: { match_all: {} },
  });

  const latestByEventId = new Map<string, SignificantEvent>();
  for (const hit of response.hits.hits) {
    const event = hit._source;
    if (!event) {
      continue;
    }
    // Hits are sorted ascending, so the last write per event_id wins.
    latestByEventId.set(event.event_id, event);
  }

  return [...latestByEventId.values()];
}
