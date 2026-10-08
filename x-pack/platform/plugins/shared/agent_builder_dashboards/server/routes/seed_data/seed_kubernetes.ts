/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

const KUBELETSTATS_DATASET = 'kubeletstatsreceiver.otel';
const CLUSTER_DATASET = 'k8sclusterreceiver.otel';
const HOSTMETRICS_DATASET = 'hostmetricsreceiver.otel';
const EVENTS_DATASET = 'k8seventsreceiver.otel';
const NAMESPACE = 'default';

const KUBELETSTATS_STREAM = `metrics-${KUBELETSTATS_DATASET}-${NAMESPACE}`;
const CLUSTER_STREAM = `metrics-${CLUSTER_DATASET}-${NAMESPACE}`;
const HOSTMETRICS_STREAM = `metrics-${HOSTMETRICS_DATASET}-${NAMESPACE}`;
const EVENTS_STREAM = `logs-${EVENTS_DATASET}-${NAMESPACE}`;

const METRICS_STREAMS = [KUBELETSTATS_STREAM, CLUSTER_STREAM, HOSTMETRICS_STREAM] as const;
const DATA_STREAMS = [...METRICS_STREAMS, EVENTS_STREAM] as const;

const CLUSTERS = [{ name: 'prod-eu-west' }, { name: 'staging-us-east' }] as const;

const NODES = [
  { name: 'node-1', cluster: 'prod-eu-west', cpuUtil: 0.42, memoryUtil: 0.58, diskUtil: 0.35 },
  { name: 'node-2', cluster: 'prod-eu-west', cpuUtil: 0.61, memoryUtil: 0.47, diskUtil: 0.52 },
  { name: 'node-3', cluster: 'staging-us-east', cpuUtil: 0.28, memoryUtil: 0.39, diskUtil: 0.22 },
] as const;

const NAMESPACES = [
  { name: 'default', cluster: 'prod-eu-west' },
  { name: 'jobs', cluster: 'prod-eu-west' },
  { name: 'default', cluster: 'staging-us-east' },
] as const;

interface SeedPod {
  uid: string;
  name: string;
  namespace: string;
  node: string;
  cluster: string;
  deployment?: string;
  replicaset?: string;
  daemonset?: string;
  statefulset?: string;
  job?: string;
  /** k8s.pod.phase enum; defaults to Running (2). */
  phase?: number;
}

const PODS: SeedPod[] = [
  {
    uid: 'pod-frontend-1',
    name: 'frontend-7d9f8c',
    namespace: 'default',
    node: 'node-1',
    cluster: 'prod-eu-west',
    deployment: 'frontend',
    replicaset: 'frontend-7d9f8c',
  },
  {
    uid: 'pod-api-1',
    name: 'api-5b6c4d',
    namespace: 'default',
    node: 'node-1',
    cluster: 'prod-eu-west',
    deployment: 'api',
    replicaset: 'api-5b6c4d',
  },
  {
    uid: 'pod-api-2',
    name: 'api-8a1e2f',
    namespace: 'default',
    node: 'node-2',
    cluster: 'prod-eu-west',
    deployment: 'api',
    replicaset: 'api-5b6c4d',
  },
  {
    uid: 'pod-worker-1',
    name: 'worker-3c9a1b',
    namespace: 'jobs',
    node: 'node-2',
    cluster: 'prod-eu-west',
    deployment: 'worker',
    replicaset: 'worker-3c9a1b',
  },
  {
    uid: 'pod-demo-1',
    name: 'demo-1a2b3c',
    namespace: 'default',
    node: 'node-3',
    cluster: 'staging-us-east',
    deployment: 'demo',
    replicaset: 'demo-1a2b3c',
  },
  {
    uid: 'pod-cache-1',
    name: 'cache-0',
    namespace: 'default',
    node: 'node-1',
    cluster: 'prod-eu-west',
    statefulset: 'cache',
  },
  {
    uid: 'pod-agent-1',
    name: 'otel-agent-node-1',
    namespace: 'default',
    node: 'node-1',
    cluster: 'prod-eu-west',
    daemonset: 'otel-agent',
  },
  {
    uid: 'pod-agent-2',
    name: 'otel-agent-node-2',
    namespace: 'default',
    node: 'node-2',
    cluster: 'prod-eu-west',
    daemonset: 'otel-agent',
  },
  {
    uid: 'pod-job-1',
    name: 'etl-batch-abc12',
    namespace: 'jobs',
    node: 'node-2',
    cluster: 'prod-eu-west',
    job: 'etl-batch',
  },
  // Non-running pods so "non-running pods" panels return rows.
  {
    uid: 'pod-pending-1',
    name: 'api-pending-0',
    namespace: 'default',
    node: 'node-1',
    cluster: 'prod-eu-west',
    deployment: 'api',
    replicaset: 'api-5b6c4d',
    phase: 1, // Pending
  },
  {
    uid: 'pod-failed-1',
    name: 'worker-failed-0',
    namespace: 'jobs',
    node: 'node-2',
    cluster: 'prod-eu-west',
    deployment: 'worker',
    replicaset: 'worker-3c9a1b',
    phase: 4, // Failed
  },
];

const NODE_CPU_CORES = 4;
const NODE_MEMORY_BYTES = 16 * 1024 ** 3;
const NODE_DISK_BYTES = 200 * 1024 ** 3;
const VOLUME_CAPACITY_BYTES = 20 * 1024 ** 3;

// kubernetes_otel dashboards often use Last 24h — keep lookback inside an explicit TSDS window.
const INTERVAL_MS = 5 * 60 * 1000;
const LOOKBACK_MS = 24 * 60 * 60 * 1000;

const POD_PHASE_RUNNING = 2;
const NAMESPACE_PHASE_ACTIVE = 1;

type SeedDoc = { index: string; document: Record<string, unknown> };

export interface SeedKubernetesResult {
  documentsIndexed: number;
  dataStreams: string[];
}

function keyword() {
  return { type: 'keyword' as const, ignore_above: 1024 };
}

function keywordDimension() {
  return { type: 'keyword' as const, ignore_above: 1024, time_series_dimension: true };
}

function gaugeDouble() {
  return { type: 'double' as const, time_series_metric: 'gauge' as const };
}

function gaugeLong() {
  return { type: 'long' as const, time_series_metric: 'gauge' as const };
}

function counterDouble() {
  return { type: 'double' as const, time_series_metric: 'counter' as const };
}

const CLUSTER_METRIC_PROPERTIES: Record<string, unknown> = {
  'k8s.node.condition_ready': gaugeLong(),
  'k8s.node.condition_memory_pressure': gaugeLong(),
  'k8s.node.cpu.usage': gaugeDouble(),
  'k8s.node.allocatable_cpu': gaugeDouble(),
  'k8s.node.memory.working_set': gaugeDouble(),
  'k8s.node.memory.available': gaugeDouble(),
  'k8s.node.memory.rss': gaugeDouble(),
  'k8s.node.allocatable_memory': gaugeDouble(),
  'k8s.node.filesystem.usage': gaugeDouble(),
  'k8s.node.filesystem.capacity': gaugeDouble(),
  'k8s.node.network.io': counterDouble(),
  'k8s.namespace.phase': gaugeLong(),
  'k8s.deployment.available': gaugeLong(),
  'k8s.deployment.desired': gaugeLong(),
  'k8s.replicaset.available': gaugeLong(),
  'k8s.replicaset.desired': gaugeLong(),
  'k8s.daemonset.current_scheduled_nodes': gaugeLong(),
  'k8s.daemonset.desired_scheduled_nodes': gaugeLong(),
  'k8s.daemonset.misscheduled_nodes': gaugeLong(),
  'k8s.daemonset.ready_nodes': gaugeLong(),
  'k8s.statefulset.current_pods': gaugeLong(),
  'k8s.statefulset.desired_pods': gaugeLong(),
  'k8s.statefulset.ready_pods': gaugeLong(),
  'k8s.statefulset.updated_pods': gaugeLong(),
  'k8s.job.active_pods': gaugeLong(),
  'k8s.job.desired_successful_pods': gaugeLong(),
  'k8s.job.failed_pods': gaugeLong(),
  'k8s.job.successful_pods': gaugeLong(),
  'k8s.pod.phase': gaugeLong(),
  'k8s.container.restarts': gaugeLong(),
  'k8s.container.ready': gaugeLong(),
  'k8s.container.cpu_limit': gaugeDouble(),
  'k8s.container.cpu_request': gaugeDouble(),
  'k8s.container.memory_limit': gaugeDouble(),
  'k8s.container.memory_request': gaugeDouble(),
  'metrics.k8s.node.condition_ready': gaugeLong(),
  'metrics.k8s.node.cpu.usage': gaugeDouble(),
  'metrics.k8s.node.allocatable_cpu': gaugeDouble(),
  'metrics.k8s.node.memory.working_set': gaugeDouble(),
  'metrics.k8s.node.allocatable_memory': gaugeDouble(),
  'metrics.k8s.node.filesystem.usage': gaugeDouble(),
  'metrics.k8s.node.filesystem.capacity': gaugeDouble(),
  'metrics.k8s.deployment.available': gaugeLong(),
  'metrics.k8s.deployment.desired': gaugeLong(),
  'metrics.k8s.replicaset.available': gaugeLong(),
  'metrics.k8s.replicaset.desired': gaugeLong(),
  'metrics.k8s.daemonset.desired_scheduled_nodes': gaugeLong(),
  'metrics.k8s.daemonset.ready_nodes': gaugeLong(),
  'metrics.k8s.statefulset.desired_pods': gaugeLong(),
  'metrics.k8s.statefulset.ready_pods': gaugeLong(),
  'metrics.k8s.container.restarts': gaugeLong(),
  'metrics.k8s.container.cpu_limit': gaugeDouble(),
  'metrics.k8s.container.cpu_request': gaugeDouble(),
  'metrics.k8s.container.memory_limit': gaugeDouble(),
  'metrics.k8s.container.memory_request': gaugeDouble(),
  'metrics.k8s.pod.phase': gaugeLong(),
};

const KUBELET_METRIC_PROPERTIES: Record<string, unknown> = {
  // Node stats also land in kubeletstats — Overview disk panels query that stream.
  'k8s.node.condition_ready': gaugeLong(),
  'k8s.node.condition_memory_pressure': gaugeLong(),
  'k8s.node.cpu.usage': gaugeDouble(),
  'k8s.node.allocatable_cpu': gaugeDouble(),
  'k8s.node.memory.working_set': gaugeDouble(),
  'k8s.node.memory.available': gaugeDouble(),
  'k8s.node.memory.rss': gaugeDouble(),
  'k8s.node.allocatable_memory': gaugeDouble(),
  'k8s.node.filesystem.usage': gaugeDouble(),
  'k8s.node.filesystem.capacity': gaugeDouble(),
  'k8s.node.network.io': counterDouble(),
  'k8s.pod.cpu_limit_utilization': gaugeDouble(),
  'k8s.pod.cpu.node.utilization': gaugeDouble(),
  'k8s.pod.cpu.usage': gaugeDouble(),
  'k8s.pod.memory_limit_utilization': gaugeDouble(),
  'k8s.pod.memory.node.utilization': gaugeDouble(),
  'k8s.pod.memory.working_set': gaugeDouble(),
  'k8s.pod.memory.usage': gaugeDouble(),
  'k8s.pod.memory.available': gaugeDouble(),
  'k8s.pod.memory.rss': gaugeDouble(),
  'k8s.pod.network.io': counterDouble(),
  'k8s.volume.available': gaugeDouble(),
  'k8s.volume.capacity': gaugeDouble(),
  'container.cpu.usage': gaugeDouble(),
  'container.memory.working_set': gaugeDouble(),
  'container.memory.major_page_faults': gaugeLong(),
  'k8s.container.cpu_limit': gaugeDouble(),
  'k8s.container.cpu_request': gaugeDouble(),
  'k8s.container.memory_limit': gaugeDouble(),
  'k8s.container.memory_request': gaugeDouble(),
  'metrics.k8s.pod.cpu_limit_utilization': gaugeDouble(),
  'metrics.k8s.pod.cpu.node.utilization': gaugeDouble(),
  'metrics.k8s.pod.cpu.usage': gaugeDouble(),
  'metrics.k8s.pod.memory_limit_utilization': gaugeDouble(),
  'metrics.k8s.pod.memory.node.utilization': gaugeDouble(),
  'metrics.k8s.pod.memory.working_set': gaugeDouble(),
  'metrics.k8s.pod.memory.usage': gaugeDouble(),
  'metrics.k8s.pod.network.io': counterDouble(),
  'metrics.k8s.container.cpu_limit': gaugeDouble(),
  'metrics.k8s.container.cpu_request': gaugeDouble(),
  'metrics.k8s.container.memory_limit': gaugeDouble(),
  'metrics.k8s.container.memory_request': gaugeDouble(),
};

async function ensureTsdsTemplate(
  esClient: ElasticsearchClient,
  name: string,
  indexPatterns: string[],
  extraProperties: Record<string, unknown>
): Promise<void> {
  await esClient.indices.putIndexTemplate({
    name,
    index_patterns: indexPatterns,
    data_stream: {},
    priority: 500,
    template: {
      settings: {
        index: {
          mode: 'time_series',
          // Allow a full day of lab seed docs for "Last 24 hours" dashboards.
          look_back_time: '25h',
        },
      },
      mappings: {
        dynamic: true,
        properties: {
          '@timestamp': { type: 'date' },
          'data_stream.dataset': keywordDimension(),
          'metricset.name': keywordDimension(),
          'k8s.cluster.name': keywordDimension(),
          'k8s.namespace.name': keywordDimension(),
          'k8s.node.name': keywordDimension(),
          'k8s.pod.uid': keywordDimension(),
          'k8s.container.name': keywordDimension(),
          'k8s.deployment.name': keywordDimension(),
          'k8s.daemonset.name': keywordDimension(),
          'k8s.statefulset.name': keywordDimension(),
          'k8s.replicaset.name': keywordDimension(),
          'k8s.job.name': keywordDimension(),
          'k8s.volume.name': keywordDimension(),
          'host.name': keywordDimension(),
          direction: keywordDimension(),
          interface: keywordDimension(),
          'data_stream.type': keyword(),
          'data_stream.namespace': keyword(),
          'k8s.pod.name': keyword(),
          'k8s.container.status.last_terminated_reason': keyword(),
          'host.hostname': keyword(),
          'resource.attributes.k8s.cluster.name': keyword(),
          'resource.attributes.k8s.node.name': keyword(),
          'resource.attributes.k8s.namespace.name': keyword(),
          'resource.attributes.k8s.pod.uid': keyword(),
          'resource.attributes.k8s.pod.name': keyword(),
          'resource.attributes.k8s.deployment.name': keyword(),
          'resource.attributes.k8s.daemonset.name': keyword(),
          'resource.attributes.k8s.statefulset.name': keyword(),
          'resource.attributes.k8s.replicaset.name': keyword(),
          'resource.attributes.container.id': keyword(),
          ...extraProperties,
        },
      },
    },
  });
}

async function resetDataStream(esClient: ElasticsearchClient, name: string, logger: Logger) {
  try {
    await esClient.indices.deleteDataStream({ name });
    logger.info(`Deleted existing data stream ${name} before Kubernetes seed`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('index_not_found') && !message.includes('404')) {
      logger.debug(`deleteDataStream(${name}): ${message}`);
    }
  }
}

function dataStreamFields(type: 'metrics' | 'logs', dataset: string) {
  return {
    'data_stream.type': type,
    'data_stream.dataset': dataset,
    'data_stream.namespace': NAMESPACE,
  };
}

function buildDocuments(now: number): SeedDoc[] {
  const timedDocs: SeedDoc[] = [];
  const start = now - LOOKBACK_MS;

  for (let ts = start; ts <= now; ts += INTERVAL_MS) {
    const wave = 0.15 * Math.sin(ts / (30 * 60_000));
    // Unique @timestamp per doc within the interval — TSDS _id ignores some dims.
    let intervalOffset = 0;
    const emit = (index: string, document: Record<string, unknown>) => {
      timedDocs.push({
        index,
        document: {
          '@timestamp': new Date(ts + intervalOffset++).toISOString(),
          ...document,
        },
      });
    };

    const tick = Math.floor((ts - start) / INTERVAL_MS);

    for (const node of NODES) {
      const cpuUtil = Math.min(0.95, Math.max(0.05, node.cpuUtil + wave));
      const memoryUtil = Math.min(0.95, Math.max(0.05, node.memoryUtil + wave / 2));
      const diskUtil = Math.min(0.95, Math.max(0.05, node.diskUtil + wave / 3));
      const workingSet = memoryUtil * NODE_MEMORY_BYTES;
      const availableMem = (1 - memoryUtil) * NODE_MEMORY_BYTES;
      const rss = memoryUtil * 0.7 * NODE_MEMORY_BYTES;

      const nodeIdentity = {
        'k8s.cluster.name': node.cluster,
        'k8s.node.name': node.name,
        'resource.attributes.k8s.cluster.name': node.cluster,
        'resource.attributes.k8s.node.name': node.name,
      };

      const nodeGauges = {
        ...nodeIdentity,
        'k8s.node.condition_ready': 1,
        'k8s.node.condition_memory_pressure': 0,
        'k8s.node.cpu.usage': cpuUtil * NODE_CPU_CORES,
        'k8s.node.allocatable_cpu': NODE_CPU_CORES,
        'k8s.node.memory.working_set': workingSet,
        'k8s.node.memory.available': availableMem,
        'k8s.node.memory.rss': rss,
        'k8s.node.allocatable_memory': NODE_MEMORY_BYTES,
        'k8s.node.filesystem.usage': diskUtil * NODE_DISK_BYTES,
        'k8s.node.filesystem.capacity': NODE_DISK_BYTES,
      };

      emit(CLUSTER_STREAM, {
        ...dataStreamFields('metrics', CLUSTER_DATASET),
        'metricset.name': 'node',
        ...nodeGauges,
        'metrics.k8s.node.condition_ready': 1,
        'metrics.k8s.node.cpu.usage': cpuUtil * NODE_CPU_CORES,
        'metrics.k8s.node.allocatable_cpu': NODE_CPU_CORES,
        'metrics.k8s.node.memory.working_set': workingSet,
        'metrics.k8s.node.allocatable_memory': NODE_MEMORY_BYTES,
        'metrics.k8s.node.filesystem.usage': diskUtil * NODE_DISK_BYTES,
        'metrics.k8s.node.filesystem.capacity': NODE_DISK_BYTES,
      });

      // Disk / memory composition / CPU panels query kubeletstats for node fields.
      emit(KUBELETSTATS_STREAM, {
        ...dataStreamFields('metrics', KUBELETSTATS_DATASET),
        'metricset.name': 'node',
        ...nodeGauges,
      });

      // Network I/O panels use RATE(k8s.node.network.io) BY direction.
      for (const direction of ['receive', 'transmit'] as const) {
        emit(KUBELETSTATS_STREAM, {
          ...dataStreamFields('metrics', KUBELETSTATS_DATASET),
          'metricset.name': 'network',
          ...nodeIdentity,
          direction,
          'k8s.node.network.io': 50_000_000 + tick * 25_000 + (direction === 'transmit' ? 1_000 : 0),
        });
      }

      emit(HOSTMETRICS_STREAM, {
        ...dataStreamFields('metrics', HOSTMETRICS_DATASET),
        'metricset.name': 'cpu',
        'host.name': node.name,
        'host.hostname': node.name,
        'k8s.cluster.name': node.cluster,
        'k8s.node.name': node.name,
        'metrics.system.cpu.utilization': cpuUtil,
        'system.cpu.utilization': cpuUtil,
        'resource.attributes.k8s.cluster.name': node.cluster,
        'resource.attributes.k8s.node.name': node.name,
      });
    }

    for (const ns of NAMESPACES) {
      emit(CLUSTER_STREAM, {
        ...dataStreamFields('metrics', CLUSTER_DATASET),
        'metricset.name': 'namespace',
        'k8s.cluster.name': ns.cluster,
        'k8s.namespace.name': ns.name,
        'k8s.namespace.phase': NAMESPACE_PHASE_ACTIVE,
        'resource.attributes.k8s.cluster.name': ns.cluster,
        'resource.attributes.k8s.namespace.name': ns.name,
      });
    }

    for (const cluster of CLUSTERS) {
      const clusterPods = PODS.filter((p) => p.cluster === cluster.name);
      const deployments = [
        ...new Set(
          clusterPods.flatMap((p) => (p.deployment !== undefined ? [p.deployment] : []))
        ),
      ];
      for (const deployment of deployments) {
        const running = clusterPods.filter(
          (p) => p.deployment === deployment && (p.phase ?? POD_PHASE_RUNNING) === POD_PHASE_RUNNING
        ).length;
        // Leave api short of desired so "desired vs actual pods delta" panels light up.
        const desired = deployment === 'api' ? running + 1 : Math.max(running, 1);
        const available = running;
        emit(CLUSTER_STREAM, {
          ...dataStreamFields('metrics', CLUSTER_DATASET),
          'metricset.name': 'deployment',
          'k8s.cluster.name': cluster.name,
          'k8s.namespace.name': deployment === 'worker' ? 'jobs' : 'default',
          'k8s.deployment.name': deployment,
          'k8s.deployment.available': available,
          'k8s.deployment.desired': desired,
          'metrics.k8s.deployment.available': available,
          'metrics.k8s.deployment.desired': desired,
          'resource.attributes.k8s.cluster.name': cluster.name,
          'resource.attributes.k8s.namespace.name':
            deployment === 'worker' ? 'jobs' : 'default',
          'resource.attributes.k8s.deployment.name': deployment,
        });
      }

      const replicaSets = [
        ...new Set(
          clusterPods.flatMap((p) => (p.replicaset !== undefined ? [p.replicaset] : []))
        ),
      ];
      for (const replicaset of replicaSets) {
        const desired = clusterPods.filter((p) => p.replicaset === replicaset).length;
        emit(CLUSTER_STREAM, {
          ...dataStreamFields('metrics', CLUSTER_DATASET),
          'metricset.name': 'replicaset',
          'k8s.cluster.name': cluster.name,
          'k8s.namespace.name': 'default',
          'k8s.replicaset.name': replicaset,
          'k8s.replicaset.available': desired,
          'k8s.replicaset.desired': desired,
          'metrics.k8s.replicaset.available': desired,
          'metrics.k8s.replicaset.desired': desired,
          'resource.attributes.k8s.cluster.name': cluster.name,
          'resource.attributes.k8s.namespace.name': 'default',
          'resource.attributes.k8s.replicaset.name': replicaset,
        });
      }

      const daemonsets = [
        ...new Set(
          clusterPods.flatMap((p) => (p.daemonset !== undefined ? [p.daemonset] : []))
        ),
      ];
      for (const daemonset of daemonsets) {
        const nodesInCluster = NODES.filter((n) => n.cluster === cluster.name).length;
        emit(CLUSTER_STREAM, {
          ...dataStreamFields('metrics', CLUSTER_DATASET),
          'metricset.name': 'daemonset',
          'k8s.cluster.name': cluster.name,
          'k8s.namespace.name': 'default',
          'k8s.daemonset.name': daemonset,
          'k8s.daemonset.current_scheduled_nodes': nodesInCluster,
          'k8s.daemonset.desired_scheduled_nodes': nodesInCluster,
          'k8s.daemonset.misscheduled_nodes': 0,
          'k8s.daemonset.ready_nodes': nodesInCluster,
          'metrics.k8s.daemonset.desired_scheduled_nodes': nodesInCluster,
          'metrics.k8s.daemonset.ready_nodes': nodesInCluster,
          'resource.attributes.k8s.cluster.name': cluster.name,
          'resource.attributes.k8s.namespace.name': 'default',
          'resource.attributes.k8s.daemonset.name': daemonset,
        });
      }

      const statefulsets = [
        ...new Set(
          clusterPods.flatMap((p) => (p.statefulset !== undefined ? [p.statefulset] : []))
        ),
      ];
      for (const statefulset of statefulsets) {
        const desired = clusterPods.filter((p) => p.statefulset === statefulset).length;
        emit(CLUSTER_STREAM, {
          ...dataStreamFields('metrics', CLUSTER_DATASET),
          'metricset.name': 'statefulset',
          'k8s.cluster.name': cluster.name,
          'k8s.namespace.name': 'default',
          'k8s.statefulset.name': statefulset,
          'k8s.statefulset.current_pods': desired,
          'k8s.statefulset.desired_pods': desired,
          'k8s.statefulset.ready_pods': desired,
          'k8s.statefulset.updated_pods': desired,
          'metrics.k8s.statefulset.desired_pods': desired,
          'metrics.k8s.statefulset.ready_pods': desired,
          'resource.attributes.k8s.cluster.name': cluster.name,
          'resource.attributes.k8s.namespace.name': 'default',
          'resource.attributes.k8s.statefulset.name': statefulset,
        });
      }

      const jobs = [
        ...new Set(clusterPods.flatMap((p) => (p.job !== undefined ? [p.job] : []))),
      ];
      for (const job of jobs) {
        emit(CLUSTER_STREAM, {
          ...dataStreamFields('metrics', CLUSTER_DATASET),
          'metricset.name': 'job',
          'k8s.cluster.name': cluster.name,
          'k8s.namespace.name': 'jobs',
          'k8s.job.name': job,
          'k8s.job.active_pods': 1,
          'k8s.job.desired_successful_pods': 1,
          'k8s.job.failed_pods': 0,
          'k8s.job.successful_pods': 0,
          'resource.attributes.k8s.cluster.name': cluster.name,
          'resource.attributes.k8s.namespace.name': 'jobs',
        });
      }
    }

    for (const [podIndex, pod] of PODS.entries()) {
      const cpuLimit = 0.35 + (podIndex % 3) * 0.1 + wave;
      const cpuNode = 0.2 + (podIndex % 3) * 0.05 + wave / 2;
      const cpuUsage = 0.15 + (podIndex % 3) * 0.04;
      const memLimit = 0.45 + (podIndex % 3) * 0.08;
      const memNode = 0.3 + (podIndex % 3) * 0.05;
      const memWorkingSet = (300 + podIndex * 40) * 1024 ** 2;
      const memUsage = (400 + podIndex * 50) * 1024 ** 2;
      const memAvailable = (200 + podIndex * 10) * 1024 ** 2;
      const memRss = (250 + podIndex * 30) * 1024 ** 2;
      const containerCpuLimit = 0.5;
      const containerCpuRequest = 0.1;
      const containerMemLimit = 512 * 1024 ** 2;
      const containerMemRequest = 128 * 1024 ** 2;
      const restarts = podIndex === 3 ? 2 : 0;
      const volumeAvail = VOLUME_CAPACITY_BYTES * (0.55 - (podIndex % 3) * 0.05);
      const phase = pod.phase ?? POD_PHASE_RUNNING;

      const identity = {
        'k8s.cluster.name': pod.cluster,
        'k8s.namespace.name': pod.namespace,
        'k8s.node.name': pod.node,
        'k8s.pod.uid': pod.uid,
        'k8s.pod.name': pod.name,
        ...(pod.deployment ? { 'k8s.deployment.name': pod.deployment } : {}),
        ...(pod.replicaset ? { 'k8s.replicaset.name': pod.replicaset } : {}),
        ...(pod.daemonset ? { 'k8s.daemonset.name': pod.daemonset } : {}),
        ...(pod.statefulset ? { 'k8s.statefulset.name': pod.statefulset } : {}),
        ...(pod.job ? { 'k8s.job.name': pod.job } : {}),
        'resource.attributes.k8s.cluster.name': pod.cluster,
        'resource.attributes.k8s.namespace.name': pod.namespace,
        'resource.attributes.k8s.node.name': pod.node,
        'resource.attributes.k8s.pod.uid': pod.uid,
        'resource.attributes.k8s.pod.name': pod.name,
        ...(pod.deployment
          ? { 'resource.attributes.k8s.deployment.name': pod.deployment }
          : {}),
        ...(pod.replicaset
          ? { 'resource.attributes.k8s.replicaset.name': pod.replicaset }
          : {}),
        ...(pod.daemonset ? { 'resource.attributes.k8s.daemonset.name': pod.daemonset } : {}),
        ...(pod.statefulset
          ? { 'resource.attributes.k8s.statefulset.name': pod.statefulset }
          : {}),
      };

      emit(KUBELETSTATS_STREAM, {
        ...dataStreamFields('metrics', KUBELETSTATS_DATASET),
        ...identity,
        'metricset.name': 'cpu',
        'k8s.pod.cpu_limit_utilization': cpuLimit,
        'k8s.pod.cpu.node.utilization': cpuNode,
        'k8s.pod.cpu.usage': cpuUsage,
        'metrics.k8s.pod.cpu_limit_utilization': cpuLimit,
        'metrics.k8s.pod.cpu.node.utilization': cpuNode,
        'metrics.k8s.pod.cpu.usage': cpuUsage,
      });

      emit(KUBELETSTATS_STREAM, {
        ...dataStreamFields('metrics', KUBELETSTATS_DATASET),
        ...identity,
        'metricset.name': 'memory',
        'k8s.pod.memory_limit_utilization': memLimit,
        'k8s.pod.memory.node.utilization': memNode,
        'k8s.pod.memory.working_set': memWorkingSet,
        'k8s.pod.memory.usage': memUsage,
        'k8s.pod.memory.available': memAvailable,
        'k8s.pod.memory.rss': memRss,
        'metrics.k8s.pod.memory_limit_utilization': memLimit,
        'metrics.k8s.pod.memory.node.utilization': memNode,
        'metrics.k8s.pod.memory.working_set': memWorkingSet,
        'metrics.k8s.pod.memory.usage': memUsage,
      });

      for (const direction of ['receive', 'transmit'] as const) {
        const networkIo =
          1_000_000 + podIndex * 50_000 + tick * 5_000 + (direction === 'transmit' ? 500 : 0);
        emit(KUBELETSTATS_STREAM, {
          ...dataStreamFields('metrics', KUBELETSTATS_DATASET),
          ...identity,
          'metricset.name': 'network',
          direction,
          interface: 'eth0',
          'k8s.pod.network.io': networkIo,
          'metrics.k8s.pod.network.io': networkIo,
        });
      }

      emit(KUBELETSTATS_STREAM, {
        ...dataStreamFields('metrics', KUBELETSTATS_DATASET),
        ...identity,
        'metricset.name': 'volume',
        'k8s.volume.name': 'data',
        'k8s.volume.available': volumeAvail,
        'k8s.volume.capacity': VOLUME_CAPACITY_BYTES,
      });

      emit(KUBELETSTATS_STREAM, {
        ...dataStreamFields('metrics', KUBELETSTATS_DATASET),
        ...identity,
        'metricset.name': 'container',
        'k8s.container.name': 'main',
        'resource.attributes.container.id': `cri-o://${pod.uid}-main`,
        'container.cpu.usage': cpuUsage,
        'container.memory.working_set': memWorkingSet,
        'container.memory.major_page_faults': podIndex,
        'k8s.container.cpu_limit': containerCpuLimit,
        'k8s.container.cpu_request': containerCpuRequest,
        'k8s.container.memory_limit': containerMemLimit,
        'k8s.container.memory_request': containerMemRequest,
        'metrics.k8s.container.cpu_limit': containerCpuLimit,
        'metrics.k8s.container.cpu_request': containerCpuRequest,
        'metrics.k8s.container.memory_limit': containerMemLimit,
        'metrics.k8s.container.memory_request': containerMemRequest,
      });

      emit(CLUSTER_STREAM, {
        ...dataStreamFields('metrics', CLUSTER_DATASET),
        ...identity,
        'metricset.name': 'pod',
        'k8s.pod.phase': phase,
        'k8s.container.name': 'main',
        'k8s.container.restarts': restarts,
        'k8s.container.ready': phase === POD_PHASE_RUNNING ? 1 : 0,
        'k8s.container.cpu_limit': containerCpuLimit,
        'k8s.container.cpu_request': containerCpuRequest,
        'k8s.container.memory_limit': containerMemLimit,
        'k8s.container.memory_request': containerMemRequest,
        'k8s.container.status.last_terminated_reason':
          phase === 4 ? 'Error' : restarts > 0 ? 'OOMKilled' : 'Completed',
        'metrics.k8s.pod.phase': phase,
        'metrics.k8s.container.restarts': restarts,
        'metrics.k8s.container.cpu_limit': containerCpuLimit,
        'metrics.k8s.container.cpu_request': containerCpuRequest,
        'metrics.k8s.container.memory_limit': containerMemLimit,
        'metrics.k8s.container.memory_request': containerMemRequest,
      });
    }
  }

  // Warning events for Cluster Detail / deprecated overview panels.
  for (const [i, pod] of PODS.slice(0, 4).entries()) {
    timedDocs.push({
      index: EVENTS_STREAM,
      document: {
        '@timestamp': new Date(now - i * 60_000).toISOString(),
        ...dataStreamFields('logs', EVENTS_DATASET),
        severity_text: 'Warning',
        'body.text': `BackOff: restarting failed container main in pod ${pod.name}`,
        'k8s.cluster.name': pod.cluster,
        'k8s.pod.name': pod.name,
        'k8s.node.name': pod.node,
        'k8s.namespace.name': pod.namespace,
        'k8s.event.reason': 'BackOff',
        'k8s.event.name': `${pod.name}.seed`,
        'k8s.event.count': 1 + i,
        'k8s.object.kind': 'Pod',
        'k8s.object.name': pod.name,
      },
    });
  }

  return timedDocs;
}

async function bulkIndex(
  esClient: ElasticsearchClient,
  docs: SeedDoc[],
  logger: Logger
): Promise<{ indexed: number; firstError?: { type?: string; reason?: string } }> {
  const chunkSize = 500;
  let indexed = 0;
  let firstError: { type?: string; reason?: string } | undefined;

  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const body = chunk.flatMap(({ index, document }) => [{ create: { _index: index } }, document]);
    const response = await esClient.bulk({ refresh: false, body });
    if (response.errors) {
      const errorItem = response.items.find((item) => item.create?.error)?.create?.error;
      if (errorItem && !firstError) {
        firstError = { type: errorItem.type, reason: errorItem.reason };
      }
      logger.warn(
        `Kubernetes seed bulk had errors: ${firstError?.type ?? 'unknown'} — ${
          firstError?.reason ?? 'n/a'
        }`
      );
    }
    indexed += response.items.filter((item) => {
      const status = item.create?.status;
      return (
        !item.create?.error &&
        (item.create?.result === 'created' || status === 200 || status === 201)
      );
    }).length;
  }

  await esClient.indices.refresh({
    index: [...DATA_STREAMS],
    ignore_unavailable: true,
  });

  return { indexed, firstError };
}

async function ensureTemplates(esClient: ElasticsearchClient, logger: Logger): Promise<void> {
  try {
    await Promise.all([
      ensureTsdsTemplate(
        esClient,
        `metrics-${KUBELETSTATS_DATASET}`,
        [`metrics-${KUBELETSTATS_DATASET}-*`],
        KUBELET_METRIC_PROPERTIES
      ),
      ensureTsdsTemplate(
        esClient,
        `metrics-${CLUSTER_DATASET}`,
        [`metrics-${CLUSTER_DATASET}-*`],
        CLUSTER_METRIC_PROPERTIES
      ),
      ensureTsdsTemplate(
        esClient,
        `metrics-${HOSTMETRICS_DATASET}`,
        [`metrics-${HOSTMETRICS_DATASET}-*`],
        {
          'system.cpu.utilization': gaugeDouble(),
          'metrics.system.cpu.utilization': gaugeDouble(),
        }
      ),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Kubernetes seed could not install custom TSDS templates: ${message}`);
  }
}

/** Seeds OTel Kubernetes metrics shaped for kubernetes_otel managed dashboards. */
export async function seedKubernetesData(
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<SeedKubernetesResult> {
  await Promise.all(DATA_STREAMS.map((stream) => resetDataStream(esClient, stream, logger)));
  await ensureTemplates(esClient, logger);

  const docs = buildDocuments(Date.now());
  const { indexed: documentsIndexed, firstError } = await bulkIndex(esClient, docs, logger);

  if (documentsIndexed === 0) {
    const detail = firstError
      ? `${firstError.type ?? 'error'}: ${firstError.reason ?? 'unknown'}`
      : 'No bulk errors reported — check that your user can write to metrics-* / logs-* data streams.';
    throw new Error(
      `Kubernetes seed indexed 0 documents into ${DATA_STREAMS.join(', ')}. ${detail}`
    );
  }

  logger.info(`Kubernetes seed indexed ${documentsIndexed} docs into ${DATA_STREAMS.join(', ')}`);

  return {
    documentsIndexed,
    dataStreams: [...DATA_STREAMS],
  };
}
