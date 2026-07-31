/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Seeded content for the Super-short-term lab's integrations hub.
 *
 * Each installed integration exposes everything it ships (dashboards, data
 * streams, alert rules, SLO templates, anomaly detection jobs / AI skills, curated resources)
 * plus headline stats and an "enabled assets X/Y" progress. Alert rules and
 * SLO templates are split into `enabled` (already on) and `recommended` (ship
 * with the integration but not yet enabled) — the "what's there vs what still
 * needs enabling" story. Enabling a recommended asset is persisted client-side
 * (see `integration_assets_store.ts`) and moves it into the enabled set.
 *
 * The id / name / icon come from the shared registry so the nav and these pages
 * agree on the catalogue.
 */

import { getInstalledIntegrations, getIntegrationSummary } from '@kbn/entity-centric-lab-flyout';
import type { IntegrationSummary } from '@kbn/entity-centric-lab-flyout';

export type SignalTone = 'success' | 'warning' | 'danger' | 'subdued';
export type DataStreamQuality = 'good' | 'degraded' | 'poor';
export type ResourceType = 'blog' | 'video' | 'event' | 'documentation';

export interface IntegrationStats {
  readonly dashboards: number;
  readonly dataStreams: number;
  readonly alertsInAlert: number;
  readonly breachingSlos: number;
  readonly llmJobsSkills: number;
  readonly recommendedResources: number;
}

export interface DashboardAsset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly aiFinding: string;
}

export interface DataStreamAsset {
  readonly id: string;
  readonly name: string;
  readonly sizeLabel: string;
  readonly quality: DataStreamQuality;
  readonly lastStructureLabel: string;
}

export interface AlertRuleAsset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tone: SignalTone;
}

export interface SloTemplateAsset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly breaching: number;
}

export interface MlAsset {
  readonly id: string;
  readonly type: 'Anomaly detection job' | 'AI skill';
  readonly name: string;
  readonly installation: string;
}

export interface ResourceCard {
  readonly id: string;
  readonly type: ResourceType;
  readonly title: string;
  readonly description: string;
  readonly ctaLabel: string;
}

export interface FakeIntegration {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly version: string;
  readonly updateAvailable: boolean;
  readonly updateVersion?: string;
  readonly stats: IntegrationStats;
  readonly dashboards: readonly DashboardAsset[];
  readonly dataStreams: readonly DataStreamAsset[];
  readonly alertRules: {
    readonly enabled: readonly AlertRuleAsset[];
    readonly recommended: readonly AlertRuleAsset[];
  };
  readonly sloTemplates: {
    readonly enabled: readonly SloTemplateAsset[];
    readonly recommended: readonly SloTemplateAsset[];
  };
  readonly mlAssets: readonly MlAsset[];
  readonly resources: readonly ResourceCard[];
}

const withMeta = (id: string): Pick<IntegrationSummary, 'name' | 'icon'> => {
  const summary = getIntegrationSummary(id);
  return { name: summary?.name ?? id, icon: summary?.icon ?? 'package' };
};

const KUBERNETES: FakeIntegration = {
  id: 'kubernetes',
  ...withMeta('kubernetes'),
  version: '1.63.1',
  updateAvailable: true,
  updateVersion: '1.64.0',
  stats: {
    dashboards: 10,
    dataStreams: 3,
    alertsInAlert: 56,
    breachingSlos: 0,
    llmJobsSkills: 3,
    recommendedResources: 5,
  },
  dashboards: [
    {
      id: 'k8s-cluster-overview',
      name: 'Kubernetes OTel Cluster overview',
      description: 'Cluster-wide CPU, memory, and pod capacity.',
      aiFinding: 'Node node-prod-eu-04 is running hot (94% memory) — likely OOM risk.',
    },
    {
      id: 'k8s-cluster-detail',
      name: 'Kubernetes OTel Cluster detail',
      description: 'Per-cluster resource utilisation breakdown.',
      aiFinding: 'Cluster k8s-eu-prod capacity headroom down 12% week over week.',
    },
    {
      id: 'k8s-node-overview',
      name: 'Kubernetes OTel Node overview',
      description: 'Node health, allocatable resources, conditions.',
      aiFinding: '1 of 48 nodes reporting NotReady in the last 30 minutes.',
    },
    {
      id: 'k8s-namespace-detail',
      name: 'Kubernetes OTel Namespace detail',
      description: 'Namespace-scoped workloads and quotas.',
      aiFinding: 'Namespace payments approaching its memory quota (91%).',
    },
    {
      id: 'k8s-workload-detail',
      name: 'Kubernetes OTel Deployment details',
      description: 'Deployment replicas, rollouts, availability.',
      aiFinding: 'Deployment checkout-service degraded: 3/5 replicas available.',
    },
    {
      id: 'k8s-pod-detail',
      name: 'Kubernetes OTel Pod detail',
      description: 'Pod phase, restarts, and resource usage.',
      aiFinding: 'payments-pod-7f9b2 restarted 3 times in the last 5 minutes.',
    },
  ],
  dataStreams: [
    {
      id: 'k8s-container-logs',
      name: 'logs-kubernetes.container_logs-default',
      sizeLabel: '128 GB',
      quality: 'good',
      lastStructureLabel: '2h ago',
    },
    {
      id: 'k8s-kubeletstats',
      name: 'metrics-kubeletstatsreceiver.otel-default',
      sizeLabel: '54 GB',
      quality: 'good',
      lastStructureLabel: '5m ago',
    },
    {
      id: 'k8s-clusterreceiver',
      name: 'metrics-k8sclusterreceiver.otel-default',
      sizeLabel: '31 GB',
      quality: 'degraded',
      lastStructureLabel: '5m ago',
    },
  ],
  alertRules: {
    enabled: [
      {
        id: 'k8s-node-notready',
        name: 'Node not ready',
        description:
          'Fires when a node reports NotReady for more than 5 minutes, indicating the kubelet has stopped reporting healthy status and workloads on that node may be evicted or left unschedulable.',
        tone: 'danger',
      },
      {
        id: 'k8s-pod-crashloop',
        name: 'Pod crash loop',
        description:
          'Fires when a pod restarts more than 3 times in 5 minutes — a strong signal of a crash loop caused by a failing container, bad configuration, or a missing dependency.',
        tone: 'danger',
      },
      {
        id: 'k8s-pod-oom',
        name: 'Container OOMKilled',
        description:
          'Fires when a container is killed for exceeding its memory limit (OOMKilled), pointing to undersized memory limits or a memory leak in the workload.',
        tone: 'warning',
      },
    ],
    recommended: [
      {
        id: 'k8s-pvc-usage',
        name: 'Persistent volume almost full',
        description:
          'Fires when a PersistentVolumeClaim exceeds 90% of its requested capacity, giving you time to expand storage before writes begin to fail.',
        tone: 'warning',
      },
      {
        id: 'k8s-deployment-unavailable',
        name: 'Deployment replicas unavailable',
        description:
          'Fires when a Deployment has fewer available replicas than desired, surfacing degraded rollouts or scheduling failures before they eat into capacity.',
        tone: 'warning',
      },
      {
        id: 'k8s-hpa-maxed',
        name: 'HorizontalPodAutoscaler at max',
        description:
          'Fires when a HorizontalPodAutoscaler has been pinned at its maximum replica count, a sign the workload is capacity-constrained and may need a higher ceiling.',
        tone: 'subdued',
      },
    ],
  },
  sloTemplates: {
    enabled: [
      {
        id: 'k8s-api-availability',
        name: 'Kubernetes API availability',
        description:
          'Tracks the availability of the Kubernetes API server, targeting 99.9% of successful control-plane requests over a rolling 30-day window. The API server is the entry point for every cluster operation, so sustained errors here ripple into deployments, scaling, and controllers.',
        breaching: 0,
      },
    ],
    recommended: [
      {
        id: 'k8s-pod-ready-ratio',
        name: 'Pod ready ratio',
        description:
          'Tracks the share of pods in a Ready state, targeting 99% of pods ready over a rolling 7-day window so persistent scheduling or readiness-probe failures are caught early.',
        breaching: 0,
      },
      {
        id: 'k8s-scheduler-latency',
        name: 'Scheduler latency',
        description:
          'Tracks Kubernetes scheduler end-to-end latency, targeting a p95 below 1s over a rolling 30-day window; rising scheduling latency delays pod placement and slows rollouts.',
        breaching: 0,
      },
    ],
  },
  mlAssets: [
    {
      id: 'k8s-ml-memory-anomaly',
      type: 'Anomaly detection job',
      name: 'Kubernetes memory usage anomaly detection',
      installation: 'Detects unusual per-namespace memory growth.',
    },
    {
      id: 'k8s-ml-pod-restart',
      type: 'Anomaly detection job',
      name: 'Pod restart rate anomaly detection',
      installation: 'Flags workloads with abnormal restart rates.',
    },
    {
      id: 'k8s-skill-triage',
      type: 'AI skill',
      name: 'Kubernetes incident triage',
      installation: 'Summarises cluster health and likely root cause.',
    },
  ],
  resources: [
    {
      id: 'k8s-res-monitoring',
      type: 'blog',
      title: 'Monitoring Kubernetes',
      description: 'A practical guide to observing clusters with Elastic.',
      ctaLabel: 'Read the article',
    },
    {
      id: 'k8s-res-blog2',
      type: 'blog',
      title: 'Scaling Kubernetes observability',
      description: 'Patterns for high-cardinality Kubernetes telemetry.',
      ctaLabel: 'Read the article',
    },
    {
      id: 'k8s-res-using',
      type: 'documentation',
      title: 'Using the Kubernetes integration',
      description: 'Set up, configure, and get the most out of the integration.',
      ctaLabel: 'View documentation',
    },
    {
      id: 'k8s-res-video',
      type: 'video',
      title: 'How to get the most of your Kubernetes integration',
      description: 'A short walkthrough of dashboards and alerts.',
      ctaLabel: 'Watch video',
    },
    {
      id: 'k8s-res-kubecon',
      type: 'event',
      title: 'KubeCon Amsterdam 8-9 June 2028',
      description: 'Meet the team and see what is next for Elastic on Kubernetes.',
      ctaLabel: 'View event details',
    },
  ],
};

const AWS_EC2: FakeIntegration = {
  id: 'aws-ec2',
  ...withMeta('aws-ec2'),
  version: '2.30.0',
  updateAvailable: false,
  stats: {
    dashboards: 4,
    dataStreams: 3,
    alertsInAlert: 3,
    breachingSlos: 1,
    llmJobsSkills: 3,
    recommendedResources: 5,
  },
  dashboards: [
    {
      id: 'ec2-overview',
      name: '[AWS EC2] Instances overview',
      description: 'Fleet-wide CPU, network, and status checks.',
      aiFinding: '2 instances failed status checks in us-east-1.',
    },
    {
      id: 'ec2-cpu',
      name: '[AWS EC2] CPU utilisation',
      description: 'Per-instance CPU credit balance and usage.',
      aiFinding: 'i-0ab12 has exhausted its CPU credits (t3 burst).',
    },
    {
      id: 'ec2-network',
      name: '[AWS EC2] Network throughput',
      description: 'Ingress/egress bytes and packet rates.',
      aiFinding: 'Egress on i-0ff93 up 3x — possible data exfiltration or backup job.',
    },
    {
      id: 'ec2-ebs',
      name: '[AWS EC2] EBS performance',
      description: 'Volume IOPS, throughput, and queue depth.',
      aiFinding: 'gp3 volume vol-04a queue depth trending up.',
    },
  ],
  dataStreams: [
    {
      id: 'ec2-metrics',
      name: 'metrics-aws.ec2_metrics-default',
      sizeLabel: '22 GB',
      quality: 'good',
      lastStructureLabel: '10m ago',
    },
    {
      id: 'ec2-logs',
      name: 'logs-aws.ec2_logs-default',
      sizeLabel: '9 GB',
      quality: 'good',
      lastStructureLabel: '1h ago',
    },
    {
      id: 'ec2-cloudwatch',
      name: 'metrics-aws.cloudwatch-default',
      sizeLabel: '14 GB',
      quality: 'degraded',
      lastStructureLabel: '15m ago',
    },
  ],
  alertRules: {
    enabled: [
      {
        id: 'ec2-status-check',
        name: 'Instance status check failed',
        description:
          'Fires when an instance fails its system or instance status check, indicating the underlying host or the instance OS/network is unhealthy and may need recovery or replacement.',
        tone: 'danger',
      },
      {
        id: 'ec2-cpu-high',
        name: 'High CPU utilisation',
        description:
          'Fires when CPU utilisation stays above 90% for 10 minutes, a sign the instance is saturated and its workloads may be throttled or latency-bound.',
        tone: 'warning',
      },
    ],
    recommended: [
      {
        id: 'ec2-credit-low',
        name: 'CPU credit balance low',
        description:
          'Fires when a burstable (T-family) instance is about to exhaust its CPU credits, which would cap it at baseline performance until credits recover.',
        tone: 'warning',
      },
      {
        id: 'ec2-ebs-latency',
        name: 'EBS high latency',
        description:
          'Fires when attached EBS volume latency exceeds the expected threshold, pointing to storage-bound workloads or a need for higher provisioned IOPS.',
        tone: 'subdued',
      },
    ],
  },
  sloTemplates: {
    // Example integration where every SLO template ships disabled: the section
    // opens on the "Disabled" tab and the "Enabled" tab shows an empty state.
    enabled: [],
    recommended: [
      {
        id: 'ec2-fleet-availability',
        name: 'EC2 fleet availability',
        description:
          'Tracks the share of healthy instances across the fleet, targeting 99.5% healthy over a rolling 30-day window so gradual erosion in fleet health is measured against a clear error budget.',
        breaching: 1,
      },
      {
        id: 'ec2-status-slo',
        name: 'Instance status check pass rate',
        description:
          'Tracks the pass rate of EC2 instance status checks, targeting 99.9% passing over a rolling 7-day window to catch hosts that intermittently fail health checks.',
        breaching: 0,
      },
    ],
  },
  mlAssets: [
    {
      id: 'ec2-ml-cpu',
      type: 'Anomaly detection job',
      name: 'EC2 CPU anomaly detection',
      installation: 'Detects unusual CPU patterns across the fleet.',
    },
    {
      id: 'ec2-skill-rightsizing',
      type: 'AI skill',
      name: 'EC2 rightsizing advisor',
      installation: 'Suggests instance types based on utilisation.',
    },
  ],
  resources: [
    {
      id: 'ec2-res-monitor',
      type: 'blog',
      title: 'Monitoring AWS EC2 with Elastic',
      description: 'Collect metrics and logs from your EC2 fleet.',
      ctaLabel: 'Read the article',
    },
    {
      id: 'ec2-res-docs',
      type: 'documentation',
      title: 'Using the AWS EC2 integration',
      description: 'Configuration and best practices.',
      ctaLabel: 'View documentation',
    },
  ],
};

const AWS_LAMBDA: FakeIntegration = {
  id: 'aws-lambda',
  ...withMeta('aws-lambda'),
  version: '2.30.0',
  updateAvailable: false,
  stats: {
    dashboards: 10,
    dataStreams: 3,
    alertsInAlert: 12,
    breachingSlos: 0,
    llmJobsSkills: 3,
    recommendedResources: 5,
  },
  dashboards: [
    {
      id: 'lambda-overview',
      name: '[AWS Lambda] Functions overview',
      description: 'Invocations, errors, and duration across functions.',
      aiFinding: 'Error rate on checkout-fn up to 4.2% in the last hour.',
    },
    {
      id: 'lambda-errors',
      name: '[AWS Lambda] Errors & throttles',
      description: 'Error, throttle, and dead-letter trends.',
      aiFinding: 'payments-fn throttled 34 times — concurrency limit reached.',
    },
    {
      id: 'lambda-duration',
      name: '[AWS Lambda] Duration & cold starts',
      description: 'p50/p95 duration and cold-start frequency.',
      aiFinding: 'Cold starts on report-fn add ~800ms p95.',
    },
  ],
  dataStreams: [
    {
      id: 'lambda-metrics',
      name: 'metrics-aws.lambda-default',
      sizeLabel: '17 GB',
      quality: 'good',
      lastStructureLabel: '8m ago',
    },
    {
      id: 'lambda-logs',
      name: 'logs-aws.lambda-default',
      sizeLabel: '41 GB',
      quality: 'good',
      lastStructureLabel: '3m ago',
    },
    {
      id: 'lambda-traces',
      name: 'traces-aws.lambda-default',
      sizeLabel: '6 GB',
      quality: 'degraded',
      lastStructureLabel: '20m ago',
    },
  ],
  alertRules: {
    enabled: [
      {
        id: 'lambda-error-rate',
        name: 'High error rate',
        description:
          "Fires when a function's error rate exceeds 2% for 5 minutes, surfacing broken deployments, bad input, or failing downstream dependencies before they affect callers.",
        tone: 'danger',
      },
      {
        id: 'lambda-throttle',
        name: 'Function throttled',
        description:
          'Fires when a function is throttled due to reserved or account concurrency limits, meaning invocations are being rejected and may need a higher concurrency allocation.',
        tone: 'warning',
      },
    ],
    recommended: [
      {
        id: 'lambda-duration-high',
        name: 'Duration approaching timeout',
        description:
          "Fires when a function's duration nears its configured timeout, giving you time to optimise or raise the timeout before invocations start failing.",
        tone: 'warning',
      },
      {
        id: 'lambda-dlq',
        name: 'Dead-letter queue growing',
        description:
          "Fires when failed invocations accumulate in the function's dead-letter queue, indicating unprocessed events that need investigation or reprocessing.",
        tone: 'subdued',
      },
    ],
  },
  sloTemplates: {
    enabled: [
      {
        id: 'lambda-success-rate',
        name: 'Lambda success rate',
        description:
          'Tracks the share of successful invocations, targeting 99.9% successful over a rolling 30-day window so error-budget burn from failing invocations is easy to see.',
        breaching: 0,
      },
    ],
    recommended: [
      {
        id: 'lambda-latency-slo',
        name: 'Invocation latency',
        description:
          'Tracks invocation latency, targeting a p95 below 500ms over a rolling 7-day window to catch regressions in cold-start or execution time.',
        breaching: 0,
      },
    ],
  },
  mlAssets: [
    {
      id: 'lambda-ml-errors',
      type: 'Anomaly detection job',
      name: 'Lambda error rate anomaly detection',
      installation: 'Detects unusual error spikes per function.',
    },
    {
      id: 'lambda-skill-cost',
      type: 'AI skill',
      name: 'Lambda cost & concurrency advisor',
      installation: 'Recommends memory and concurrency settings.',
    },
  ],
  resources: [
    {
      id: 'lambda-res-monitor',
      type: 'blog',
      title: 'Serverless monitoring with Elastic',
      description: 'Observe AWS Lambda functions end to end.',
      ctaLabel: 'Read the article',
    },
    {
      id: 'lambda-res-docs',
      type: 'documentation',
      title: 'Using the AWS Lambda integration',
      description: 'Configuration and best practices.',
      ctaLabel: 'View documentation',
    },
  ],
};

const AWS_RDS: FakeIntegration = {
  id: 'aws-rds',
  ...withMeta('aws-rds'),
  version: '2.30.0',
  updateAvailable: false,
  stats: {
    dashboards: 4,
    dataStreams: 2,
    alertsInAlert: 2,
    breachingSlos: 0,
    llmJobsSkills: 2,
    recommendedResources: 4,
  },
  dashboards: [
    {
      id: 'rds-overview',
      name: '[AWS RDS] Instances overview',
      description: 'Connections, CPU, and storage across DB instances.',
      aiFinding: 'db-prod-orders is at 88% of allocated storage.',
    },
    {
      id: 'rds-performance',
      name: '[AWS RDS] Query performance',
      description: 'Read/write latency, IOPS, and throughput.',
      aiFinding: 'Write latency on db-prod-orders doubled after 03:00.',
    },
    {
      id: 'rds-connections',
      name: '[AWS RDS] Connections',
      description: 'Active connections vs. instance limits.',
      aiFinding: 'db-reporting is nearing its max_connections limit.',
    },
    {
      id: 'rds-replication',
      name: '[AWS RDS] Replication',
      description: 'Read replica lag and replication health.',
      aiFinding: 'Read replica lag peaked at 42s during the backup window.',
    },
  ],
  dataStreams: [
    {
      id: 'rds-metrics',
      name: 'metrics-aws.rds-default',
      sizeLabel: '18 GB',
      quality: 'good',
      lastStructureLabel: '7m ago',
    },
    {
      id: 'rds-logs',
      name: 'logs-aws.rds_logs-default',
      sizeLabel: '11 GB',
      quality: 'degraded',
      lastStructureLabel: '25m ago',
    },
  ],
  alertRules: {
    enabled: [
      {
        id: 'rds-storage-low',
        name: 'Free storage low',
        description:
          'Fires when free storage space drops below 10%, giving you time to scale storage before the database becomes read-only or writes start failing.',
        tone: 'danger',
      },
      {
        id: 'rds-cpu-high',
        name: 'High CPU utilisation',
        description:
          'Fires when DB instance CPU stays above 90% for 10 minutes, a sign of heavy query load, missing indexes, or an undersized instance class.',
        tone: 'warning',
      },
    ],
    recommended: [
      {
        id: 'rds-connections-high',
        name: 'Connections near limit',
        description:
          'Fires when active connections approach max_connections, so connection-pool exhaustion is caught before new clients are refused.',
        tone: 'warning',
      },
      {
        id: 'rds-replica-lag',
        name: 'Replica lag high',
        description:
          'Fires when read-replica lag exceeds the expected threshold, indicating replicas are serving stale data and may need attention before a failover.',
        tone: 'subdued',
      },
    ],
  },
  sloTemplates: {
    enabled: [
      {
        id: 'rds-availability',
        name: 'RDS availability',
        description:
          'Tracks database availability, targeting 99.9% available over a rolling 30-day window so downtime is measured against a clear error budget.',
        breaching: 0,
      },
    ],
    recommended: [
      {
        id: 'rds-latency-slo',
        name: 'Query latency',
        description:
          'Tracks query latency, targeting a p95 below 50ms over a rolling 7-day window to catch slowdowns from load or query-plan regressions.',
        breaching: 0,
      },
    ],
  },
  mlAssets: [
    {
      id: 'rds-ml-latency',
      type: 'Anomaly detection job',
      name: 'RDS query latency anomaly detection',
      installation: 'Detects unusual read/write latency per instance.',
    },
    {
      id: 'rds-skill-tuning',
      type: 'AI skill',
      name: 'RDS performance tuning advisor',
      installation: 'Suggests parameter and index improvements.',
    },
  ],
  resources: [
    {
      id: 'rds-res-monitor',
      type: 'blog',
      title: 'Monitoring AWS RDS with Elastic',
      description: 'Collect metrics and logs from your managed databases.',
      ctaLabel: 'Read the article',
    },
    {
      id: 'rds-res-docs',
      type: 'documentation',
      title: 'Using the AWS RDS integration',
      description: 'Configuration and best practices.',
      ctaLabel: 'View documentation',
    },
  ],
};

const AZURE: FakeIntegration = {
  id: 'azure',
  ...withMeta('azure'),
  version: '1.12.3',
  updateAvailable: true,
  updateVersion: '1.13.0',
  stats: {
    dashboards: 8,
    dataStreams: 4,
    alertsInAlert: 7,
    breachingSlos: 2,
    llmJobsSkills: 2,
    recommendedResources: 5,
  },
  dashboards: [
    {
      id: 'azure-vm-overview',
      name: '[Azure] Virtual machines overview',
      description: 'VM CPU, memory, and disk across subscriptions.',
      aiFinding: 'VM vm-eu-03 sustained 95% CPU for 20 minutes.',
    },
    {
      id: 'azure-monitor',
      name: '[Azure] Monitor metrics',
      description: 'Platform metrics from Azure Monitor.',
      aiFinding: 'Ingestion latency on eastus namespace rising.',
    },
  ],
  dataStreams: [
    {
      id: 'azure-vm-metrics',
      name: 'metrics-azure.compute_vm-default',
      sizeLabel: '19 GB',
      quality: 'good',
      lastStructureLabel: '12m ago',
    },
    {
      id: 'azure-monitor-metrics',
      name: 'metrics-azure.monitor-default',
      sizeLabel: '27 GB',
      quality: 'degraded',
      lastStructureLabel: '9m ago',
    },
  ],
  alertRules: {
    enabled: [
      {
        id: 'azure-vm-cpu',
        name: 'VM high CPU',
        description:
          'Fires when a virtual machine stays above 90% CPU for 10 minutes, a sign the VM is saturated and its workloads may be throttled or latency-bound.',
        tone: 'warning',
      },
    ],
    recommended: [
      {
        id: 'azure-vm-disk',
        name: 'VM disk almost full',
        description:
          'Fires when an OS or data disk exceeds 90% usage, giving you time to expand the disk before writes start failing.',
        tone: 'warning',
      },
      {
        id: 'azure-throttle',
        name: 'API throttling detected',
        description:
          'Fires when Azure Monitor API requests are being throttled, which can create gaps in collected metrics until request volume drops.',
        tone: 'subdued',
      },
    ],
  },
  sloTemplates: {
    enabled: [
      {
        id: 'azure-vm-availability',
        name: 'VM availability',
        description:
          'Tracks the share of healthy virtual machines, targeting 99.5% healthy VMs over a rolling 30-day window so fleet-health erosion is visible against a clear error budget.',
        breaching: 2,
      },
    ],
    recommended: [
      {
        id: 'azure-latency-slo',
        name: 'Metric ingestion latency',
        description:
          'Tracks metric ingestion latency, targeting a p95 below 2m over a rolling 7-day window to catch delays that would make dashboards and alerts lag reality.',
        breaching: 0,
      },
    ],
  },
  mlAssets: [
    {
      id: 'azure-ml-cpu',
      type: 'Anomaly detection job',
      name: 'Azure VM CPU anomaly detection',
      installation: 'Detects unusual CPU across subscriptions.',
    },
    {
      id: 'azure-skill-cost',
      type: 'AI skill',
      name: 'Azure cost optimisation advisor',
      installation: 'Highlights idle and oversized resources.',
    },
  ],
  resources: [
    {
      id: 'azure-res-monitor',
      type: 'blog',
      title: 'Monitoring Azure with Elastic',
      description: 'Bring Azure Monitor data into Elastic.',
      ctaLabel: 'Read the article',
    },
    {
      id: 'azure-res-docs',
      type: 'documentation',
      title: 'Using the Azure integration',
      description: 'Configuration and best practices.',
      ctaLabel: 'View documentation',
    },
  ],
};

// Generic placeholder integration ("Something else" in the design mockup). It
// deliberately stays sparse — its job is to show the catalogue extends beyond
// the richly-seeded integrations, not to model a specific data source.
const SOMETHING_ELSE: FakeIntegration = {
  id: 'something-else',
  ...withMeta('something-else'),
  version: '1.0.0',
  updateAvailable: false,
  stats: {
    dashboards: 2,
    dataStreams: 1,
    alertsInAlert: 0,
    breachingSlos: 0,
    llmJobsSkills: 1,
    recommendedResources: 2,
  },
  dashboards: [
    {
      id: 'se-overview',
      name: '[Integration] Overview',
      description: 'Headline metrics for this integration.',
      aiFinding: 'Nothing notable in the last 24 hours.',
    },
    {
      id: 'se-detail',
      name: '[Integration] Detail',
      description: 'Detailed breakdown of the collected signals.',
      aiFinding: 'Ingest volume steady week over week.',
    },
  ],
  dataStreams: [
    {
      id: 'se-metrics',
      name: 'metrics-something.else-default',
      sizeLabel: '5 GB',
      quality: 'good',
      lastStructureLabel: '15m ago',
    },
  ],
  alertRules: {
    enabled: [],
    recommended: [
      {
        id: 'se-generic',
        name: 'Signal above threshold',
        description:
          'Fires when a collected metric exceeds its configured threshold — a generic starting point you can tailor to any signal this integration ships.',
        tone: 'warning',
      },
    ],
  },
  sloTemplates: {
    enabled: [],
    recommended: [
      {
        id: 'se-availability-slo',
        name: 'Service availability',
        description:
          'Tracks overall service availability, targeting 99.9% available over a rolling 30-day window as a general-purpose starting point you can adapt per service.',
        breaching: 0,
      },
    ],
  },
  mlAssets: [
    {
      id: 'se-ml-anomaly',
      type: 'Anomaly detection job',
      name: 'Generic metric anomaly detection',
      installation: 'Detects unusual patterns in the collected metrics.',
    },
  ],
  resources: [
    {
      id: 'se-res-docs',
      type: 'documentation',
      title: 'Using this integration',
      description: 'Configuration and best practices.',
      ctaLabel: 'View documentation',
    },
    {
      id: 'se-res-browse',
      type: 'blog',
      title: 'Explore the integrations catalog',
      description: 'Discover more data sources you can connect to Elastic.',
      ctaLabel: 'Read the article',
    },
  ],
};

const FAKE_INTEGRATIONS: Readonly<Record<string, FakeIntegration>> = {
  'aws-ec2': AWS_EC2,
  'aws-lambda': AWS_LAMBDA,
  'aws-rds': AWS_RDS,
  azure: AZURE,
  kubernetes: KUBERNETES,
  'something-else': SOMETHING_ELSE,
};

export const getFakeIntegration = (id: string): FakeIntegration | undefined =>
  FAKE_INTEGRATIONS[id];

/** All installed integrations, in the shared registry order. */
export const getFakeIntegrations = (): readonly FakeIntegration[] =>
  getInstalledIntegrations()
    .map((summary) => FAKE_INTEGRATIONS[summary.id])
    .filter((integration): integration is FakeIntegration => Boolean(integration));
