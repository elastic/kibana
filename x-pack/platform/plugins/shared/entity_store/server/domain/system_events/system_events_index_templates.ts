/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesPutIndexTemplateRequest,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import {
  getExtractionRunsDataStreamName,
  getSystemEventsDataStreamName,
} from '../../../common/domain/system_events';

// Data stream lifecycle rolls over after 1d for retention <= 14d and after 7d for retention
// <= 90d, so docs live up to 4d and 37d.
export const EXTRACTION_RUNS_DATA_RETENTION = '3d';
export const SYSTEM_EVENTS_DATA_RETENTION = '30d';

export const getExtractionRunsIndexTemplateId = (namespace: string) =>
  `.entities_v2_system_extraction_runs_${namespace}_index_template` as const;

export const getSystemEventsIndexTemplateId = (namespace: string) =>
  `.entities_v2_system_events_${namespace}_index_template` as const;

const keyword = { type: 'keyword', ignore_above: 1024 } as const;
const long = { type: 'long' } as const;
const float = { type: 'float' } as const;

export const SYSTEM_EVENTS_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  properties: {
    '@timestamp': { type: 'date' },
    event: {
      properties: {
        kind: keyword,
        action: keyword,
        outcome: keyword,
        reason: keyword,
        duration: long,
      },
    },
    error: { properties: { message: keyword } },
    entity_store: {
      properties: {
        namespace: keyword,
        trigger: keyword,
        task_type: keyword,
        execution_uuid: keyword,
        entity_type: keyword,
        mode: keyword,
        maintainer_id: keyword,
        extraction: {
          properties: {
            count: long,
            pages: long,
            logs_processed: long,
            logs_cap_applied: { type: 'boolean' },
          },
        },
        history_snapshot: { properties: { doc_count: long } },
        summary: {
          properties: {
            runs: long,
            failures: long,
            aborted: long,
            entities: long,
            logs_processed: long,
            cap_applied_runs: long,
            duration_p50_ms: float,
            duration_p95_ms: float,
            duration_max_ms: float,
            last_error: keyword,
          },
        },
      },
    },
  },
};

const buildTemplate = ({
  name,
  indexPattern,
  retention,
  description,
}: {
  name: string;
  indexPattern: string;
  retention: string;
  description: string;
}): IndicesPutIndexTemplateRequest => ({
  name,
  _meta: {
    description,
    managed: true,
    managed_by: 'security_context_core_analysis',
  },
  index_patterns: [indexPattern],
  priority: 200,
  data_stream: {},
  template: {
    lifecycle: { data_retention: retention },
    mappings: SYSTEM_EVENTS_MAPPINGS,
    settings: { index: { codec: 'best_compression' } },
  },
});

export const getExtractionRunsIndexTemplateConfig = (namespace: string) =>
  buildTemplate({
    name: getExtractionRunsIndexTemplateId(namespace),
    indexPattern: getExtractionRunsDataStreamName(namespace),
    retention: EXTRACTION_RUNS_DATA_RETENTION,
    description: 'Entity Store raw extraction task runs. Compacted daily into the events stream.',
  });

export const getSystemEventsIndexTemplateConfig = (namespace: string) =>
  buildTemplate({
    name: getSystemEventsIndexTemplateId(namespace),
    indexPattern: getSystemEventsDataStreamName(namespace),
    retention: SYSTEM_EVENTS_DATA_RETENTION,
    description:
      'Entity Store history snapshot and maintainer runs, lifecycle events and daily extraction summaries.',
  });
