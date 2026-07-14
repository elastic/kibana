/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Per-category "operational signals" mock data — active alerts,
 * breaching SLOs, and data streams with their ingest quality — shown
 * as blocks on top of the category overview tab.
 *
 * Parallel to `monitoring_assets.ts`: same shape (per-`EntityCategoryId`
 * static bundle), different concern. Kept in its own file so the
 * assets tab keeps its "installed vs. recommended" story and the
 * overview tab can grow more signal types without one file becoming a
 * catch-all.
 *
 * The `apmLink` field on alerts and SLOs is *relative* to the Kibana
 * base path (`/app/apm/services/foo/overview`, `/app/slo/foo`, …).
 * Consumers prepend the base path at render time so the same rows
 * work under any `server.basePath`.
 */

import type { EntityCategoryId } from './fake_entities';

export type SignalSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface CategoryAlertRow {
  readonly id: string;
  readonly rule: string;
  readonly severity: SignalSeverity;
  /** Human-friendly entity or scope the alert fired on (e.g. "node-042"). */
  readonly entityName: string;
  /** One-sentence reason shown in the row (kept short — no wrap). */
  readonly reason: string;
  /** Relative "triggered at" label, e.g. "12m ago". */
  readonly triggeredAt: string;
  /** Kibana path (no base-path prefix) to open in APM / SLO / Alerts. */
  readonly detailsPath: string;
}

export interface CategorySloRow {
  readonly id: string;
  readonly name: string;
  /**
   * SLO target as a human string ("99.9% availability",
   * "p95 < 500 ms") — SLO metadata is out of scope for the demo, so
   * we keep the free-form string that reads naturally in the table.
   */
  readonly objective: string;
  /**
   * Current burn rate multiple, e.g. `5` means 5× the sustainable rate
   * for the remaining error budget window.
   */
  readonly burnRateX: number;
  /**
   * Percentage of error budget still available (0–100). Colored by the
   * renderer: <10 % danger, <30 % warning, otherwise good.
   */
  readonly remainingBudgetPct: number;
  /** Short label of the service the SLO ties back to in APM. */
  readonly apmServiceName: string;
  /** Kibana path (no base-path prefix) to open the tied APM service. */
  readonly apmLink: string;
  /** Kibana path (no base-path prefix) to the SLO detail page. */
  readonly sloLink: string;
}

export type DataStreamQuality = 'good' | 'warning' | 'critical';

export interface CategoryDataStreamRow {
  readonly id: string;
  readonly name: string;
  /** Human-readable doc count (formatted at data-time so the table stays dumb). */
  readonly docCount: string;
  /** Ingest / mapping quality, colored by the renderer. */
  readonly quality: DataStreamQuality;
  /**
   * Short, actionable reason shown next to the quality pill (e.g.
   * "12 parsing errors / hour", "Nominal"). Empty for "good" streams
   * where "Nominal" would just add noise.
   */
  readonly qualityReason: string;
  /** Relative "last document received" label. */
  readonly lastUpdate: string;
  /** Kibana path to Dataset Quality for this stream. */
  readonly qualityLink: string;
}

export interface CategorySignals {
  readonly activeAlerts: readonly CategoryAlertRow[];
  readonly breachingSlos: readonly CategorySloRow[];
  readonly dataStreams: readonly CategoryDataStreamRow[];
}

const apmServicePath = (serviceName: string): string =>
  `/app/apm/services/${encodeURIComponent(serviceName)}/overview`;

const sloDetailPath = (sloId: string): string => `/app/slo/${sloId}`;

const datasetQualityPath = (dataStream: string): string =>
  `/app/management/data/data_quality?dataStream=${encodeURIComponent(dataStream)}`;

const alertDetailPath = (alertId: string): string =>
  `/app/observability/alerts?ruleId=${encodeURIComponent(alertId)}`;

/**
 * Per-category signals bundle. Static demo content — same "opaque
 * dataset" contract as the rest of the lab, meant to illustrate what
 * a per-category overview could look like once these signals wire up
 * to real backends.
 */
const CATEGORY_SIGNALS_BY_CATEGORY: Record<EntityCategoryId, CategorySignals> = {
  kubernetes: {
    activeAlerts: [
      {
        id: 'k8s-alert-1',
        rule: 'Pod restart storm',
        severity: 'critical',
        entityName: 'checkout-worker-7f8d',
        reason: '18 restarts in the last 15 minutes',
        triggeredAt: '9m ago',
        detailsPath: alertDetailPath('k8s-alert-1'),
      },
      {
        id: 'k8s-alert-2',
        rule: 'Node NotReady',
        severity: 'high',
        entityName: 'ip-10-3-42-17',
        reason: 'kubelet failed to renew lease for 3 minutes',
        triggeredAt: '21m ago',
        detailsPath: alertDetailPath('k8s-alert-2'),
      },
      {
        id: 'k8s-alert-3',
        rule: 'PersistentVolume near capacity',
        severity: 'high',
        entityName: 'pvc-payments-postgres-0',
        reason: '92% of 200 GiB used, growing at 4 GiB/day',
        triggeredAt: '38m ago',
        detailsPath: alertDetailPath('k8s-alert-3'),
      },
      {
        id: 'k8s-alert-4',
        rule: 'Deployment progressing stalled',
        severity: 'medium',
        entityName: 'ml-inference (prod)',
        reason: 'Rollout stuck at 3/5 available for 12 minutes',
        triggeredAt: '52m ago',
        detailsPath: alertDetailPath('k8s-alert-4'),
      },
    ],
    breachingSlos: [
      {
        id: 'k8s-slo-1',
        name: 'Checkout availability',
        objective: '99.9% availability, 30d window',
        burnRateX: 5.2,
        remainingBudgetPct: 8,
        apmServiceName: 'checkout',
        apmLink: apmServicePath('checkout'),
        sloLink: sloDetailPath('k8s-slo-1'),
      },
      {
        id: 'k8s-slo-2',
        name: 'Payments API latency',
        objective: '95% of requests below 300 ms',
        burnRateX: 3.1,
        remainingBudgetPct: 24,
        apmServiceName: 'payments-api',
        apmLink: apmServicePath('payments-api'),
        sloLink: sloDetailPath('k8s-slo-2'),
      },
      {
        id: 'k8s-slo-3',
        name: 'ML inference success rate',
        objective: '99.5% of predictions returned',
        burnRateX: 1.8,
        remainingBudgetPct: 41,
        apmServiceName: 'ml-inference',
        apmLink: apmServicePath('ml-inference'),
        sloLink: sloDetailPath('k8s-slo-3'),
      },
    ],
    dataStreams: [
      {
        id: 'k8s-ds-1',
        name: 'logs-kubernetes.container_logs-default',
        docCount: '128.4M',
        quality: 'good',
        qualityReason: '',
        lastUpdate: '4s ago',
        qualityLink: datasetQualityPath('logs-kubernetes.container_logs-default'),
      },
      {
        id: 'k8s-ds-2',
        name: 'metrics-kubernetes.pod-default',
        docCount: '42.1M',
        quality: 'warning',
        qualityReason: '212 parsing errors / hour',
        lastUpdate: '8s ago',
        qualityLink: datasetQualityPath('metrics-kubernetes.pod-default'),
      },
      {
        id: 'k8s-ds-3',
        name: 'metrics-kubernetes.node-default',
        docCount: '5.7M',
        quality: 'good',
        qualityReason: '',
        lastUpdate: '6s ago',
        qualityLink: datasetQualityPath('metrics-kubernetes.node-default'),
      },
      {
        id: 'k8s-ds-4',
        name: 'logs-kubernetes.audit-default',
        docCount: '3.2M',
        quality: 'critical',
        qualityReason: 'Ingest lag > 5 min',
        lastUpdate: '6m ago',
        qualityLink: datasetQualityPath('logs-kubernetes.audit-default'),
      },
      {
        id: 'k8s-ds-5',
        name: 'metrics-kubernetes.container-default',
        docCount: '31.9M',
        quality: 'good',
        qualityReason: '',
        lastUpdate: '9s ago',
        qualityLink: datasetQualityPath('metrics-kubernetes.container-default'),
      },
    ],
  },
  hosts: {
    // Healthy category — no active alerts, no breaching SLOs, ingest
    // clean. Reads as reassuring green across all three signal tiles.
    activeAlerts: [],
    breachingSlos: [],
    dataStreams: [
      {
        id: 'host-ds-1',
        name: 'metrics-system.cpu-default',
        docCount: '91.5M',
        quality: 'good',
        qualityReason: '',
        lastUpdate: '5s ago',
        qualityLink: datasetQualityPath('metrics-system.cpu-default'),
      },
      {
        id: 'host-ds-2',
        name: 'metrics-system.filesystem-default',
        docCount: '18.7M',
        quality: 'good',
        qualityReason: '',
        lastUpdate: '7s ago',
        qualityLink: datasetQualityPath('metrics-system.filesystem-default'),
      },
      {
        id: 'host-ds-3',
        name: 'logs-system.syslog-default',
        docCount: '54.3M',
        quality: 'good',
        qualityReason: '',
        lastUpdate: '3s ago',
        qualityLink: datasetQualityPath('logs-system.syslog-default'),
      },
    ],
  },
  databases: {
    // Warm category — one medium alert + one warning-quality stream,
    // no breaching SLOs. Reads amber on alerts + streams, green on SLOs.
    activeAlerts: [
      {
        id: 'db-alert-3',
        rule: 'Slow query threshold exceeded',
        severity: 'medium',
        entityName: 'reporting-clickhouse',
        reason: '38 queries > 10s in last 5 minutes',
        triggeredAt: '42m ago',
        detailsPath: alertDetailPath('db-alert-3'),
      },
    ],
    breachingSlos: [],
    dataStreams: [
      {
        id: 'db-ds-1',
        name: 'metrics-postgresql.database-default',
        docCount: '4.9M',
        quality: 'good',
        qualityReason: '',
        lastUpdate: '11s ago',
        qualityLink: datasetQualityPath('metrics-postgresql.database-default'),
      },
      {
        id: 'db-ds-2',
        name: 'logs-postgresql.log-default',
        docCount: '22.6M',
        quality: 'warning',
        qualityReason: 'Rate limited: 1.2K docs dropped / 5m',
        lastUpdate: '18s ago',
        qualityLink: datasetQualityPath('logs-postgresql.log-default'),
      },
    ],
  },
  services: {
    // Warm category — one medium alert + one low-burn SLO, ingest
    // clean. Amber on alerts + SLOs, green on streams.
    activeAlerts: [
      {
        id: 'svc-alert-3',
        rule: 'Dependency failing',
        severity: 'medium',
        entityName: 'ml-inference → feature-store',
        reason: 'Downstream feature-store returning 5xx',
        triggeredAt: '25m ago',
        detailsPath: alertDetailPath('svc-alert-3'),
      },
    ],
    breachingSlos: [
      {
        id: 'svc-slo-3',
        name: 'Search relevance freshness',
        objective: 'Index rebuild lag under 10 min, 99%',
        burnRateX: 1.6,
        remainingBudgetPct: 48,
        apmServiceName: 'search-api',
        apmLink: apmServicePath('search-api'),
        sloLink: sloDetailPath('svc-slo-3'),
      },
    ],
    dataStreams: [
      {
        id: 'svc-ds-1',
        name: 'traces-apm-default',
        docCount: '312.8M',
        quality: 'good',
        qualityReason: '',
        lastUpdate: '1s ago',
        qualityLink: datasetQualityPath('traces-apm-default'),
      },
      {
        id: 'svc-ds-2',
        name: 'metrics-apm.service_transaction-default',
        docCount: '87.4M',
        quality: 'good',
        qualityReason: '',
        lastUpdate: '3s ago',
        qualityLink: datasetQualityPath('metrics-apm.service_transaction-default'),
      },
      {
        id: 'svc-ds-3',
        name: 'logs-apm.error-default',
        docCount: '6.1M',
        quality: 'good',
        qualityReason: '',
        lastUpdate: '4s ago',
        qualityLink: datasetQualityPath('logs-apm.error-default'),
      },
    ],
  },
  cloud: {
    // Healthy category — nothing raising alarms.
    activeAlerts: [],
    breachingSlos: [],
    dataStreams: [
      {
        id: 'cloud-ds-1',
        name: 'metrics-aws.ec2-default',
        docCount: '24.1M',
        quality: 'good',
        qualityReason: '',
        lastUpdate: '10s ago',
        qualityLink: datasetQualityPath('metrics-aws.ec2-default'),
      },
      {
        id: 'cloud-ds-2',
        name: 'metrics-aws.lambda-default',
        docCount: '11.4M',
        quality: 'good',
        qualityReason: '',
        lastUpdate: '12s ago',
        qualityLink: datasetQualityPath('metrics-aws.lambda-default'),
      },
      {
        id: 'cloud-ds-3',
        name: 'metrics-aws.s3-default',
        docCount: '3.8M',
        quality: 'good',
        qualityReason: '',
        lastUpdate: '14s ago',
        qualityLink: datasetQualityPath('metrics-aws.s3-default'),
      },
    ],
  },
  middlewares: {
    // Healthy category — Kafka humming along.
    activeAlerts: [],
    breachingSlos: [],
    dataStreams: [
      {
        id: 'mw-ds-1',
        name: 'metrics-kafka.broker-default',
        docCount: '9.4M',
        quality: 'good',
        qualityReason: '',
        lastUpdate: '6s ago',
        qualityLink: datasetQualityPath('metrics-kafka.broker-default'),
      },
      {
        id: 'mw-ds-2',
        name: 'metrics-kafka.consumergroup-default',
        docCount: '2.1M',
        quality: 'good',
        qualityReason: '',
        lastUpdate: '8s ago',
        qualityLink: datasetQualityPath('metrics-kafka.consumergroup-default'),
      },
    ],
  },
  llms: {
    // Healthy category — GenAI stack behaving.
    activeAlerts: [],
    breachingSlos: [],
    dataStreams: [
      {
        id: 'llm-ds-1',
        name: 'logs-genai.completions-default',
        docCount: '3.9M',
        quality: 'good',
        qualityReason: '',
        lastUpdate: '2s ago',
        qualityLink: datasetQualityPath('logs-genai.completions-default'),
      },
      {
        id: 'llm-ds-2',
        name: 'metrics-genai.token_usage-default',
        docCount: '4.4M',
        quality: 'good',
        qualityReason: '',
        lastUpdate: '3s ago',
        qualityLink: datasetQualityPath('metrics-genai.token_usage-default'),
      },
    ],
  },
  other: {
    activeAlerts: [
      {
        id: 'other-alert-1',
        rule: 'Health check failing',
        severity: 'medium',
        entityName: 'custom-worker-01',
        reason: '3 consecutive health probe failures',
        triggeredAt: '18m ago',
        detailsPath: alertDetailPath('other-alert-1'),
      },
    ],
    breachingSlos: [
      {
        id: 'other-slo-1',
        name: 'Custom worker availability',
        objective: '99% healthy heartbeats',
        burnRateX: 1.5,
        remainingBudgetPct: 44,
        apmServiceName: 'custom-worker',
        apmLink: apmServicePath('custom-worker'),
        sloLink: sloDetailPath('other-slo-1'),
      },
    ],
    dataStreams: [
      {
        id: 'other-ds-1',
        name: 'logs-custom-default',
        docCount: '1.2M',
        quality: 'good',
        qualityReason: '',
        lastUpdate: '15s ago',
        qualityLink: datasetQualityPath('logs-custom-default'),
      },
    ],
  },
};

/**
 * Look up the operational signals bundle for a category. Always
 * returns a bundle so the overview renderer can rely on an object
 * rather than special-casing `undefined`.
 */
export const getCategorySignals = (category: EntityCategoryId): CategorySignals =>
  CATEGORY_SIGNALS_BY_CATEGORY[category];
