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

const CLUSTERS = [
  { name: 'prod-eu-west', healthy: true },
  { name: 'staging-us-east', healthy: true },
] as const;

const NODES = [
  { name: 'node-1', cluster: 'prod-eu-west', cpu: 0.42, memory: 0.58, disk: 0.35 },
  { name: 'node-2', cluster: 'prod-eu-west', cpu: 0.61, memory: 0.47, disk: 0.52 },
  { name: 'node-3', cluster: 'staging-us-east', cpu: 0.28, memory: 0.39, disk: 0.22 },
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

const INTERVAL_MS = 60_000;
const LOOKBACK_MS = 24 * 60 * 60 * 1000;

export interface SeedKubernetesResult {
  documentsIndexed: number;
  dataStreams: string[];
}

async function ensureDataStreamTemplate(
  esClient: ElasticsearchClient,
  name: string,
  indexPatterns: string[]
): Promise<void> {
  const keyword = { type: 'keyword' as const, ignore_above: 1024 };
  const double = { type: 'double' as const };
  const long = { type: 'long' as const };

  await esClient.indices.putIndexTemplate({
    name,
    index_patterns: indexPatterns,
    data_stream: {},
    priority: 150,
    template: {
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          data_stream: {
            properties: {
              dataset: keyword,
              type: keyword,
              namespace: keyword,
            },
          },
          k8s: {
            properties: {
              cluster: { properties: { name: keyword } },
              namespace: { properties: { name: keyword } },
              node: {
                properties: {
                  name: keyword,
                  cpu: {
                    properties: {
                      usage: double,
                      allocatable: double,
                      utilization: double,
                    },
                  },
                  memory: {
                    properties: {
                      usage: double,
                      allocatable: double,
                      utilization: double,
                      working_set: double,
                    },
                  },
                  filesystem: {
                    properties: {
                      usage: double,
                      capacity: double,
                      utilization: double,
                    },
                  },
                  condition: keyword,
                },
              },
              pod: {
                properties: {
                  uid: keyword,
                  name: keyword,
                  phase: keyword,
                  cpu_limit_utilization: double,
                  cpu: {
                    properties: {
                      usage: double,
                      node: { properties: { utilization: double } },
                    },
                  },
                  memory_limit_utilization: double,
                  memory: {
                    properties: {
                      usage: double,
                      working_set: double,
                      node: { properties: { utilization: double } },
                    },
                  },
                  network: { properties: { io: double } },
                },
              },
              deployment: {
                properties: {
                  name: keyword,
                  pod: {
                    properties: {
                      available: long,
                      desired: long,
                    },
                  },
                },
              },
              container: {
                properties: {
                  name: keyword,
                  restarts: long,
                },
              },
            },
          },
          host: {
            properties: {
              name: keyword,
              hostname: keyword,
            },
          },
          metrics: {
            properties: {
              k8s: {
                properties: {
                  pod: {
                    properties: {
                      cpu_limit_utilization: double,
                      cpu: {
                        properties: {
                          usage: double,
                          node: { properties: { utilization: double } },
                        },
                      },
                      memory_limit_utilization: double,
                      memory: {
                        properties: {
                          usage: double,
                          working_set: double,
                          node: { properties: { utilization: double } },
                        },
                      },
                      network: { properties: { io: double } },
                    },
                  },
                  node: {
                    properties: {
                      cpu: {
                        properties: {
                          usage: double,
                          allocatable: double,
                          utilization: double,
                        },
                      },
                      memory: {
                        properties: {
                          usage: double,
                          allocatable: double,
                          utilization: double,
                          working_set: double,
                        },
                      },
                    },
                  },
                  deployment: {
                    properties: {
                      pod: {
                        properties: {
                          available: long,
                          desired: long,
                        },
                      },
                    },
                  },
                  container: {
                    properties: {
                      restarts: long,
                    },
                  },
                },
              },
              system: {
                properties: {
                  cpu: {
                    properties: {
                      utilization: double,
                    },
                  },
                  memory: {
                    properties: {
                      utilization: double,
                    },
                  },
                  filesystem: {
                    properties: {
                      utilization: double,
                    },
                  },
                },
              },
            },
          },
          resource: {
            properties: {
              attributes: {
                properties: {
                  k8s: {
                    properties: {
                      cluster: { properties: { name: keyword } },
                      namespace: { properties: { name: keyword } },
                      node: { properties: { name: keyword } },
                      pod: {
                        properties: {
                          uid: keyword,
                          name: keyword,
                        },
                      },
                      deployment: { properties: { name: keyword } },
                    },
                  },
                },
              },
            },
          },
          direction: keyword,
          interface: keyword,
          'metricset.name': keyword,
        },
      },
    },
  });
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

  for (let ts = start; ts <= now; ts += INTERVAL_MS) {
    const t = new Date(ts).toISOString();
    const wave = 0.15 * Math.sin(ts / (30 * 60_000));

    for (const node of NODES) {
      const cpu = Math.min(0.95, Math.max(0.05, node.cpu + wave));
      const memory = Math.min(0.95, Math.max(0.05, node.memory + wave / 2));
      const disk = Math.min(0.95, Math.max(0.05, node.disk + wave / 3));

      docs.push({
        index: CLUSTER_STREAM,
        document: {
          '@timestamp': t,
          ...dataStreamFields(CLUSTER_DATASET),
          'metricset.name': 'node',
          'k8s.cluster.name': node.cluster,
          'k8s.node.name': node.name,
          'k8s.node.condition': 'Ready',
          'k8s.node.cpu.usage': cpu,
          'k8s.node.cpu.allocatable': 4,
          'k8s.node.cpu.utilization': cpu,
          'k8s.node.memory.usage': memory * 16 * 1024 ** 3,
          'k8s.node.memory.allocatable': 16 * 1024 ** 3,
          'k8s.node.memory.utilization': memory,
          'k8s.node.memory.working_set': memory * 14 * 1024 ** 3,
          'k8s.node.filesystem.usage': disk * 200 * 1024 ** 3,
          'k8s.node.filesystem.capacity': 200 * 1024 ** 3,
          'k8s.node.filesystem.utilization': disk,
          'metrics.k8s.node.cpu.usage': cpu,
          'metrics.k8s.node.cpu.allocatable': 4,
          'metrics.k8s.node.cpu.utilization': cpu,
          'metrics.k8s.node.memory.usage': memory * 16 * 1024 ** 3,
          'metrics.k8s.node.memory.allocatable': 16 * 1024 ** 3,
          'metrics.k8s.node.memory.utilization': memory,
          'metrics.k8s.node.memory.working_set': memory * 14 * 1024 ** 3,
          'resource.attributes.k8s.cluster.name': node.cluster,
          'resource.attributes.k8s.node.name': node.name,
        },
      });

      docs.push({
        index: HOSTMETRICS_STREAM,
        document: {
          '@timestamp': t,
          ...dataStreamFields(HOSTMETRICS_DATASET),
          'metricset.name': 'host',
          'host.name': node.name,
          'host.hostname': node.name,
          'k8s.cluster.name': node.cluster,
          'k8s.node.name': node.name,
          'metrics.system.cpu.utilization': cpu,
          'metrics.system.memory.utilization': memory,
          'metrics.system.filesystem.utilization': disk,
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
            '@timestamp': t,
            ...dataStreamFields(CLUSTER_DATASET),
            'metricset.name': 'deployment',
            'k8s.cluster.name': cluster.name,
            'k8s.namespace.name': 'default',
            'k8s.deployment.name': deployment,
            'k8s.deployment.pod.available': desired,
            'k8s.deployment.pod.desired': desired,
            'metrics.k8s.deployment.pod.available': desired,
            'metrics.k8s.deployment.pod.desired': desired,
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
      let offset = 0;

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
          '@timestamp': new Date(ts + offset++).toISOString(),
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
          '@timestamp': new Date(ts + offset++).toISOString(),
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
            '@timestamp': new Date(ts + offset++).toISOString(),
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
          '@timestamp': new Date(ts + offset++).toISOString(),
          ...dataStreamFields(CLUSTER_DATASET),
          'metricset.name': 'pod',
          'k8s.cluster.name': pod.cluster,
          'k8s.namespace.name': pod.namespace,
          'k8s.node.name': pod.node,
          'k8s.pod.uid': pod.uid,
          'k8s.pod.name': pod.name,
          'k8s.pod.phase': 'Running',
          'k8s.container.name': 'main',
          'k8s.container.restarts': podIndex === 3 ? 2 : 0,
          'metrics.k8s.container.restarts': podIndex === 3 ? 2 : 0,
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
): Promise<number> {
  const chunkSize = 500;
  let indexed = 0;

  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const body = chunk.flatMap(({ index, document }) => [{ index: { _index: index } }, document]);
    const response = await esClient.bulk({ refresh: false, body });
    if (response.errors) {
      const firstError = response.items.find((item) => item.index?.error)?.index?.error;
      logger.warn(
        `Kubernetes seed bulk had errors: ${firstError?.type ?? 'unknown'} — ${
          firstError?.reason ?? 'n/a'
        }`
      );
    }
    indexed += response.items.filter(
      (item) =>
        item.index?.result === 'created' ||
        item.index?.result === 'updated' ||
        item.index?.status === 201
    ).length;
  }

  await esClient.indices.refresh({
    index: [KUBELETSTATS_STREAM, CLUSTER_STREAM, HOSTMETRICS_STREAM],
    ignore_unavailable: true,
  });

  return indexed;
}

/** Seeds OTel Kubernetes metrics for managed kubernetes_otel dashboards. */
export async function seedKubernetesData(
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<SeedKubernetesResult> {
  await Promise.all([
    ensureDataStreamTemplate(esClient, `metrics-${KUBELETSTATS_DATASET}`, [
      `metrics-${KUBELETSTATS_DATASET}-*`,
    ]),
    ensureDataStreamTemplate(esClient, `metrics-${CLUSTER_DATASET}`, [
      `metrics-${CLUSTER_DATASET}-*`,
    ]),
    ensureDataStreamTemplate(esClient, `metrics-${HOSTMETRICS_DATASET}`, [
      `metrics-${HOSTMETRICS_DATASET}-*`,
    ]),
  ]);

  // Avoid TSDB time_series mode conflicts for prototype seeding — use plain data streams.
  // Templates above still define useful mappings; create data streams if missing.
  for (const stream of [KUBELETSTATS_STREAM, CLUSTER_STREAM, HOSTMETRICS_STREAM]) {
    try {
      await esClient.indices.createDataStream({ name: stream });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('resource_already_exists_exception') && !message.includes('already exists')) {
        logger.debug(`createDataStream(${stream}): ${message}`);
      }
    }
  }

  const docs = buildDocuments(Date.now());
  const documentsIndexed = await bulkIndex(esClient, docs, logger);

  return {
    documentsIndexed,
    dataStreams: [KUBELETSTATS_STREAM, CLUSTER_STREAM, HOSTMETRICS_STREAM],
  };
}
