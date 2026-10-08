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
const NAMESPACE = 'default';

const KUBELETSTATS_STREAM = `metrics-${KUBELETSTATS_DATASET}-${NAMESPACE}`;
const CLUSTER_STREAM = `metrics-${CLUSTER_DATASET}-${NAMESPACE}`;
const HOSTMETRICS_STREAM = `metrics-${HOSTMETRICS_DATASET}-${NAMESPACE}`;

const DATA_STREAMS = [KUBELETSTATS_STREAM, CLUSTER_STREAM, HOSTMETRICS_STREAM] as const;

const CLUSTERS = [{ name: 'prod-eu-west' }, { name: 'staging-us-east' }] as const;

const NODES = [
  { name: 'node-1', cluster: 'prod-eu-west', cpuUtil: 0.42, memoryUtil: 0.58, diskUtil: 0.35 },
  { name: 'node-2', cluster: 'prod-eu-west', cpuUtil: 0.61, memoryUtil: 0.47, diskUtil: 0.52 },
  { name: 'node-3', cluster: 'staging-us-east', cpuUtil: 0.28, memoryUtil: 0.39, diskUtil: 0.22 },
] as const;

const PODS = [
  {
    uid: 'pod-frontend-1',
    name: 'frontend-7d9f8c',
    namespace: 'default',
    node: 'node-1',
    cluster: 'prod-eu-west',
    deployment: 'frontend',
  },
  {
    uid: 'pod-api-1',
    name: 'api-5b6c4d',
    namespace: 'default',
    node: 'node-1',
    cluster: 'prod-eu-west',
    deployment: 'api',
  },
  {
    uid: 'pod-api-2',
    name: 'api-8a1e2f',
    namespace: 'default',
    node: 'node-2',
    cluster: 'prod-eu-west',
    deployment: 'api',
  },
  {
    uid: 'pod-worker-1',
    name: 'worker-3c9a1b',
    namespace: 'jobs',
    node: 'node-2',
    cluster: 'prod-eu-west',
    deployment: 'worker',
  },
  {
    uid: 'pod-demo-1',
    name: 'demo-1a2b3c',
    namespace: 'default',
    node: 'node-3',
    cluster: 'staging-us-east',
    deployment: 'demo',
  },
] as const;

const NODE_CPU_CORES = 4;
const NODE_MEMORY_BYTES = 16 * 1024 ** 3;
const NODE_DISK_BYTES = 200 * 1024 ** 3;

// kubernetes_otel dashboards use ES|QL `TS` — streams must be TSDS.
// Keep lookback inside the default metrics-otel acceptance window.
const INTERVAL_MS = 30_000;
const LOOKBACK_MS = 15 * 60 * 1000;

/** Pod phase enum used by k8sclusterreceiver / kubernetes_otel dashboards. */
const POD_PHASE_RUNNING = 2;

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
    // Beat the built-in metrics-otel@template (priority 120) with correct dimensions.
    priority: 500,
    template: {
      settings: {
        index: {
          mode: 'time_series',
        },
      },
      mappings: {
        dynamic: true,
        properties: {
          '@timestamp': { type: 'date' },
          // Keep dimension count low (TSDS default limit). Identity for series routing:
          'data_stream.dataset': keywordDimension(),
          'metricset.name': keywordDimension(),
          'k8s.cluster.name': keywordDimension(),
          'k8s.node.name': keywordDimension(),
          'k8s.namespace.name': keywordDimension(),
          'k8s.pod.uid': keywordDimension(),
          'k8s.deployment.name': keywordDimension(),
          'host.name': keywordDimension(),
          direction: keywordDimension(),
          interface: keywordDimension(),
          // Non-dimension keywords still queryable by dashboards / resource.attributes panels.
          'data_stream.type': keyword(),
          'data_stream.namespace': keyword(),
          'k8s.pod.name': keyword(),
          'k8s.container.name': keyword(),
          'host.hostname': keyword(),
          'resource.attributes.k8s.cluster.name': keyword(),
          'resource.attributes.k8s.node.name': keyword(),
          'resource.attributes.k8s.namespace.name': keyword(),
          'resource.attributes.k8s.pod.uid': keyword(),
          'resource.attributes.k8s.pod.name': keyword(),
          'resource.attributes.k8s.deployment.name': keyword(),
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

function dataStreamFields(dataset: string) {
  return {
    'data_stream.type': 'metrics',
    'data_stream.dataset': dataset,
    'data_stream.namespace': NAMESPACE,
  };
}

function buildDocuments(now: number): Array<{ index: string; document: Record<string, unknown> }> {
  const docs: Array<{ index: string; document: Record<string, unknown> }> = [];
  const start = now - LOOKBACK_MS;
  // Global ms offset — TSDS _id ignores some dims (direction/interface), so each doc needs a unique @timestamp.
  let stamp = 0;

  for (let ts = start; ts <= now; ts += INTERVAL_MS) {
    const wave = 0.15 * Math.sin(ts / (30 * 60_000));

    for (const node of NODES) {
      const cpuUtil = Math.min(0.95, Math.max(0.05, node.cpuUtil + wave));
      const memoryUtil = Math.min(0.95, Math.max(0.05, node.memoryUtil + wave / 2));
      const diskUtil = Math.min(0.95, Math.max(0.05, node.diskUtil + wave / 3));

      // Field names match kubernetes_otel Overview / Nodes panels (not ECS nested cpu.allocatable).
      docs.push({
        index: CLUSTER_STREAM,
        document: {
          '@timestamp': new Date(ts + stamp++).toISOString(),
          ...dataStreamFields(CLUSTER_DATASET),
          'metricset.name': 'node',
          'k8s.cluster.name': node.cluster,
          'k8s.node.name': node.name,
          'k8s.node.condition_ready': 1,
          'k8s.node.cpu.usage': cpuUtil * NODE_CPU_CORES,
          'k8s.node.allocatable_cpu': NODE_CPU_CORES,
          'k8s.node.memory.working_set': memoryUtil * NODE_MEMORY_BYTES,
          'k8s.node.allocatable_memory': NODE_MEMORY_BYTES,
          'k8s.node.filesystem.usage': diskUtil * NODE_DISK_BYTES,
          'k8s.node.filesystem.capacity': NODE_DISK_BYTES,
          'resource.attributes.k8s.cluster.name': node.cluster,
          'resource.attributes.k8s.node.name': node.name,
        },
      });

      docs.push({
        index: HOSTMETRICS_STREAM,
        document: {
          '@timestamp': new Date(ts + stamp++).toISOString(),
          ...dataStreamFields(HOSTMETRICS_DATASET),
          'metricset.name': 'cpu',
          'host.name': node.name,
          'host.hostname': node.name,
          'k8s.cluster.name': node.cluster,
          'k8s.node.name': node.name,
          'metrics.system.cpu.utilization': cpuUtil,
          'system.cpu.utilization': cpuUtil,
          'resource.attributes.k8s.cluster.name': node.cluster,
          'resource.attributes.k8s.node.name': node.name,
        },
      });
    }

    for (const cluster of CLUSTERS) {
      const clusterPods = PODS.filter((p) => p.cluster === cluster.name);
      const deployments = [...new Set(clusterPods.map((p) => p.deployment))];
      for (const deployment of deployments) {
        const desired = clusterPods.filter((p) => p.deployment === deployment).length;
        docs.push({
          index: CLUSTER_STREAM,
          document: {
            '@timestamp': new Date(ts + stamp++).toISOString(),
            ...dataStreamFields(CLUSTER_DATASET),
            'metricset.name': 'deployment',
            'k8s.cluster.name': cluster.name,
            'k8s.namespace.name': 'default',
            'k8s.deployment.name': deployment,
            'k8s.deployment.available': desired,
            'k8s.deployment.desired': desired,
            'resource.attributes.k8s.cluster.name': cluster.name,
            'resource.attributes.k8s.namespace.name': 'default',
            'resource.attributes.k8s.deployment.name': deployment,
          },
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

      const base = {
        ...dataStreamFields(KUBELETSTATS_DATASET),
        'k8s.cluster.name': pod.cluster,
        'k8s.namespace.name': pod.namespace,
        'k8s.node.name': pod.node,
        'k8s.pod.uid': pod.uid,
        'k8s.pod.name': pod.name,
        'k8s.deployment.name': pod.deployment,
        'resource.attributes.k8s.cluster.name': pod.cluster,
        'resource.attributes.k8s.namespace.name': pod.namespace,
        'resource.attributes.k8s.node.name': pod.node,
        'resource.attributes.k8s.pod.uid': pod.uid,
        'resource.attributes.k8s.pod.name': pod.name,
        'resource.attributes.k8s.deployment.name': pod.deployment,
      };

      docs.push({
        index: KUBELETSTATS_STREAM,
        document: {
          '@timestamp': new Date(ts + stamp++).toISOString(),
          ...base,
          'metricset.name': 'cpu',
          'k8s.pod.cpu_limit_utilization': cpuLimit,
          'k8s.pod.cpu.node.utilization': cpuNode,
          'k8s.pod.cpu.usage': cpuUsage,
          'metrics.k8s.pod.cpu_limit_utilization': cpuLimit,
          'metrics.k8s.pod.cpu.node.utilization': cpuNode,
          'metrics.k8s.pod.cpu.usage': cpuUsage,
        },
      });

      docs.push({
        index: KUBELETSTATS_STREAM,
        document: {
          '@timestamp': new Date(ts + stamp++).toISOString(),
          ...base,
          'metricset.name': 'memory',
          'k8s.pod.memory_limit_utilization': memLimit,
          'k8s.pod.memory.node.utilization': memNode,
          'k8s.pod.memory.working_set': memWorkingSet,
          'k8s.pod.memory.usage': memUsage,
          'metrics.k8s.pod.memory_limit_utilization': memLimit,
          'metrics.k8s.pod.memory.node.utilization': memNode,
          'metrics.k8s.pod.memory.working_set': memWorkingSet,
          'metrics.k8s.pod.memory.usage': memUsage,
        },
      });

      for (const direction of ['receive', 'transmit'] as const) {
        docs.push({
          index: KUBELETSTATS_STREAM,
          document: {
            '@timestamp': new Date(ts + stamp++).toISOString(),
            ...base,
            'metricset.name': 'network',
            direction,
            interface: 'eth0',
            'k8s.pod.network.io': 1_000_000 + podIndex * 50_000 + Math.floor(ts / INTERVAL_MS) * 1000,
            'metrics.k8s.pod.network.io':
              1_000_000 + podIndex * 50_000 + Math.floor(ts / INTERVAL_MS) * 1000,
          },
        });
      }

      docs.push({
        index: CLUSTER_STREAM,
        document: {
          '@timestamp': new Date(ts + stamp++).toISOString(),
          ...dataStreamFields(CLUSTER_DATASET),
          'metricset.name': 'pod',
          'k8s.cluster.name': pod.cluster,
          'k8s.namespace.name': pod.namespace,
          'k8s.node.name': pod.node,
          'k8s.pod.uid': pod.uid,
          'k8s.pod.name': pod.name,
          'k8s.pod.phase': POD_PHASE_RUNNING,
          'k8s.container.name': 'main',
          'k8s.container.restarts': podIndex === 3 ? 2 : 0,
          'resource.attributes.k8s.cluster.name': pod.cluster,
          'resource.attributes.k8s.namespace.name': pod.namespace,
          'resource.attributes.k8s.node.name': pod.node,
          'resource.attributes.k8s.pod.uid': pod.uid,
          'resource.attributes.k8s.pod.name': pod.name,
        },
      });
    }
  }

  return docs;
}

async function bulkIndex(
  esClient: ElasticsearchClient,
  docs: Array<{ index: string; document: Record<string, unknown> }>,
  logger: Logger
): Promise<{ indexed: number; firstError?: { type?: string; reason?: string } }> {
  const chunkSize = 500;
  let indexed = 0;
  let firstError: { type?: string; reason?: string } | undefined;

  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const body = chunk.flatMap(({ index, document }) => [{ index: { _index: index } }, document]);
    const response = await esClient.bulk({ refresh: false, body });
    if (response.errors) {
      const errorItem = response.items.find((item) => item.index?.error)?.index?.error;
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
      const status = item.index?.status;
      return (
        !item.index?.error &&
        (item.index?.result === 'created' ||
          item.index?.result === 'updated' ||
          status === 200 ||
          status === 201)
      );
    }).length;
  }

  await esClient.indices.refresh({
    index: [...DATA_STREAMS],
    ignore_unavailable: true,
  });

  return { indexed, firstError };
}

/** Seeds OTel Kubernetes metrics shaped for kubernetes_otel managed dashboards. */
export async function seedKubernetesData(
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<SeedKubernetesResult> {
  // Drop prior lab streams so a previous non-TSDS seed cannot block `TS` ES|QL panels.
  await Promise.all(DATA_STREAMS.map((stream) => resetDataStream(esClient, stream, logger)));

  await Promise.all([
    ensureTsdsTemplate(esClient, `metrics-${KUBELETSTATS_DATASET}`, [
      `metrics-${KUBELETSTATS_DATASET}-*`,
    ], {
      'k8s.pod.cpu_limit_utilization': gaugeDouble(),
      'k8s.pod.cpu.node.utilization': gaugeDouble(),
      'k8s.pod.cpu.usage': gaugeDouble(),
      'k8s.pod.memory_limit_utilization': gaugeDouble(),
      'k8s.pod.memory.node.utilization': gaugeDouble(),
      'k8s.pod.memory.working_set': gaugeDouble(),
      'k8s.pod.memory.usage': gaugeDouble(),
      'k8s.pod.network.io': gaugeDouble(),
      'metrics.k8s.pod.cpu_limit_utilization': gaugeDouble(),
      'metrics.k8s.pod.cpu.node.utilization': gaugeDouble(),
      'metrics.k8s.pod.cpu.usage': gaugeDouble(),
      'metrics.k8s.pod.memory_limit_utilization': gaugeDouble(),
      'metrics.k8s.pod.memory.node.utilization': gaugeDouble(),
      'metrics.k8s.pod.memory.working_set': gaugeDouble(),
      'metrics.k8s.pod.memory.usage': gaugeDouble(),
      'metrics.k8s.pod.network.io': gaugeDouble(),
    }),
    ensureTsdsTemplate(esClient, `metrics-${CLUSTER_DATASET}`, [`metrics-${CLUSTER_DATASET}-*`], {
      'k8s.node.condition_ready': gaugeLong(),
      'k8s.node.cpu.usage': gaugeDouble(),
      'k8s.node.allocatable_cpu': gaugeDouble(),
      'k8s.node.memory.working_set': gaugeDouble(),
      'k8s.node.allocatable_memory': gaugeDouble(),
      'k8s.node.filesystem.usage': gaugeDouble(),
      'k8s.node.filesystem.capacity': gaugeDouble(),
      'k8s.deployment.available': gaugeLong(),
      'k8s.deployment.desired': gaugeLong(),
      'k8s.pod.phase': gaugeLong(),
      'k8s.container.restarts': gaugeLong(),
    }),
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

  for (const stream of DATA_STREAMS) {
    try {
      await esClient.indices.createDataStream({ name: stream });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        !message.includes('resource_already_exists_exception') &&
        !message.includes('already exists')
      ) {
        throw error;
      }
    }
  }

  const docs = buildDocuments(Date.now());
  const { indexed: documentsIndexed, firstError } = await bulkIndex(esClient, docs, logger);

  if (documentsIndexed === 0) {
    const detail = firstError
      ? `${firstError.type ?? 'error'}: ${firstError.reason ?? 'unknown'}`
      : 'No bulk errors reported — check index privileges and TSDS templates.';
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
