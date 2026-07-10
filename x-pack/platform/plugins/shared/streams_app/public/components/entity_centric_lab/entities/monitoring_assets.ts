/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityCategoryId } from './fake_entities';

/**
 * The kinds of monitoring assets an integration can ship. Each maps to a
 * curated icon + label so the Monitoring assets tab can render a consistent
 * badge next to every installed / recommended asset regardless of which
 * integration contributed it.
 */
export type MonitoringAssetType =
  | 'dashboard'
  | 'alertRule'
  | 'slo'
  | 'mlJob'
  | 'skill'
  | 'savedSearch';

export interface MonitoringAssetTypeDescriptor {
  readonly label: string;
  readonly icon: string;
}

/**
 * Display metadata for each asset type. Icons are EUI glyph / app icon
 * names so they resolve without extra imports.
 */
export const MONITORING_ASSET_TYPES: Record<MonitoringAssetType, MonitoringAssetTypeDescriptor> = {
  dashboard: { label: 'Dashboard', icon: 'dashboardApp' },
  alertRule: { label: 'Alert rule', icon: 'bell' },
  slo: { label: 'SLO', icon: 'visGauge' },
  mlJob: { label: 'ML job', icon: 'machineLearningApp' },
  skill: { label: 'Skill', icon: 'sparkles' },
  savedSearch: { label: 'Saved query', icon: 'discoverApp' },
};

export interface InstalledAsset {
  readonly id: string;
  readonly name: string;
  readonly type: MonitoringAssetType;
  /** Integration package that installed the asset (e.g. "Kubernetes"). */
  readonly integration: string;
  /** Relative "last updated" label, e.g. "2d ago". */
  readonly updatedAt: string;
}

export interface RecommendedAsset {
  readonly id: string;
  readonly name: string;
  readonly type: MonitoringAssetType;
  /** Integration that would provide the asset once installed. */
  readonly integration: string;
  readonly description: string;
}

export interface CategoryMonitoringAssets {
  /**
   * The integration these assets are curated from. Drives the tab's
   * "From the {integration} integration" framing — recommendations are
   * scoped to whatever integration owns this entity category.
   */
  readonly integration: string;
  readonly installed: readonly InstalledAsset[];
  readonly recommended: readonly RecommendedAsset[];
}

/**
 * Static, per-integration monitoring assets. Keyed by the entity
 * category so the Monitoring assets tab can look up the right bundle for
 * whichever category page it's mounted under. This is demo data — parallel
 * to `fake_entities.ts` — meant to illustrate the "assets already
 * installed vs. what else you could be tracking, based on the integration"
 * story, not to reflect a real integration catalog.
 */
const MONITORING_ASSETS_BY_CATEGORY: Record<EntityCategoryId, CategoryMonitoringAssets> = {
  kubernetes: {
    integration: 'Kubernetes',
    installed: [
      {
        id: 'k8s-inst-1',
        name: 'Kubernetes cluster overview',
        type: 'dashboard',
        integration: 'Kubernetes',
        updatedAt: '2d ago',
      },
      {
        id: 'k8s-inst-2',
        name: 'Pod resource usage',
        type: 'dashboard',
        integration: 'Kubernetes',
        updatedAt: '5d ago',
      },
      {
        id: 'k8s-inst-3',
        name: 'Kubernetes pod restarts',
        type: 'alertRule',
        integration: 'Kubernetes',
        updatedAt: '3d ago',
      },
      {
        id: 'k8s-inst-4',
        name: 'Node resource saturation',
        type: 'alertRule',
        integration: 'Kubernetes',
        updatedAt: '3d ago',
      },
      {
        id: 'k8s-inst-5',
        name: 'Control plane API availability',
        type: 'slo',
        integration: 'Kubernetes',
        updatedAt: '1w ago',
      },
    ],
    recommended: [
      {
        id: 'k8s-rec-1',
        name: 'Workload availability SLO',
        type: 'slo',
        integration: 'Kubernetes',
        description: 'Track the percentage of deployments meeting their desired replica count.',
      },
      {
        id: 'k8s-rec-2',
        name: 'Pod restart anomaly detection',
        type: 'mlJob',
        integration: 'Kubernetes',
        description: 'Spot unusual restart spikes across namespaces before they page you.',
      },
      {
        id: 'k8s-rec-3',
        name: 'Persistent volume capacity',
        type: 'alertRule',
        integration: 'Kubernetes',
        description: 'Alert when a PersistentVolumeClaim is about to run out of space.',
      },
      {
        id: 'k8s-rec-4',
        name: 'Namespace cost & usage',
        type: 'dashboard',
        integration: 'Kubernetes',
        description: 'Break down CPU and memory requests vs. usage by namespace.',
      },
      {
        id: 'k8s-rec-5',
        name: 'Diagnose failing pods',
        type: 'skill',
        integration: 'Kubernetes',
        description: 'AI Assistant skill that correlates pod events, logs and metrics on demand.',
      },
    ],
  },
  hosts: {
    integration: 'System',
    installed: [
      {
        id: 'host-inst-1',
        name: 'Host overview',
        type: 'dashboard',
        integration: 'System',
        updatedAt: '1d ago',
      },
      {
        id: 'host-inst-2',
        name: 'Host CPU usage',
        type: 'alertRule',
        integration: 'System',
        updatedAt: '4d ago',
      },
      {
        id: 'host-inst-3',
        name: 'Host disk usage',
        type: 'alertRule',
        integration: 'System',
        updatedAt: '4d ago',
      },
    ],
    recommended: [
      {
        id: 'host-rec-1',
        name: 'Network throughput dashboard',
        type: 'dashboard',
        integration: 'System',
        description: 'Inbound / outbound traffic and packet loss per host.',
      },
      {
        id: 'host-rec-2',
        name: 'Memory saturation alert',
        type: 'alertRule',
        integration: 'System',
        description: 'Page when available memory drops below a safe threshold.',
      },
      {
        id: 'host-rec-3',
        name: 'Host availability SLO',
        type: 'slo',
        integration: 'System',
        description: 'Track uptime across your fleet with a single error budget.',
      },
      {
        id: 'host-rec-4',
        name: 'CPU anomaly detection',
        type: 'mlJob',
        integration: 'System',
        description: 'Learn each host\u2019s baseline and flag unusual CPU behavior.',
      },
      {
        id: 'host-rec-5',
        name: 'Investigate host saturation',
        type: 'skill',
        integration: 'System',
        description: 'AI Assistant skill that pinpoints the process behind a resource spike.',
      },
    ],
  },
  databases: {
    integration: 'Database',
    installed: [
      {
        id: 'db-inst-1',
        name: 'Database performance overview',
        type: 'dashboard',
        integration: 'Database',
        updatedAt: '3d ago',
      },
      {
        id: 'db-inst-2',
        name: 'Slow query monitor',
        type: 'alertRule',
        integration: 'Database',
        updatedAt: '6d ago',
      },
      {
        id: 'db-inst-3',
        name: 'Connection pool saturation',
        type: 'alertRule',
        integration: 'Database',
        updatedAt: '6d ago',
      },
    ],
    recommended: [
      {
        id: 'db-rec-1',
        name: 'Query latency SLO',
        type: 'slo',
        integration: 'Database',
        description: 'Guarantee p95 query latency stays under your target.',
      },
      {
        id: 'db-rec-2',
        name: 'Replication lag alert',
        type: 'alertRule',
        integration: 'Database',
        description: 'Get notified before a lagging replica breaks failover.',
      },
      {
        id: 'db-rec-3',
        name: 'Deadlock trend dashboard',
        type: 'dashboard',
        integration: 'Database',
        description: 'Visualize deadlocks and lock waits over time.',
      },
      {
        id: 'db-rec-4',
        name: 'Query volume anomaly detection',
        type: 'mlJob',
        integration: 'Database',
        description: 'Detect unusual read / write patterns automatically.',
      },
      {
        id: 'db-rec-5',
        name: 'Explain a slow query',
        type: 'skill',
        integration: 'Database',
        description: 'AI Assistant skill that analyzes and suggests fixes for slow queries.',
      },
    ],
  },
  services: {
    integration: 'APM',
    installed: [
      {
        id: 'svc-inst-1',
        name: 'Service overview',
        type: 'dashboard',
        integration: 'APM',
        updatedAt: '1d ago',
      },
      {
        id: 'svc-inst-2',
        name: 'APM error rate',
        type: 'alertRule',
        integration: 'APM',
        updatedAt: '2d ago',
      },
      {
        id: 'svc-inst-3',
        name: 'APM latency',
        type: 'alertRule',
        integration: 'APM',
        updatedAt: '2d ago',
      },
      {
        id: 'svc-inst-4',
        name: 'Availability SLO',
        type: 'slo',
        integration: 'APM',
        updatedAt: '1w ago',
      },
    ],
    recommended: [
      {
        id: 'svc-rec-1',
        name: 'Latency SLO',
        type: 'slo',
        integration: 'APM',
        description: 'Keep p95 transaction latency within your target budget.',
      },
      {
        id: 'svc-rec-2',
        name: 'Dependency failure alert',
        type: 'alertRule',
        integration: 'APM',
        description: 'Alert when a downstream dependency starts failing.',
      },
      {
        id: 'svc-rec-3',
        name: 'Throughput anomaly detection',
        type: 'mlJob',
        integration: 'APM',
        description: 'Learn normal request volume and flag sudden drops or spikes.',
      },
      {
        id: 'svc-rec-4',
        name: 'Service dependency map',
        type: 'dashboard',
        integration: 'APM',
        description: 'Trace how requests flow across your services.',
      },
      {
        id: 'svc-rec-5',
        name: 'Root-cause a latency spike',
        type: 'skill',
        integration: 'APM',
        description: 'AI Assistant skill that walks the trace to the slowest span.',
      },
    ],
  },
  cloud: {
    integration: 'AWS',
    installed: [
      {
        id: 'cloud-inst-1',
        name: 'AWS account overview',
        type: 'dashboard',
        integration: 'AWS',
        updatedAt: '2d ago',
      },
      {
        id: 'cloud-inst-2',
        name: 'EC2 instance health',
        type: 'dashboard',
        integration: 'AWS',
        updatedAt: '5d ago',
      },
      {
        id: 'cloud-inst-3',
        name: 'Lambda error rate',
        type: 'alertRule',
        integration: 'AWS',
        updatedAt: '4d ago',
      },
    ],
    recommended: [
      {
        id: 'cloud-rec-1',
        name: 'S3 request errors alert',
        type: 'alertRule',
        integration: 'AWS',
        description: 'Catch spikes in 4xx / 5xx responses on your buckets.',
      },
      {
        id: 'cloud-rec-2',
        name: 'Cost & usage dashboard',
        type: 'dashboard',
        integration: 'AWS',
        description: 'Track spend by service and region in one place.',
      },
      {
        id: 'cloud-rec-3',
        name: 'Lambda availability SLO',
        type: 'slo',
        integration: 'AWS',
        description: 'Set an error budget for your serverless functions.',
      },
      {
        id: 'cloud-rec-4',
        name: 'Billing anomaly detection',
        type: 'mlJob',
        integration: 'AWS',
        description: 'Get alerted on unexpected cost increases automatically.',
      },
      {
        id: 'cloud-rec-5',
        name: 'Explain a throttling event',
        type: 'skill',
        integration: 'AWS',
        description: 'AI Assistant skill that traces throttles back to a concurrency limit.',
      },
    ],
  },
  middlewares: {
    integration: 'Kafka',
    installed: [
      {
        id: 'mw-inst-1',
        name: 'Kafka broker overview',
        type: 'dashboard',
        integration: 'Kafka',
        updatedAt: '3d ago',
      },
      {
        id: 'mw-inst-2',
        name: 'Consumer lag monitor',
        type: 'alertRule',
        integration: 'Kafka',
        updatedAt: '5d ago',
      },
    ],
    recommended: [
      {
        id: 'mw-rec-1',
        name: 'Partition under-replication alert',
        type: 'alertRule',
        integration: 'Kafka',
        description: 'Alert when partitions fall below their replication factor.',
      },
      {
        id: 'mw-rec-2',
        name: 'Throughput dashboard',
        type: 'dashboard',
        integration: 'Kafka',
        description: 'Messages in / out per topic and broker.',
      },
      {
        id: 'mw-rec-3',
        name: 'End-to-end delivery SLO',
        type: 'slo',
        integration: 'Kafka',
        description: 'Track the share of messages delivered within your latency target.',
      },
      {
        id: 'mw-rec-4',
        name: 'Consumer lag anomaly detection',
        type: 'mlJob',
        integration: 'Kafka',
        description: 'Learn normal lag patterns and flag runaway consumers.',
      },
      {
        id: 'mw-rec-5',
        name: 'Diagnose consumer lag',
        type: 'skill',
        integration: 'Kafka',
        description: 'AI Assistant skill that correlates lag with broker and consumer health.',
      },
    ],
  },
  llms: {
    integration: 'LLM Observability',
    installed: [
      {
        id: 'llm-inst-1',
        name: 'LLM usage overview',
        type: 'dashboard',
        integration: 'LLM Observability',
        updatedAt: '2d ago',
      },
      {
        id: 'llm-inst-2',
        name: 'Token cost monitor',
        type: 'alertRule',
        integration: 'LLM Observability',
        updatedAt: '3d ago',
      },
    ],
    recommended: [
      {
        id: 'llm-rec-1',
        name: 'Latency per model dashboard',
        type: 'dashboard',
        integration: 'LLM Observability',
        description: 'Compare response times across models and providers.',
      },
      {
        id: 'llm-rec-2',
        name: 'Error rate alert',
        type: 'alertRule',
        integration: 'LLM Observability',
        description: 'Alert on rising completion failures or rate-limit errors.',
      },
      {
        id: 'llm-rec-3',
        name: 'Response quality SLO',
        type: 'slo',
        integration: 'LLM Observability',
        description: 'Track the share of responses passing your evaluation checks.',
      },
      {
        id: 'llm-rec-4',
        name: 'Cost anomaly detection',
        type: 'mlJob',
        integration: 'LLM Observability',
        description: 'Automatically flag unusual token spend by application.',
      },
      {
        id: 'llm-rec-5',
        name: 'Investigate a cost spike',
        type: 'skill',
        integration: 'LLM Observability',
        description: 'AI Assistant skill that attributes spend to prompts and callers.',
      },
    ],
  },
  other: {
    integration: 'Custom',
    installed: [
      {
        id: 'other-inst-1',
        name: 'Custom overview',
        type: 'dashboard',
        integration: 'Custom',
        updatedAt: '1w ago',
      },
    ],
    recommended: [
      {
        id: 'other-rec-1',
        name: 'Availability SLO',
        type: 'slo',
        integration: 'Custom',
        description: 'Define an error budget for these entities.',
      },
      {
        id: 'other-rec-2',
        name: 'Health alert rule',
        type: 'alertRule',
        integration: 'Custom',
        description: 'Get notified when one of these entities turns unhealthy.',
      },
      {
        id: 'other-rec-3',
        name: 'Overview dashboard',
        type: 'dashboard',
        integration: 'Custom',
        description: 'A starter dashboard to visualize these entities.',
      },
    ],
  },
};

/**
 * Look up the monitoring assets bundle for a category. Always returns a
 * bundle (falls back to the generic "Custom" set) so the tab never has to
 * special-case a missing category.
 */
export const getCategoryMonitoringAssets = (category: EntityCategoryId): CategoryMonitoringAssets =>
  MONITORING_ASSETS_BY_CATEGORY[category];
