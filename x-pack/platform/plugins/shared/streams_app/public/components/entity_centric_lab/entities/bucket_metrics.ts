/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Per-bucket metric catalog for the grouped grid view.
 *
 * A "bucket" is one row of tiles in the Grouped grid — i.e. one
 * `EntityCategoryId` (hosts, services, databases, …) or, for Kubernetes,
 * one `(kubernetes, subType)` pair (pods, nodes, deployments, …).
 *
 * Each bucket exposes a list of metrics the user can color tiles by.
 * For example, the "Kubernetes Pods" bucket lets the user color by
 * `Phase` (categorical), `Restarts` (count), `CPU limit utilization`
 * (utilization), or `Memory limit utilization` (utilization). Numeric
 * metrics are bucketed into a severity tone via per-metric thresholds;
 * categorical metrics map each value directly to a tone.
 *
 * Because the lab dataset is opaque (no real metric backend), all
 * values are synthesised deterministically from
 *   (entity.name, metric.id, stat.id)
 * via a small polynomial hash, so the same entity always reads the
 * same value and toggling stats produces visibly different — but
 * stable — colorings.
 *
 * Lint-friendly: no bitwise ops, no `eslint-disable`, no `Math.imul`.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// ---------------------------------------------------------------------------
// Tones (the four colors a tile can take)
// ---------------------------------------------------------------------------

/**
 * Seven "tones" we color tiles with. The first three are the canonical
 * severity tones used across the entity-centric lab (good = healthy,
 * warning = at risk, danger = unhealthy) so the new metric-driven
 * coloring stays visually consistent with the previous health-only
 * coloring. `neutral` is used for unknowns, `accent` for "in progress"
 * states (Updating, Rolling out), `info` for "completed/done" states
 * (Succeeded Pods, finished jobs) where blue separates a one-shot
 * end-state from `good`'s "actively healthy".
 */
export type MetricTone = 'good' | 'warning' | 'danger' | 'neutral' | 'accent' | 'subdued' | 'info';

export const TONE_LABEL: Record<MetricTone, string> = {
  good: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.tone.good', {
    defaultMessage: 'Healthy',
  }),
  warning: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.tone.warning', {
    defaultMessage: 'At risk',
  }),
  danger: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.tone.danger', {
    defaultMessage: 'Unhealthy',
  }),
  accent: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.tone.accent', {
    defaultMessage: 'In progress',
  }),
  neutral: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.tone.neutral', {
    defaultMessage: 'Unknown',
  }),
  subdued: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.tone.subdued', {
    defaultMessage: 'Idle',
  }),
  info: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.tone.info', {
    defaultMessage: 'Completed',
  }),
};

export const toneColor = (tone: MetricTone, _euiTheme: EuiThemeComputed): string => {
  switch (tone) {
    case 'good':
      return '#88E3C3'; // green40
    case 'warning':
      return '#FCD883'; // yellow30
    case 'danger':
      return '#FFB5AD'; // red40
    case 'accent':
      return '#D1BAFC'; // purple40
    case 'neutral':
      return '#D6DDEA'; // blueGrey25
    case 'subdued':
      return '#77E5E0'; // teal40
    case 'info':
      return '#A3CBFF'; // blue40
  }
};

// ---------------------------------------------------------------------------
// Stat options
// ---------------------------------------------------------------------------

export type StatId = 'last' | 'min' | 'max' | 'avg';

export interface StatOption {
  readonly id: StatId;
  readonly label: string;
}

export const STAT_OPTIONS: readonly StatOption[] = [
  {
    id: 'last',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.stat.last', {
      defaultMessage: 'Last',
    }),
  },
  {
    id: 'min',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.stat.min', {
      defaultMessage: 'Min',
    }),
  },
  {
    id: 'max',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.stat.max', {
      defaultMessage: 'Max',
    }),
  },
  {
    id: 'avg',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.stat.avg', {
      defaultMessage: 'Average',
    }),
  },
];

export const getStatLabel = (statId: StatId): string =>
  STAT_OPTIONS.find((option) => option.id === statId)?.label ?? statId;

/**
 * Stat the renderer should actually use for a given metric. Numeric
 * metrics honor the user's stored stat preference; categorical
 * metrics (Phase, Status, Rollout, …) only make sense as "Last" —
 * averaging or min/max-ing an enum has no meaningful interpretation.
 * The persisted preference is intentionally NOT mutated so toggling
 * Color-by from a categorical back to a numeric metric restores the
 * user's previous numeric stat choice.
 */
export const effectiveStatForMetric = (metric: MetricDescriptor, statId: StatId): StatId =>
  metric.kind === 'categorical' ? 'last' : statId;

// ---------------------------------------------------------------------------
// Metric descriptors
// ---------------------------------------------------------------------------

interface CategoricalValue {
  readonly id: string;
  readonly label: string;
  readonly tone: MetricTone;
}

interface CategoricalMetric {
  readonly id: string;
  readonly label: string;
  readonly kind: 'categorical';
  /** Possible values, ordered by likelihood (first entry is the "happy path"). */
  readonly values: readonly CategoricalValue[];
}

interface NumericMetric {
  readonly id: string;
  readonly label: string;
  readonly kind: 'numeric';
  /** Unit suffix shown in the tooltip (e.g. '%', 'ms', ''). */
  readonly unit?: string;
  /** Display precision for the rendered number. Defaults to 0. */
  readonly precision?: number;
  /** Synthetic value range — every entity reads in this band. */
  readonly range: { readonly min: number; readonly max: number };
  /**
   * Thresholds bucketing the numeric value into a tone. `direction: 'asc'`
   * means "higher is worse" (utilization, restart counts, latency). The
   * unused `'desc'` slot is reserved for future "higher is better" metrics
   * (e.g. ready-replica %).
   */
  readonly thresholds: {
    readonly warn: number;
    readonly crit: number;
    readonly direction: 'asc' | 'desc';
  };
}

export type MetricDescriptor = CategoricalMetric | NumericMetric;

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

/**
 * Stable bucket key used for selection persistence and catalog lookup.
 * The Kubernetes sub-types use the lowercased label so renames in the
 * UI don't accidentally invalidate the user's saved choices.
 */
export type BucketKey = string;

export const bucketKeyFor = (category: string, subType?: string): BucketKey =>
  subType ? `${category.toLowerCase()}:${subType.toLowerCase()}` : category.toLowerCase();

/**
 * Common categorical value used by host/cluster/middleware-style
 * buckets. Defined once so the tone-to-value mapping stays consistent
 * across categories.
 */
const STATUS_VALUES_RUNNING: readonly CategoricalValue[] = [
  { id: 'running', label: 'Running', tone: 'good' },
  { id: 'degraded', label: 'Degraded', tone: 'warning' },
  { id: 'down', label: 'Down', tone: 'danger' },
  { id: 'unknown', label: 'Unknown', tone: 'neutral' },
];

/**
 * ID of the shared "Entity health" categorical metric. Prepended to
 * every bucket's catalog by {@link getBucketMetrics} so a single
 * consolidated Healthy / At risk / Unhealthy score is the default
 * "Color by" everywhere — matching the axis used by the flyout header,
 * the entity list, and the geomap donuts. Users can still switch to
 * any bucket-specific metric via the Color-by dropdown; this metric
 * is intentionally scoped as an override-able default rather than a
 * lock-in.
 */
export const ENTITY_HEALTH_METRIC_ID = 'entity-health';

const ENTITY_HEALTH_VALUES: readonly CategoricalValue[] = [
  {
    id: 'healthy',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.health.healthy', {
      defaultMessage: 'Healthy',
    }),
    tone: 'good',
  },
  {
    id: 'atRisk',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.health.atRisk', {
      defaultMessage: 'At risk',
    }),
    tone: 'warning',
  },
  {
    id: 'unhealthy',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.health.unhealthy', {
      defaultMessage: 'Unhealthy',
    }),
    tone: 'danger',
  },
  {
    id: 'unknown',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.health.unknown', {
      defaultMessage: 'Unknown',
    }),
    tone: 'neutral',
  },
];

export const ENTITY_HEALTH_METRIC: MetricDescriptor = {
  id: ENTITY_HEALTH_METRIC_ID,
  label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.entityHealth', {
    defaultMessage: 'Health',
  }),
  kind: 'categorical',
  values: ENTITY_HEALTH_VALUES,
};

/**
 * Shared "Alerts" categorical metric. Surfaced both as a Color-by option
 * in the hex map and as a dedicated table column. The three states map
 * directly to an entity's `alerts` field: active (red), clear (green),
 * and "no alert set up" (grey / no alerts configured).
 */
export const ENTITY_ALERTS_METRIC_ID = 'entity-alerts';

const ENTITY_ALERTS_VALUES: readonly CategoricalValue[] = [
  {
    id: 'active',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.alerts.active', {
      defaultMessage: 'Resources with active alerts',
    }),
    tone: 'danger',
  },
  {
    id: 'clear',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.alerts.clear', {
      defaultMessage: 'With no active alerts',
    }),
    tone: 'good',
  },
  {
    id: 'na',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.alerts.na', {
      defaultMessage: 'With no alert set up',
    }),
    tone: 'neutral',
  },
];

export const ENTITY_ALERTS_METRIC: MetricDescriptor = {
  id: ENTITY_ALERTS_METRIC_ID,
  label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.entityAlerts', {
    defaultMessage: 'Alerts',
  }),
  kind: 'categorical',
  values: ENTITY_ALERTS_VALUES,
};

const POD_PHASE_VALUES: readonly CategoricalValue[] = [
  { id: 'running', label: 'Running', tone: 'good' },
  // Succeeded = batch-job end-state; blue separates "done" from
  // "actively healthy" so a row of running pods + a few succeeded
  // ones still reads as two distinct populations.
  { id: 'succeeded', label: 'Succeeded', tone: 'info' },
  // Pending = scheduler still working; yellow groups it with the
  // other "needs attention" states without escalating to red.
  { id: 'pending', label: 'Pending', tone: 'warning' },
  { id: 'failed', label: 'Failed', tone: 'danger' },
  { id: 'unknown', label: 'Unknown', tone: 'neutral' },
];

const NODE_CONDITION_VALUES: readonly CategoricalValue[] = [
  { id: 'ready', label: 'Ready', tone: 'good' },
  { id: 'memory-pressure', label: 'Memory pressure', tone: 'warning' },
  { id: 'disk-pressure', label: 'Disk pressure', tone: 'warning' },
  { id: 'pid-pressure', label: 'PID pressure', tone: 'warning' },
  { id: 'not-ready', label: 'Not ready', tone: 'danger' },
];

const ROLLOUT_VALUES: readonly CategoricalValue[] = [
  { id: 'available', label: 'Available', tone: 'good' },
  // Rolling out = informational "new version progressing"; blue
  // (Kubernetes' canonical "Progressing" color) reads as "in motion,
  // not a problem" — matches how `kubectl get` callouts paint
  // ongoing rollouts.
  { id: 'rolling', label: 'Rolling out', tone: 'info' },
  { id: 'degraded', label: 'Degraded', tone: 'warning' },
  { id: 'unavailable', label: 'Unavailable', tone: 'danger' },
];

// ---------------------------------------------------------------------------

const HOSTS_METRICS: readonly MetricDescriptor[] = [
  {
    id: 'status',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.status', {
      defaultMessage: 'Status',
    }),
    kind: 'categorical',
    values: STATUS_VALUES_RUNNING,
  },
  {
    id: 'cpu-util',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.cpuUtil', {
      defaultMessage: 'CPU utilization',
    }),
    kind: 'numeric',
    unit: '%',
    range: { min: 5, max: 99 },
    thresholds: { warn: 70, crit: 90, direction: 'asc' },
  },
  {
    id: 'memory-util',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.memoryUtil', {
      defaultMessage: 'Memory utilization',
    }),
    kind: 'numeric',
    unit: '%',
    range: { min: 10, max: 98 },
    thresholds: { warn: 75, crit: 92, direction: 'asc' },
  },
  {
    id: 'disk-util',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.diskUtil', {
      defaultMessage: 'Disk utilization',
    }),
    kind: 'numeric',
    unit: '%',
    range: { min: 8, max: 97 },
    thresholds: { warn: 80, crit: 95, direction: 'asc' },
  },
  {
    id: 'load-1m',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.loadAvg', {
      defaultMessage: 'Load average (1m)',
    }),
    kind: 'numeric',
    precision: 2,
    range: { min: 0.1, max: 8 },
    thresholds: { warn: 2.5, crit: 5, direction: 'asc' },
  },
];

const SERVICES_METRICS: readonly MetricDescriptor[] = [
  {
    id: 'status',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.serviceHealth', {
      defaultMessage: 'Health',
    }),
    kind: 'categorical',
    values: STATUS_VALUES_RUNNING,
  },
  {
    id: 'error-rate',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.errorRate', {
      defaultMessage: 'Error rate',
    }),
    kind: 'numeric',
    unit: '%',
    precision: 2,
    range: { min: 0, max: 25 },
    thresholds: { warn: 1, crit: 5, direction: 'asc' },
  },
  {
    id: 'latency-p95',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.latencyP95', {
      defaultMessage: 'Latency p95',
    }),
    kind: 'numeric',
    unit: 'ms',
    range: { min: 12, max: 2400 },
    thresholds: { warn: 500, crit: 1200, direction: 'asc' },
  },
  {
    id: 'throughput',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.throughput', {
      defaultMessage: 'Throughput',
    }),
    kind: 'numeric',
    unit: ' rpm',
    range: { min: 1, max: 18000 },
    thresholds: { warn: 12000, crit: 16000, direction: 'asc' },
  },
];

const DATABASES_METRICS: readonly MetricDescriptor[] = [
  {
    id: 'status',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.status', {
      defaultMessage: 'Status',
    }),
    kind: 'categorical',
    values: STATUS_VALUES_RUNNING,
  },
  {
    id: 'connection-saturation',
    label: i18n.translate(
      'xpack.streams.entityCentricLab.entities.bucket.metric.connectionSaturation',
      { defaultMessage: 'Connection saturation' }
    ),
    kind: 'numeric',
    unit: '%',
    range: { min: 5, max: 99 },
    thresholds: { warn: 75, crit: 90, direction: 'asc' },
  },
  {
    id: 'query-latency',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.queryLatency', {
      defaultMessage: 'Query latency p95',
    }),
    kind: 'numeric',
    unit: 'ms',
    range: { min: 4, max: 1200 },
    thresholds: { warn: 200, crit: 600, direction: 'asc' },
  },
  {
    id: 'replication-lag',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.replicationLag', {
      defaultMessage: 'Replication lag',
    }),
    kind: 'numeric',
    unit: 's',
    range: { min: 0, max: 90 },
    thresholds: { warn: 5, crit: 30, direction: 'asc' },
  },
];

// ---------------------------------------------------------------------------
// Cloud — generic + AWS sub-type catalogs
// ---------------------------------------------------------------------------
//
// `CLOUD_METRICS` is the cross-category default (used when the entity
// list contains a single, uncategorised cloud type). The four
// `CLOUD_AWS_*` catalogs below specialise the dropdown for each AWS
// sub-type the grouped grid splits Cloud into — so EC2 cards expose
// compute-level metrics (CPU, memory, network), Lambda cards expose
// function-level metrics (invocations, error rate, duration), S3
// cards expose storage-level metrics (request rate, 4xx ratio,
// replication lag) and Region cards expose region-level aggregates
// (API success / throttling / spend) that match the EntityFlyout's
// own golden signals for the same sub-type.

const AWS_REGION_STATUS_VALUES: readonly CategoricalValue[] = [
  { id: 'ok', label: 'OK', tone: 'good' },
  { id: 'service-event', label: 'Service event', tone: 'warning' },
  { id: 'outage', label: 'Outage', tone: 'danger' },
];

const EC2_STATE_VALUES: readonly CategoricalValue[] = [
  { id: 'running', label: 'Running', tone: 'good' },
  { id: 'pending', label: 'Pending', tone: 'warning' },
  { id: 'stopping', label: 'Stopping', tone: 'warning' },
  { id: 'stopped', label: 'Stopped', tone: 'subdued' },
  { id: 'terminated', label: 'Terminated', tone: 'danger' },
];

const CLOUD_METRICS: readonly MetricDescriptor[] = [
  {
    id: 'status',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.status', {
      defaultMessage: 'Status',
    }),
    kind: 'categorical',
    values: STATUS_VALUES_RUNNING,
  },
  {
    id: 'quota-util',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.quotaUtil', {
      defaultMessage: 'Quota utilization',
    }),
    kind: 'numeric',
    unit: '%',
    range: { min: 5, max: 98 },
    thresholds: { warn: 75, crit: 90, direction: 'asc' },
  },
  {
    id: 'cost-trend',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.costTrend', {
      defaultMessage: 'Cost trend (7d)',
    }),
    kind: 'numeric',
    unit: '%',
    precision: 1,
    range: { min: -15, max: 80 },
    thresholds: { warn: 15, crit: 35, direction: 'asc' },
  },
];

const CLOUD_AWS_REGION_METRICS: readonly MetricDescriptor[] = [
  {
    id: 'region-status',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.regionStatus', {
      defaultMessage: 'AWS Health',
    }),
    kind: 'categorical',
    values: AWS_REGION_STATUS_VALUES,
  },
  {
    // Higher is better — `desc` thresholds put a hot tile at low values.
    id: 'api-success',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.apiSuccessRate', {
      defaultMessage: 'API success rate',
    }),
    kind: 'numeric',
    unit: '%',
    precision: 2,
    range: { min: 95, max: 100 },
    thresholds: { warn: 99.5, crit: 99, direction: 'desc' },
  },
  {
    id: 'throttle-rate',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.throttlingRate', {
      defaultMessage: 'Throttling rate',
    }),
    kind: 'numeric',
    unit: '%',
    precision: 2,
    range: { min: 0, max: 6 },
    thresholds: { warn: 0.5, crit: 1, direction: 'asc' },
  },
  {
    id: 'spend-mtd',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.spendMtd', {
      defaultMessage: 'Spend MTD',
    }),
    kind: 'numeric',
    unit: '$',
    range: { min: 12000, max: 30000 },
    thresholds: { warn: 21000, crit: 26000, direction: 'asc' },
  },
];

const CLOUD_AWS_EC2_METRICS: readonly MetricDescriptor[] = [
  {
    id: 'instance-state',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.instanceState', {
      defaultMessage: 'Instance state',
    }),
    kind: 'categorical',
    values: EC2_STATE_VALUES,
  },
  {
    id: 'cpu-util',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.cpuUtil', {
      defaultMessage: 'CPU utilization',
    }),
    kind: 'numeric',
    unit: '%',
    range: { min: 5, max: 99 },
    thresholds: { warn: 70, crit: 90, direction: 'asc' },
  },
  {
    id: 'memory-util',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.memoryUtil', {
      defaultMessage: 'Memory utilization',
    }),
    kind: 'numeric',
    unit: '%',
    range: { min: 10, max: 98 },
    thresholds: { warn: 75, crit: 92, direction: 'asc' },
  },
  {
    id: 'network-out',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.networkOut', {
      defaultMessage: 'Network out',
    }),
    kind: 'numeric',
    unit: ' MB/s',
    precision: 1,
    range: { min: 0.4, max: 120 },
    thresholds: { warn: 60, crit: 90, direction: 'asc' },
  },
  {
    id: 'status-checks',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.statusChecks', {
      defaultMessage: 'Status check failures',
    }),
    kind: 'numeric',
    range: { min: 0, max: 6 },
    thresholds: { warn: 1, crit: 3, direction: 'asc' },
  },
];

const CLOUD_AWS_LAMBDA_METRICS: readonly MetricDescriptor[] = [
  {
    // Lambdas don't have a meaningful "state" enum (Active vs
    // Inactive is config-only and almost always Active), so the
    // first option is the workload-shape signal customers actually
    // watch — invocations / minute.
    id: 'invocations',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.invocations', {
      defaultMessage: 'Invocations',
    }),
    kind: 'numeric',
    unit: '/min',
    range: { min: 0, max: 60000 },
    thresholds: { warn: 35000, crit: 50000, direction: 'asc' },
  },
  {
    id: 'error-rate',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.errorRate', {
      defaultMessage: 'Error rate',
    }),
    kind: 'numeric',
    unit: '%',
    precision: 2,
    range: { min: 0, max: 10 },
    thresholds: { warn: 1, crit: 5, direction: 'asc' },
  },
  {
    id: 'p99-duration',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.p99Duration', {
      defaultMessage: 'p99 duration',
    }),
    kind: 'numeric',
    unit: 'ms',
    range: { min: 40, max: 3000 },
    thresholds: { warn: 800, crit: 1500, direction: 'asc' },
  },
  {
    id: 'cold-starts',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.coldStarts', {
      defaultMessage: 'Cold-start rate',
    }),
    kind: 'numeric',
    unit: '%',
    precision: 1,
    range: { min: 0, max: 20 },
    thresholds: { warn: 4, crit: 10, direction: 'asc' },
  },
  {
    id: 'throttles',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.throttles', {
      defaultMessage: 'Throttles',
    }),
    kind: 'numeric',
    range: { min: 0, max: 60 },
    thresholds: { warn: 5, crit: 20, direction: 'asc' },
  },
  {
    id: 'concurrent-executions',
    label: i18n.translate(
      'xpack.streams.entityCentricLab.entities.bucket.metric.concurrentExecutions',
      { defaultMessage: 'Concurrent executions' }
    ),
    kind: 'numeric',
    range: { min: 0, max: 1000 },
    thresholds: { warn: 500, crit: 800, direction: 'asc' },
  },
  {
    id: 'memory-util',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.memoryUtil', {
      defaultMessage: 'Memory utilization',
    }),
    kind: 'numeric',
    unit: '%',
    range: { min: 10, max: 100 },
    thresholds: { warn: 75, crit: 90, direction: 'asc' },
  },
  {
    id: 'provisioned-concurrency-util',
    label: i18n.translate(
      'xpack.streams.entityCentricLab.entities.bucket.metric.provisionedConcurrencyUtil',
      { defaultMessage: 'Provisioned concurrency util.' }
    ),
    kind: 'numeric',
    unit: '%',
    range: { min: 0, max: 100 },
    thresholds: { warn: 85, crit: 95, direction: 'asc' },
  },
];

const CLOUD_AWS_S3_METRICS: readonly MetricDescriptor[] = [
  {
    id: 'request-rate',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.requestRate', {
      defaultMessage: 'Request rate',
    }),
    kind: 'numeric',
    unit: '/s',
    range: { min: 100, max: 6000 },
    thresholds: { warn: 3500, crit: 5000, direction: 'asc' },
  },
  {
    id: 's3-4xx',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.s3Errors4xx', {
      defaultMessage: '4xx error ratio',
    }),
    kind: 'numeric',
    unit: '%',
    precision: 2,
    range: { min: 0, max: 4 },
    thresholds: { warn: 0.5, crit: 1, direction: 'asc' },
  },
  {
    id: 's3-5xx',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.s3Errors5xx', {
      defaultMessage: '5xx error ratio',
    }),
    kind: 'numeric',
    unit: '%',
    precision: 2,
    range: { min: 0, max: 3 },
    thresholds: { warn: 0.5, crit: 1, direction: 'asc' },
  },
  {
    id: 'replication-lag',
    label: i18n.translate(
      'xpack.streams.entityCentricLab.entities.bucket.metric.s3ReplicationLag',
      { defaultMessage: 'Replication lag' }
    ),
    kind: 'numeric',
    unit: 's',
    range: { min: 0, max: 360 },
    thresholds: { warn: 60, crit: 180, direction: 'asc' },
  },
  {
    id: 'first-byte',
    label: i18n.translate(
      'xpack.streams.entityCentricLab.entities.bucket.metric.firstByteLatency',
      {
        defaultMessage: 'First-byte latency',
      }
    ),
    kind: 'numeric',
    unit: 'ms',
    range: { min: 12, max: 220 },
    thresholds: { warn: 80, crit: 140, direction: 'asc' },
  },
  {
    id: 'bucket-size',
    label: i18n.translate(
      'xpack.streams.entityCentricLab.entities.bucket.metric.bucketSize',
      { defaultMessage: 'Bucket size' }
    ),
    kind: 'numeric',
    unit: ' GB',
    range: { min: 0.1, max: 5000 },
    thresholds: { warn: 2000, crit: 4000, direction: 'asc' },
  },
  {
    id: 'object-count',
    label: i18n.translate(
      'xpack.streams.entityCentricLab.entities.bucket.metric.objectCount',
      { defaultMessage: 'Object count' }
    ),
    kind: 'numeric',
    unit: 'k',
    range: { min: 0, max: 50000 },
    thresholds: { warn: 20000, crit: 40000, direction: 'asc' },
  },
  {
    id: 'get-put-ratio',
    label: i18n.translate(
      'xpack.streams.entityCentricLab.entities.bucket.metric.getPutRatio',
      { defaultMessage: 'GET / PUT ratio' }
    ),
    kind: 'numeric',
    precision: 1,
    range: { min: 0.1, max: 500 },
    thresholds: { warn: 100, crit: 300, direction: 'asc' },
  },
];

const NETWORKING_METRICS: readonly MetricDescriptor[] = [
  {
    id: 'status',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.status', {
      defaultMessage: 'Status',
    }),
    kind: 'categorical',
    values: STATUS_VALUES_RUNNING,
  },
  {
    id: 'active-connections',
    label: i18n.translate(
      'xpack.streams.entityCentricLab.entities.bucket.metric.activeConnections',
      { defaultMessage: 'Active connections' }
    ),
    kind: 'numeric',
    range: { min: 0, max: 10000 },
    thresholds: { warn: 3000, crit: 7000, direction: 'asc' },
  },
  {
    id: 'request-rate',
    label: i18n.translate(
      'xpack.streams.entityCentricLab.entities.bucket.metric.requestRate',
      { defaultMessage: 'Request rate' }
    ),
    kind: 'numeric',
    unit: ' req/s',
    range: { min: 0, max: 50000 },
    thresholds: { warn: 20000, crit: 40000, direction: 'asc' },
  },
  {
    id: 'error-rate',
    label: i18n.translate(
      'xpack.streams.entityCentricLab.entities.bucket.metric.errorRate',
      { defaultMessage: 'Error rate' }
    ),
    kind: 'numeric',
    unit: '%',
    precision: 1,
    range: { min: 0, max: 10 },
    thresholds: { warn: 1, crit: 5, direction: 'asc' },
  },
];

const MIDDLEWARES_METRICS: readonly MetricDescriptor[] = [
  {
    id: 'status',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.status', {
      defaultMessage: 'Status',
    }),
    kind: 'categorical',
    values: STATUS_VALUES_RUNNING,
  },
  {
    id: 'queue-depth',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.queueDepth', {
      defaultMessage: 'Queue depth',
    }),
    kind: 'numeric',
    range: { min: 0, max: 12000 },
    thresholds: { warn: 1500, crit: 5000, direction: 'asc' },
  },
  {
    id: 'consumer-lag',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.consumerLag', {
      defaultMessage: 'Consumer lag',
    }),
    kind: 'numeric',
    unit: 's',
    range: { min: 0, max: 60 },
    thresholds: { warn: 5, crit: 20, direction: 'asc' },
  },
];

const LLMS_METRICS: readonly MetricDescriptor[] = [
  {
    id: 'status',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.status', {
      defaultMessage: 'Status',
    }),
    kind: 'categorical',
    values: STATUS_VALUES_RUNNING,
  },
  {
    id: 'latency-p95',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.latencyP95', {
      defaultMessage: 'Latency p95',
    }),
    kind: 'numeric',
    unit: 'ms',
    range: { min: 100, max: 8000 },
    thresholds: { warn: 1500, crit: 4000, direction: 'asc' },
  },
  {
    id: 'error-rate',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.errorRate', {
      defaultMessage: 'Error rate',
    }),
    kind: 'numeric',
    unit: '%',
    precision: 2,
    range: { min: 0, max: 30 },
    thresholds: { warn: 2, crit: 8, direction: 'asc' },
  },
  {
    id: 'token-spend',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.tokenSpend', {
      defaultMessage: 'Token spend (1h)',
    }),
    kind: 'numeric',
    unit: '$',
    precision: 2,
    range: { min: 0.1, max: 480 },
    thresholds: { warn: 80, crit: 240, direction: 'asc' },
  },
];

// ---------------------------------------------------------------------------
// Kubernetes sub-bucket catalogs
// ---------------------------------------------------------------------------

const K8S_CLUSTERS_METRICS: readonly MetricDescriptor[] = [
  {
    id: 'status',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.status', {
      defaultMessage: 'Status',
    }),
    kind: 'categorical',
    values: STATUS_VALUES_RUNNING,
  },
  {
    id: 'api-latency',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.apiLatency', {
      defaultMessage: 'API server latency',
    }),
    kind: 'numeric',
    unit: 'ms',
    range: { min: 5, max: 900 },
    thresholds: { warn: 200, crit: 500, direction: 'asc' },
  },
  {
    id: 'node-count',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.nodeCount', {
      defaultMessage: 'Node count',
    }),
    kind: 'numeric',
    range: { min: 3, max: 240 },
    thresholds: { warn: 120, crit: 200, direction: 'asc' },
  },
];

const K8S_NODES_METRICS: readonly MetricDescriptor[] = [
  {
    id: 'condition',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.nodeCondition', {
      defaultMessage: 'Condition',
    }),
    kind: 'categorical',
    values: NODE_CONDITION_VALUES,
  },
  {
    id: 'cpu-util',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.cpuUtil', {
      defaultMessage: 'CPU utilization',
    }),
    kind: 'numeric',
    unit: '%',
    range: { min: 5, max: 98 },
    thresholds: { warn: 70, crit: 90, direction: 'asc' },
  },
  {
    id: 'memory-util',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.memoryUtil', {
      defaultMessage: 'Memory utilization',
    }),
    kind: 'numeric',
    unit: '%',
    range: { min: 10, max: 97 },
    thresholds: { warn: 75, crit: 92, direction: 'asc' },
  },
  {
    id: 'pod-count',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.podCount', {
      defaultMessage: 'Pod count',
    }),
    kind: 'numeric',
    range: { min: 1, max: 200 },
    thresholds: { warn: 100, crit: 150, direction: 'asc' },
  },
];

const K8S_NAMESPACES_METRICS: readonly MetricDescriptor[] = [
  {
    id: 'cpu-usage',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.cpuUsage', {
      defaultMessage: 'CPU usage',
    }),
    kind: 'numeric',
    unit: '%',
    range: { min: 1, max: 95 },
    thresholds: { warn: 60, crit: 85, direction: 'asc' },
  },
  {
    id: 'memory-usage',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.memoryUsage', {
      defaultMessage: 'Memory usage',
    }),
    kind: 'numeric',
    unit: '%',
    range: { min: 2, max: 96 },
    thresholds: { warn: 65, crit: 88, direction: 'asc' },
  },
  {
    id: 'restarts',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.restarts', {
      defaultMessage: 'Restart count (1h)',
    }),
    kind: 'numeric',
    range: { min: 0, max: 80 },
    thresholds: { warn: 5, crit: 20, direction: 'asc' },
  },
];

const K8S_PODS_METRICS: readonly MetricDescriptor[] = [
  {
    id: 'phase',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.podPhase', {
      defaultMessage: 'Phase',
    }),
    kind: 'categorical',
    values: POD_PHASE_VALUES,
  },
  {
    id: 'restarts',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.restarts', {
      defaultMessage: 'Restart count (1h)',
    }),
    kind: 'numeric',
    range: { min: 0, max: 60 },
    thresholds: { warn: 3, crit: 10, direction: 'asc' },
  },
  {
    id: 'cpu-limit-util',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.cpuLimitUtil', {
      defaultMessage: 'CPU limit utilization',
    }),
    kind: 'numeric',
    unit: '%',
    range: { min: 1, max: 130 },
    thresholds: { warn: 75, crit: 95, direction: 'asc' },
  },
  {
    id: 'memory-limit-util',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.memoryLimitUtil', {
      defaultMessage: 'Memory limit utilization',
    }),
    kind: 'numeric',
    unit: '%',
    range: { min: 2, max: 128 },
    thresholds: { warn: 80, crit: 95, direction: 'asc' },
  },
];

const K8S_DEPLOYMENTS_METRICS: readonly MetricDescriptor[] = [
  {
    id: 'rollout',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.rollout', {
      defaultMessage: 'Rollout',
    }),
    kind: 'categorical',
    values: ROLLOUT_VALUES,
  },
  {
    id: 'available-replicas',
    label: i18n.translate(
      'xpack.streams.entityCentricLab.entities.bucket.metric.availableReplicas',
      { defaultMessage: 'Available replicas' }
    ),
    kind: 'numeric',
    unit: '%',
    range: { min: 0, max: 100 },
    thresholds: { warn: 80, crit: 50, direction: 'desc' },
  },
  {
    id: 'restarts',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.restarts', {
      defaultMessage: 'Restart count (1h)',
    }),
    kind: 'numeric',
    range: { min: 0, max: 40 },
    thresholds: { warn: 3, crit: 10, direction: 'asc' },
  },
];

const K8S_CONTAINERS_METRICS: readonly MetricDescriptor[] = [
  {
    id: 'status',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.status', {
      defaultMessage: 'Status',
    }),
    kind: 'categorical',
    values: STATUS_VALUES_RUNNING,
  },
  {
    id: 'restarts',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.restarts', {
      defaultMessage: 'Restart count (1h)',
    }),
    kind: 'numeric',
    range: { min: 0, max: 80 },
    thresholds: { warn: 5, crit: 15, direction: 'asc' },
  },
  {
    id: 'cpu-usage',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.cpuUsage', {
      defaultMessage: 'CPU usage',
    }),
    kind: 'numeric',
    unit: '%',
    range: { min: 0, max: 120 },
    thresholds: { warn: 75, crit: 95, direction: 'asc' },
  },
  {
    id: 'memory-usage',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.memoryUsage', {
      defaultMessage: 'Memory usage',
    }),
    kind: 'numeric',
    unit: '%',
    range: { min: 0, max: 120 },
    thresholds: { warn: 80, crit: 95, direction: 'asc' },
  },
];

/**
 * Per-bucket metric catalogs. Keys follow {@link bucketKeyFor}'s
 * `category[:subType]` shape, both lowercased — so the AWS sub-types
 * land at `cloud:aws region` / `cloud:aws ec2 instance` /
 * `cloud:aws lambda function` / `cloud:aws s3 bucket` and the
 * Kubernetes sub-types at `kubernetes:<sub>`. Any sub-bucket without
 * an explicit entry falls back to its category's catalog via
 * {@link getBucketMetrics} (so Hosts/Bare-metal and Hosts/VM share
 * `HOSTS_METRICS`, etc.).
 */
const CATALOG: Readonly<Record<BucketKey, readonly MetricDescriptor[]>> = {
  hosts: HOSTS_METRICS,
  services: SERVICES_METRICS,
  databases: DATABASES_METRICS,
  cloud: CLOUD_METRICS,
  networking: NETWORKING_METRICS,
  middlewares: MIDDLEWARES_METRICS,
  llms: LLMS_METRICS,
  // Cloud sub-types — distinct resources (region / compute / function
  // / storage) so each gets its own metric set rather than sharing
  // CLOUD_METRICS via the parent-key fallback.
  'cloud:aws region': CLOUD_AWS_REGION_METRICS,
  'cloud:aws ec2 instance': CLOUD_AWS_EC2_METRICS,
  'cloud:aws lambda function': CLOUD_AWS_LAMBDA_METRICS,
  'cloud:aws s3 bucket': CLOUD_AWS_S3_METRICS,
  // Functions category — Lambda / Azure Function / GCP Cloud Function
  // land here when grouped under the Functions nav entry instead of Cloud.
  'functions:aws lambda function': CLOUD_AWS_LAMBDA_METRICS,
  'functions:azure function': CLOUD_AWS_LAMBDA_METRICS,
  'functions:gcp cloud function': CLOUD_AWS_LAMBDA_METRICS,
  // Storage category — S3 / Blob / GCS land here when grouped under
  // the Storage nav entry instead of Cloud.
  'storage:aws s3 bucket': CLOUD_AWS_S3_METRICS,
  'storage:azure blob storage': CLOUD_AWS_S3_METRICS,
  'storage:gcp cloud storage bucket': CLOUD_AWS_S3_METRICS,
  'kubernetes:clusters': K8S_CLUSTERS_METRICS,
  'kubernetes:nodes': K8S_NODES_METRICS,
  'kubernetes:namespaces': K8S_NAMESPACES_METRICS,
  'kubernetes:pods': K8S_PODS_METRICS,
  'kubernetes:deployments': K8S_DEPLOYMENTS_METRICS,
  'kubernetes:containers': K8S_CONTAINERS_METRICS,
};

/** Fallback catalog for any bucket we haven't modeled explicitly. */
const FALLBACK_METRICS: readonly MetricDescriptor[] = [
  {
    id: 'status',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.metric.status', {
      defaultMessage: 'Status',
    }),
    kind: 'categorical',
    values: STATUS_VALUES_RUNNING,
  },
];

/**
 * Resolve the metric catalog for a bucket key. Falls back to:
 *   1. the category-level catalog when the key is a `category:subType`
 *      pair and the sub-bucket isn't modeled explicitly — so every
 *      Hosts sub-type (`hosts:bare-metal`, `hosts:vm`) and every
 *      Cloud sub-type shares the same Color-by choices as the parent
 *      category, without needing per-sub-type descriptors;
 *   2. {@link FALLBACK_METRICS} (Status only) for any key that
 *      doesn't match any catalog entry — never throws.
 *
 * Kubernetes sub-buckets keep their explicit catalogs (`kubernetes:pods`
 * etc.) so the fallback doesn't override them.
 */
/**
 * Prepend the shared {@link ENTITY_HEALTH_METRIC} and
 * {@link ENTITY_ALERTS_METRIC} so every bucket defaults to coloring by
 * the consolidated axes. Kept idempotent so a bucket that already lists
 * a metric with a reserved id doesn't render duplicate entries.
 */
const withSharedMetrics = (metrics: readonly MetricDescriptor[]): readonly MetricDescriptor[] => {
  const result: MetricDescriptor[] = [];
  if (!metrics.some((metric) => metric.id === ENTITY_HEALTH_METRIC_ID)) {
    result.push(ENTITY_HEALTH_METRIC);
  }
  if (!metrics.some((metric) => metric.id === ENTITY_ALERTS_METRIC_ID)) {
    result.push(ENTITY_ALERTS_METRIC);
  }
  result.push(...metrics);
  return result;
};

export const getBucketMetrics = (
  bucketKey: BucketKey,
  customMetricsVersion?: number
): readonly MetricDescriptor[] => {
  // `customMetricsVersion` is unused at runtime — it exists so callers
  // can list it in a useMemo dependency array to re-derive the list
  // when the user adds / edits / deletes a custom metric.
  void customMetricsVersion;

  let metrics: readonly MetricDescriptor[];
  if (CATALOG[bucketKey]) {
    metrics = withSharedMetrics(CATALOG[bucketKey]);
  } else {
    const colonIdx = bucketKey.indexOf(':');
    if (colonIdx > 0) {
      const parentKey = bucketKey.slice(0, colonIdx);
      metrics = CATALOG[parentKey]
        ? withSharedMetrics(CATALOG[parentKey])
        : withSharedMetrics(FALLBACK_METRICS);
    } else {
      metrics = withSharedMetrics(FALLBACK_METRICS);
    }
  }
  // Phase 1: remove the Health metric entirely — Alerts is the primary signal.
  // When localStorage has no entry, fall back to the registry default.
  try {
    const raw = typeof window !== 'undefined'
      ? window.localStorage.getItem('elasticOn_v_phase')
      : null;
    // Import would create a circular dep, so inline the default id.
    const phase = raw ?? 'phase1'; // must match PHASE_DIMENSION.defaultOption
    if (phase === 'phase1') {
      metrics = metrics.filter((m) => m.id !== ENTITY_HEALTH_METRIC_ID);
    }
  } catch {
    // localStorage blocked — keep all metrics
  }

  // Append user-defined custom metrics from localStorage.
  const custom = loadCustomMetrics(bucketKey);
  if (custom.length > 0) {
    return [...metrics, ...custom.map(customMetricToDescriptor)];
  }
  return metrics;
};

/**
 * Returns the default metric id for a bucket. In Phase 1 (alerts-first,
 * no health concept) the default is `entity-alerts`; Phase 3 (current)
 * uses the first metric in the catalog (typically health).
 */
export const getDefaultMetricId = (bucketKey: BucketKey): string => {
  const metrics = getBucketMetrics(bucketKey);
  try {
    const raw = typeof window !== 'undefined'
      ? window.localStorage.getItem('elasticOn_v_phase')
      : null;
    const phase = raw ?? 'phase1'; // must match PHASE_DIMENSION.defaultOption
    if (phase === 'phase1') {
      const alertsMetric = metrics.find((m) => m.id === ENTITY_ALERTS_METRIC_ID);
      if (alertsMetric) return alertsMetric.id;
    }
  } catch {
    // localStorage blocked — fall through to default
  }
  return metrics[0]?.id ?? 'status';
};

export const findMetric = (bucketKey: BucketKey, metricId: string): MetricDescriptor | undefined =>
  getBucketMetrics(bucketKey).find((metric) => metric.id === metricId);

// ---------------------------------------------------------------------------
// Custom metrics (user-defined)
// ---------------------------------------------------------------------------

export const AGGREGATION_TYPES = [
  { id: 'avg', label: 'Average' },
  { id: 'max', label: 'Max' },
  { id: 'min', label: 'Min' },
  { id: 'rate', label: 'Rate' },
  { id: 'last', label: 'Last value' },
] as const;

export type AggregationType = (typeof AGGREGATION_TYPES)[number]['id'];

export interface CustomMetricDefinition {
  readonly id: string;
  readonly aggregation: AggregationType;
  readonly field: string;
  readonly label?: string;
}

const PLAUSIBLE_FIELDS_BY_CATEGORY: Readonly<Record<string, readonly string[]>> = {
  kubernetes: [
    'k8s.node.cpu.usage',
    'k8s.node.memory.working_set',
    'k8s.node.memory.rss',
    'k8s.node.filesystem.usage',
    'k8s.node.network.io',
    'k8s.pod.cpu.usage',
    'k8s.pod.memory.working_set',
    'k8s.pod.memory.rss',
    'k8s.pod.memory_limit_utilization',
    'k8s.pod.cpu_limit_utilization',
    'k8s.pod.network.io',
    'k8s.container.restarts',
    'k8s.deployment.desired',
    'k8s.deployment.available',
    'k8s.volume.available',
    'k8s.volume.capacity',
  ],
  hosts: [
    'system.cpu.total.pct',
    'system.memory.used.pct',
    'system.memory.actual.used.bytes',
    'system.load.1',
    'system.load.5',
    'system.load.15',
    'system.filesystem.used.pct',
    'system.network.in.bytes',
    'system.network.out.bytes',
    'system.process.count',
    'system.uptime.duration.ms',
  ],
  cloud: [
    'aws.ec2.cpu.total.pct',
    'aws.ec2.network.in.bytes',
    'aws.ec2.network.out.bytes',
    'aws.ec2.diskio.read.bytes',
    'aws.ec2.diskio.write.bytes',
    'aws.lambda.duration.avg',
    'aws.lambda.invocations',
    'aws.lambda.errors',
    'aws.lambda.throttles',
    'aws.s3.bucket.size.bytes',
    'aws.s3.number_of_objects',
    'gcp.compute.cpu.utilization',
    'gcp.compute.disk.read_bytes_count',
    'gcp.compute.network.received_bytes_count',
    'azure.compute.percentage_cpu',
  ],
  databases: [
    'db.connections.active',
    'db.connections.idle',
    'db.queries.rate',
    'db.query.duration.avg',
    'db.cache.hit_ratio',
    'db.replication.lag.ms',
    'db.disk.usage.bytes',
  ],
  services: [
    'service.request.rate',
    'service.latency.p50',
    'service.latency.p95',
    'service.latency.p99',
    'service.error.rate',
    'service.throughput',
    'service.cpu.usage',
    'service.memory.heap.used',
  ],
  networking: [
    'network.connections.active',
    'network.request.rate',
    'network.response.time.avg',
    'network.bytes.in',
    'network.bytes.out',
    'network.error.rate',
    'network.ssl.handshake.duration',
  ],
  middlewares: [
    'middleware.connections.active',
    'middleware.request.rate',
    'middleware.response.time.avg',
    'middleware.queue.depth',
    'middleware.cache.hit_ratio',
    'middleware.error.rate',
  ],
};

const GENERIC_FIELDS: readonly string[] = [
  'app.request.rate',
  'app.error.count',
  'app.latency.avg',
  'app.cpu.usage',
  'app.memory.usage',
  'app.disk.usage',
];

export const getPlausibleFields = (bucketKey: BucketKey): readonly string[] => {
  const colonIdx = bucketKey.indexOf(':');
  const category = colonIdx > 0 ? bucketKey.slice(0, colonIdx) : bucketKey;
  return PLAUSIBLE_FIELDS_BY_CATEGORY[category] ?? GENERIC_FIELDS;
};

const customMetricsStorageKey = (bucketKey: BucketKey): string =>
  `elasticOn_customMetrics_${bucketKey}`;

export const loadCustomMetrics = (bucketKey: BucketKey): readonly CustomMetricDefinition[] => {
  try {
    const raw = window.localStorage.getItem(customMetricsStorageKey(bucketKey));
    if (!raw) return [];
    return JSON.parse(raw) as CustomMetricDefinition[];
  } catch {
    return [];
  }
};

export const saveCustomMetrics = (
  bucketKey: BucketKey,
  metrics: readonly CustomMetricDefinition[]
): void => {
  try {
    window.localStorage.setItem(customMetricsStorageKey(bucketKey), JSON.stringify(metrics));
  } catch {
    // localStorage full or blocked
  }
};

const aggLabel = (aggregation: AggregationType): string =>
  AGGREGATION_TYPES.find((a) => a.id === aggregation)?.label ?? aggregation;

export const customMetricDisplayLabel = (def: CustomMetricDefinition): string =>
  def.label || `${aggLabel(def.aggregation)} of ${def.field}`;

export const CUSTOM_METRIC_PREFIX = 'custom-';

export const isCustomMetricId = (metricId: string): boolean =>
  metricId.startsWith(CUSTOM_METRIC_PREFIX);

export const customMetricToDescriptor = (def: CustomMetricDefinition): MetricDescriptor => ({
  id: def.id,
  label: customMetricDisplayLabel(def),
  kind: 'numeric',
  unit: '',
  precision: 1,
  range: { min: 0, max: 100 },
  thresholds: { warn: 60, crit: 85, direction: 'asc' },
});

// ---------------------------------------------------------------------------
// Deterministic value generation
// ---------------------------------------------------------------------------

/**
 * Polynomial multiplicative hash, expressed in pure arithmetic to keep
 * `no-bitwise` happy. Same idea as the shared display-name hash —
 * deterministic per input, well-distributed enough for picking values
 * out of small ranges / catalogs. Salt the input with the metric id +
 * stat id so different (entity, metric, stat) triples produce
 * independent values (but still stable across reloads).
 */
const stableHash = (input: string): number => {
  const MOD = 0x7fffffff;
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % MOD;
  }
  return hash;
};

/**
 * Live auto-refresh salt (ElasticOn Inventory only). The readings are
 * otherwise fully deterministic per (entity, metric, stat) so reloads
 * don't shuffle colors. When the search bar's auto-refresh ticks (or the
 * user hits refresh) the caller sets a new salt via
 * {@link setMetricRefreshSalt}, which perturbs the hash so tiles visibly
 * re-roll — simulating live data. Empty salt (the default) preserves the
 * original, stable readings everywhere else.
 */
let refreshSalt = '';

export const setMetricRefreshSalt = (salt: string): void => {
  refreshSalt = salt;
};

/**
 * Normalize a hash to [0, 1) — exact enough for picking values out of a
 * small lookup table or interpolating into a numeric range.
 */
const unitHash = (entityName: string, metricId: string, statId: StatId): number =>
  stableHash(
    refreshSalt
      ? `${refreshSalt}::${metricId}::${statId}::${entityName}`
      : `${metricId}::${statId}::${entityName}`
  ) / 0x7fffffff;

const roundTo = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

/**
 * Resolved metric reading: the synthesized value, a tone bucket, and a
 * formatted display string used in the tooltip. Categorical metrics
 * carry the chosen `categoryId` so consumers can keep value-stable
 * keys (e.g. for chart legends) without parsing the label.
 */
export interface MetricReading {
  readonly tone: MetricTone;
  readonly displayValue: string;
  readonly displayLabel?: string;
  readonly categoryId?: string;
  readonly rawValue?: number;
}

const formatNumeric = (metric: NumericMetric, value: number): string => {
  const rounded = roundTo(value, metric.precision ?? 0);
  // Strip trailing `.0`/`.00` on integer-valued precision-1/2 readouts —
  // looks cleaner in the tooltip without losing the precision when the
  // value isn't round.
  const text = (metric.precision ?? 0) > 0 ? rounded.toFixed(metric.precision) : `${rounded}`;
  if (!metric.unit) return text;
  // Plain `%` / `ms` look better flush against the number; anything
  // starting with a space or letter (` rpm`, `$`) keeps its given
  // spacing.
  const unit = metric.unit;
  return `${text}${unit}`;
};

const numericTone = (metric: NumericMetric, value: number): MetricTone => {
  const { warn, crit, direction } = metric.thresholds;
  if (direction === 'asc') {
    if (value >= crit) return 'danger';
    if (value >= warn) return 'warning';
    return 'good';
  }
  // direction === 'desc' (e.g. available-replicas %: higher is better)
  if (value <= crit) return 'danger';
  if (value <= warn) return 'warning';
  return 'good';
};

/**
 * Single entry in a metric's legend. Either a categorical value
 * (one-to-one with the tone) or a numeric threshold band (range string
 * + tone). The grid renders these as small swatches under the bucket
 * controls so users can decode the tile colors at a glance.
 */
export interface LegendEntry {
  readonly tone: MetricTone;
  readonly label: string;
}

const formatThresholdNumber = (metric: NumericMetric, value: number): string => {
  // Reuse the same precision/unit rules as the per-tile tooltip so the
  // numbers in the legend read identically to the numbers users see on
  // hover — no risk of "tooltip says 90%, legend says 90.0%" mismatch.
  const precision = metric.precision ?? 0;
  const rounded = roundTo(value, precision);
  const text = precision > 0 ? rounded.toFixed(precision) : `${rounded}`;
  return metric.unit ? `${text}${metric.unit}` : text;
};

const numericLegend = (metric: NumericMetric): readonly LegendEntry[] => {
  const { warn, crit, direction } = metric.thresholds;
  const warnText = formatThresholdNumber(metric, warn);
  const critText = formatThresholdNumber(metric, crit);
  if (direction === 'asc') {
    return [
      {
        tone: 'good',
        label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.legend.below', {
          defaultMessage: '< {warn}',
          values: { warn: warnText },
        }),
      },
      {
        tone: 'warning',
        label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.legend.between', {
          defaultMessage: '{warn} – {crit}',
          values: { warn: warnText, crit: critText },
        }),
      },
      {
        tone: 'danger',
        label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.legend.atLeast', {
          defaultMessage: '≥ {crit}',
          values: { crit: critText },
        }),
      },
    ];
  }
  // direction === 'desc' (higher is better, e.g. available replicas %).
  return [
    {
      tone: 'good',
      label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.legend.above', {
        defaultMessage: '> {warn}',
        values: { warn: warnText },
      }),
    },
    {
      tone: 'warning',
      label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.legend.between', {
        defaultMessage: '{warn} – {crit}',
        values: { warn: critText, crit: warnText },
      }),
    },
    {
      tone: 'danger',
      label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.legend.atMost', {
        defaultMessage: '≤ {crit}',
        values: { crit: critText },
      }),
    },
  ];
};

/**
 * Build the legend for `metric`. Categorical metrics map one entry per
 * possible value; numeric metrics map one entry per severity band
 * (good / warning / danger).
 */
export const getMetricLegend = (metric: MetricDescriptor): readonly LegendEntry[] => {
  if (metric.kind === 'categorical') {
    return metric.values.map((value) => ({ tone: value.tone, label: value.label }));
  }
  return numericLegend(metric);
};

/**
 * Health hint for `resolveMetricReading`. Mirrors the `EntityHealth`
 * union from `fake_entities.ts` without taking a hard dependency on
 * that module so this file stays self-contained. When provided, each
 * synthesised value is biased toward the matching tone band so a
 * `healthy` entity tends to land in the good zone of every metric and
 * an `unhealthy` entity tends to land in the danger zone. The result
 * is a Grouped grid whose tile colors match the entity-list health
 * column at a glance, instead of two views telling different stories.
 */
export type EntityHealthHint = 'healthy' | 'atRisk' | 'unhealthy';

/**
 * Map an entity-health hint to a (centre, half-width) window inside
 * the [0,1] unit hash space. Window centres land in the middle of
 * each numeric tone band (good ≈ 25 %, warning ≈ 60 %, danger ≈
 * 85 %); the half-widths are intentionally generous so:
 *   - within each band the hash still spreads tiles over an
 *     interesting sub-range (sparkline-able), and
 *   - the band edges overlap a little, so a few "healthy" entities
 *     occasionally show a yellow tile and vice versa — that's
 *     realistic and prevents the grid from looking like a
 *     perfectly-sorted three-color stripe.
 * Returns `null` when no hint was supplied so the legacy
 * uniform-distribution path stays in use (call sites without an
 * entity, e.g. unit tests).
 */
const healthHintWindow = (hint?: EntityHealthHint): { centre: number; half: number } | null => {
  switch (hint) {
    case 'healthy':
      return { centre: 0.25, half: 0.3 };
    case 'atRisk':
      return { centre: 0.6, half: 0.18 };
    case 'unhealthy':
      return { centre: 0.85, half: 0.18 };
    default:
      return null;
  }
};

/**
 * Resolve the metric reading for a single tile. Falls back to a
 * neutral-toned "—" reading when the bucket has no matching metric (a
 * persisted selection survives a catalog change for an entity type the
 * user has since renamed).
 *
 * Pass `entityHealth` whenever the caller has it (`BucketTileRow` does)
 * so the synthesised value is biased toward the entity's health band.
 * Without that bias, the uniform unit hash spreads readings evenly
 * across the metric range and most numeric metrics end up dominated by
 * green tiles (warn/crit thresholds usually sit in the upper third of
 * the range). With the bias, ~25 % of tiles read red, ~30 % yellow,
 * ~45 % green — matching the entity health distribution and giving
 * the Grouped grid the variety it needs to be useful.
 */
export type EntityAlertHint = 'active' | 'clear' | 'na';

/** Derive alert hint from entity alert data. */
export const alertHintFromEntity = (
  alerts: { readonly total: number; readonly active: number } | undefined
): EntityAlertHint => {
  if (!alerts) return 'na';
  return alerts.active > 0 ? 'active' : 'clear';
};

export const resolveMetricReading = (
  entityName: string,
  metric: MetricDescriptor,
  statId: StatId,
  entityHealth?: EntityHealthHint,
  alertHint?: EntityAlertHint,
  alertActiveCount?: number
): MetricReading => {
  // Shared "Entity health" metric short-circuits the hash pipeline —
  // its whole point is to mirror the entity's canonical health exactly
  // (so a tile in the square map matches the flyout header, the entity
  // list Health column and the geomap donut for the same entity).
  // Missing hint reads as `unknown` and renders in the neutral tone.
  if (metric.id === ENTITY_HEALTH_METRIC_ID && metric.kind === 'categorical') {
    const hintId = entityHealth ?? 'unknown';
    const value =
      metric.values.find((candidate) => candidate.id === hintId) ??
      metric.values.find((candidate) => candidate.id === 'unknown') ??
      metric.values[0];
    return {
      tone: value.tone,
      displayValue: value.label,
      displayLabel: value.label,
      categoryId: value.id,
    };
  }

  // Shared "Alerts" metric mirrors the entity's alert status directly.
  // The tooltip displayValue uses the actual count for a richer label
  // (e.g. "3 active alerts") instead of the generic legend label.
  if (metric.id === ENTITY_ALERTS_METRIC_ID && metric.kind === 'categorical') {
    const hintId = alertHint ?? 'na';
    const value =
      metric.values.find((candidate) => candidate.id === hintId) ??
      metric.values.find((candidate) => candidate.id === 'na') ??
      metric.values[0];
    let tooltipLabel: string;
    if (hintId === 'na') {
      tooltipLabel = 'No alert set up';
    } else if (hintId === 'active' && alertActiveCount !== undefined) {
      tooltipLabel = `${alertActiveCount} active alert${alertActiveCount > 1 ? 's' : ''}`;
    } else if (hintId === 'clear') {
      tooltipLabel = '0 active alerts';
    } else {
      tooltipLabel = value.label;
    }
    return {
      tone: value.tone,
      displayValue: tooltipLabel,
      displayLabel: value.label,
      categoryId: value.id,
    };
  }
  const window = healthHintWindow(entityHealth);

  /**
   * Pull a hash sample into the entity's health window when a hint
   * was provided, leave it uniform otherwise. The output is still
   * deterministic per (entity, metric, stat) so reloads don't shuffle
   * the colors.
   */
  const sampleUnit = (rawHash: number): number => {
    if (!window) return rawHash;
    // Map raw hash ∈ [0,1] → [centre-half, centre+half], then clamp.
    const shifted = window.centre - window.half + rawHash * (window.half * 2);
    return Math.min(1, Math.max(0, shifted));
  };

  if (metric.kind === 'categorical') {
    const rawHash = unitHash(entityName, metric.id, statId);
    const biased = sampleUnit(rawHash);
    const idx = Math.floor(biased * metric.values.length);
    const safeIdx = Math.min(metric.values.length - 1, Math.max(0, idx));
    const value = metric.values[safeIdx];
    return {
      tone: value.tone,
      displayValue: value.label,
      displayLabel: value.label,
      categoryId: value.id,
    };
  }
  // Numeric. Different stats are simulated by shifting the unit hash
  // with a stat-specific offset: `max` reads higher than `last` than
  // `avg` than `min`, on average — so toggling between stats is
  // visibly meaningful (the relationship is monotonic per entity).
  const baseUnit = sampleUnit(unitHash(entityName, metric.id, 'last'));
  // Noise stays small (±0.07) so it can wiggle the value inside its
  // health band but rarely jumps a band on its own. Combined with the
  // overlapping band windows above this gives enough variety to look
  // organic without breaking the health correlation.
  const noise = unitHash(entityName, metric.id, statId) * 0.14 - 0.07;
  const statBias: Record<StatId, number> = {
    min: -0.18,
    avg: -0.06,
    last: 0.0,
    max: 0.18,
  };
  const shifted = baseUnit + statBias[statId] + noise;
  const clamped = Math.min(1, Math.max(0, shifted));
  const value = metric.range.min + clamped * (metric.range.max - metric.range.min);
  return {
    tone: numericTone(metric, value),
    displayValue: formatNumeric(metric, value),
    rawValue: value,
  };
};

/**
 * Number of points synthesised for a tooltip sparkline. Enough to read
 * as a trend line, few enough to stay crisp at ~120px wide.
 */
const SPARKLINE_POINTS = 18;

/**
 * Deterministic mini time-series for a numeric metric, in the metric's
 * own units, ending on the value {@link resolveMetricReading} shows for
 * the same (entity, metric, stat). Used to draw the hover-card sparkline
 * in the Grouped grid.
 *
 * Returns `null` for categorical metrics (Status, Phase, …) — a trend
 * line over an enum has no meaning, so those tooltips omit the chart.
 *
 * The walk starts from a per-entity offset (some series trend up toward
 * the current value, some down) and converges on the final value, with a
 * small per-point wobble so the line looks organic. Fully seeded from
 * `(entity, metric)` so it's stable across reloads.
 */
export const resolveMetricSparkline = (
  entityName: string,
  metric: MetricDescriptor,
  statId: StatId,
  entityHealth?: EntityHealthHint
): number[] | null => {
  if (metric.kind === 'categorical') return null;

  const window = healthHintWindow(entityHealth);
  const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));
  const sampleUnit = (rawHash: number): number => {
    if (!window) return rawHash;
    const shifted = window.centre - window.half + rawHash * (window.half * 2);
    return clampUnit(shifted);
  };

  // Reproduce resolveMetricReading's final unit so the last point of the
  // sparkline matches the number rendered next to it.
  const baseUnit = sampleUnit(unitHash(entityName, metric.id, 'last'));
  const noise = unitHash(entityName, metric.id, statId) * 0.14 - 0.07;
  const statBias: Record<StatId, number> = { min: -0.18, avg: -0.06, last: 0.0, max: 0.18 };
  const finalUnit = clampUnit(baseUnit + statBias[statId] + noise);

  // Start offset: ±0.25 around the final value, direction seeded per
  // entity, so half the fleet reads as "climbing into" its current
  // value and half as "settling down".
  const startSeed = stableHash(`spark-start::${metric.id}::${entityName}`) / 0x7fffffff;
  const startUnit = clampUnit(finalUnit + (startSeed - 0.5) * 0.5);

  const span = metric.range.max - metric.range.min;
  const series: number[] = [];
  for (let i = 0; i < SPARKLINE_POINTS; i += 1) {
    const t = i / (SPARKLINE_POINTS - 1);
    if (i === SPARKLINE_POINTS - 1) {
      series.push(metric.range.min + finalUnit * span);
      continue;
    }
    const trend = startUnit + (finalUnit - startUnit) * t;
    const wobble =
      (stableHash(`spark::${i}::${metric.id}::${entityName}`) / 0x7fffffff - 0.5) * 0.12;
    series.push(metric.range.min + clampUnit(trend + wobble) * span);
  }
  return series;
};
