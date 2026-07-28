/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IndicesUpdateAliasesAddAction } from '@elastic/elasticsearch/lib/api/types';
import type { Scenario } from './types';
import {
  DISCOVERIES_DATA_STREAM,
  DETECTIONS_DATA_STREAM,
  KNOWLEDGE_INDICATORS_DATA_STREAM,
} from '../../src/data_generators/snapshot_indices';

export {
  DEFAULT_LOGS_INDEX,
  DEFAULT_DEMO_APP,
  GCS_BUCKET,
  OTEL_DEMO_NAMESPACE,
  OTEL_DEMO_GCS_BASE_PATH_PREFIX,
} from '../../src/constants';

export const DEFAULT_ENV_SNAPSHOT_LOGS_INDEX = 'logs.otel';

// Wait times
export const BASELINE_WAIT_MS = 3 * 60 * 1000;
export const FAILURE_WAIT_MS = 5 * 60 * 1000;
export const KI_FEATURE_EXTRACTION_POLL_INTERVAL_MS = 10_000;
export const KI_FEATURE_EXTRACTION_TIMEOUT_MS = 15 * 60 * 1000;

// The discovery workflow runs the full detection → investigator pipeline space-wide,
// so it can take longer than feature extraction.
export const DISCOVERY_POLL_INTERVAL_MS = 10_000;
export const DISCOVERY_TIMEOUT_MS = 30 * 60 * 1000;

// Time to let data accumulate after KI feature extraction before triggering discovery,
// so the detection step has enough signal to analyze.
export const DISCOVERY_WAIT_MS = 5 * 60 * 1000;

export const HEALTHY_BASELINE_SCENARIO: Scenario = { id: 'healthy-baseline' };

// Streams that only exist when the user runs the full discovery workflow.
// Capture skips them silently when absent; restore skips them when not in the snapshot.
export const SIGEVENTS_OPTIONAL_STREAMS = [
  DISCOVERIES_DATA_STREAM,
  DETECTIONS_DATA_STREAM,
] as const;

export const SIGNIFICANT_EVENTS_DATA_STREAMS = [
  KNOWLEDGE_INDICATORS_DATA_STREAM,
  ...SIGEVENTS_OPTIONAL_STREAMS,
] as const;

export const VALID_ALERT_INDICES = ['.internal.alerts-streams.alerts-default-*'] as const;

type ValidStreamsAlertIndices = (typeof VALID_ALERT_INDICES)[number];

export type StreamsIndexAliasConfig = Pick<IndicesUpdateAliasesAddAction, 'alias' | 'is_hidden'>;

export const INDEX_ALIAS_CONFIG: Record<ValidStreamsAlertIndices, StreamsIndexAliasConfig> = {
  '.internal.alerts-streams.alerts-default-*': {
    alias: '.alerts-streams.alerts-default',
  },
};
