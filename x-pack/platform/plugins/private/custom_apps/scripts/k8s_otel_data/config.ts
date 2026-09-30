/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The seed writes to its own data stream namespace rather than `default`, which is
 * where a real EDOT collector lands. That keeps `--clean` from ever deleting
 * somebody's actual telemetry, and still matches `metrics-*` index patterns.
 */
export const DEFAULT_NAMESPACE = 'k8sdemo';

export const KUBELET_DATASET = 'kubeletstatsreceiver.otel';
export const CLUSTER_DATASET = 'k8sclusterreceiver.otel';
export const LOGS_DATASET = 'k8s.otel';

export const metricsIndex = (dataset: string, namespace: string) =>
  `metrics-${dataset}-${namespace}`;
export const logsIndex = (namespace: string) => `logs-${LOGS_DATASET}-${namespace}`;
export const metricsTemplateName = (namespace: string) => `metrics-otel-${namespace}@template`;
export const alertIndexName = (namespace: string) => `${namespace}_alert_status`;

/**
 * Composed from the templates the Elasticsearch `otel-data` module installs, so the
 * generated documents are mapped exactly like real collector output: `k8s.pod.name`
 * and `resource.attributes.k8s.pod.name` resolve to the same field via passthrough.
 */
export const OTEL_COMPONENT_TEMPLATES = [
  'metrics@tsdb-settings',
  'otel@mappings',
  'otel@settings',
  'metrics-otel@mappings',
  'semconv-resource-to-ecs@mappings',
  'ecs-tsdb@mappings',
] as const;

/** The last two ship separately and are not required for the seed to be usable. */
export const OPTIONAL_COMPONENT_TEMPLATES = [
  'semconv-resource-to-ecs@mappings',
  'ecs-tsdb@mappings',
] as const;

/**
 * Elasticsearch rejects a document older than `index.look_back_time` before the data
 * stream was created, and the setting itself is capped at 7d. This is therefore the
 * hard ceiling on `--lookback`.
 */
export const MAX_LOOK_BACK = '7d';

export const SCHEMA_URL = 'https://opentelemetry.io/schemas/1.30.0';
export const COLLECTOR_VERSION = 'v0.120.0';

export interface Profile {
  lookback: string;
  interval: string;
}

export const PROFILES: Record<string, Profile> = {
  quick: { lookback: '2h', interval: '1m' },
  default: { lookback: '24h', interval: '5m' },
  deep: { lookback: '7d', interval: '30m' },
};

export const DEFAULTS = {
  profile: 'default',
  clusters: 2,
  pods: '540,531',
  nodes: '40,38',
  seed: 42,
  unhealthy: 12,
  logsPerMinute: 25,
  batchSize: 2000,
  concurrency: 4,
};
