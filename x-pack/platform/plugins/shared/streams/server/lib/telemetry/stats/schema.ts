/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { StreamsStatsTelemetry } from './types';

/**
 * Schema definition for Streams usage statistics telemetry
 * Includes metadata descriptions for each field explaining calculation and meaning
 */
export const streamsStatsSchema: MakeSchemaFrom<StreamsStatsTelemetry> = {
  classic_streams: {
    changed_count: {
      type: 'long',
      _meta: {
        description:
          'Number of classic streams that have been modified from their default configuration. Calculated by counting streams stored in .kibana_streams index, as presence indicates customization from unmanaged defaults.',
      },
    },
    with_processing_count: {
      type: 'long',
      _meta: {
        description:
          'Number of classic streams with custom processing steps configured. Calculated by counting streams with non-empty ingest.processing.steps arrays.',
      },
    },
    with_fields_count: {
      type: 'long',
      _meta: {
        description:
          'Number of classic streams with custom field overrides configured. Calculated by counting streams with non-empty ingest.classic.field_overrides objects.',
      },
    },
    with_changed_retention_count: {
      type: 'long',
      _meta: {
        description:
          'Number of classic streams with custom retention settings (DSL or ILM). Calculated by counting streams with lifecycle containing "dsl" property (includes both custom periods and "Forever" retention).',
      },
    },
  },
  wired_streams: {
    count: {
      type: 'long',
      _meta: {
        description:
          'Total number of wired streams in the system. Calculated by counting streams that match WiredStream schema and are not GroupStreams.',
      },
    },
  },
  significant_events: {
    rules_count: {
      type: 'long',
      _meta: {
        description:
          'Total number of significant event detection rules configured. Calculated by querying .kibana* index for alert documents with alertTypeId="streams.rules.esql".',
      },
    },
    stored_count: {
      type: 'long',
      _meta: {
        description:
          'Total number of significant events detected and stored. Calculated by querying .alerts-streams.alerts-default index for alerts with kibana.alert.rule.category matching significant event rule types.',
      },
    },
    unique_wired_streams_count: {
      type: 'long',
      _meta: {
        description:
          'Number of unique wired streams that have significant events detected. Calculated by aggregating unique stream names from alert rule tags and filtering by stream type.',
      },
    },
    unique_classic_streams_count: {
      type: 'long',
      _meta: {
        description:
          'Number of unique classic streams that have significant events detected. Calculated by aggregating unique stream names from alert rule tags and filtering by stream type.',
      },
    },
    rule_execution_ms_avg_24h: {
      type: 'float',
      _meta: {
        description:
          'Average execution time in milliseconds for significant event rules in the last 24 hours. Calculated from event.duration field in .kibana-event-log-* indices, converted from nanoseconds to milliseconds and rounded to 3 decimal places.',
      },
    },
    rule_execution_ms_p95_24h: {
      type: 'float',
      _meta: {
        description:
          '95th percentile execution time in milliseconds for significant event rules in the last 24 hours. Calculated from event.duration field in .kibana-event-log-* indices using percentile calculation, converted from nanoseconds to milliseconds and rounded to 3 decimal places.',
      },
    },
    executions_count_24h: {
      type: 'long',
      _meta: {
        description:
          'Total number of rule executions in the last 24 hours. Calculated by counting documents in .kibana-event-log-* indices with event.action="execute" and rule.id matching significant event rules.',
      },
    },
  },
};
