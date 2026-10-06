/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Seeds synthetic K8s OTel metrics so the entity-centric lab dashboards
 * light up without a real collector.  Lab / prototype use only.
 */

import { z } from '@kbn/zod/v4';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';

// ---------------------------------------------------------------------------
// Entity topology — names match fake_entities.ts. Only resources with
// active inventory alerts are indexed (same health/alert hash as the list).
const CLUSTERS = ['k8s-eu-prod', 'k8s-us-prod'] as const;
const NODE_COUNT = 48;
const NAMESPACE_COUNT = 8;
const DEPLOYMENT_COUNT = 96;
const POD_COUNT = 597;

const NODE_SEED = ['node-prod-eu-04'] as const;
const NODE_SEED_HEALTH = ['unhealthy'] as const;
const NAMESPACE_SEED = ['payments', 'checkout', 'fraud', 'settlement'] as const;
const NAMESPACE_SEED_HEALTH = ['unhealthy', 'unhealthy', 'healthy', 'atRisk'] as const;
const POD_SEED = [
  'payments-pod-7f9b2',
  'batch-settlement-job-xk2p',
  'payments-pod-3ac1f',
  'fraud-pod-9a1c',
] as const;
const POD_SEED_HEALTH = ['unhealthy', 'atRisk', 'healthy', 'healthy'] as const;
const CLUSTER_SEED_HEALTH = ['atRisk', 'healthy'] as const;
const SEED_KINDS = new Set(['Clusters', 'Nodes', 'Namespaces', 'Deployments', 'Pods']);

const REGION_VALUES = [
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
  'ap-northeast-1',
  'sa-east-1',
  'af-south-1',
] as const;
const AILING_REGION = 'sa-east-1';
const STORY_ACTIVE_ALERTS = new Set(['payments-pod-7f9b2', 'node-prod-eu-04']);

const padIndex = (index: number, width: number): string =>
  String(index + 1).padStart(width, '0');

const inventoryHash = (input: string): number => {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33 + input.charCodeAt(i)) % 2147483647;
  }
  return hash;
};

const pickFrom = (pool: readonly string[], key: string): string =>
  pool[inventoryHash(key) % pool.length];

type LabHealth = 'healthy' | 'atRisk' | 'unhealthy';

const seededHealth = (seed: number, index: number): LabHealth => {
  const value = (seed * 31 + index * 17) % 100;
  if (value < 25) return 'unhealthy';
  if (value < 55) return 'atRisk';
  return 'healthy';
};

const regionAdjustedHealth = (base: LabHealth, region: string): LabHealth => {
  if (region === AILING_REGION) return 'unhealthy';
  return base === 'unhealthy' ? 'atRisk' : base;
};

const hasActiveAlerts = (name: string, health: LabHealth): boolean => {
  if (STORY_ACTIVE_ALERTS.has(name)) return true;
  const h = inventoryHash(`alerts-${name}`) % 100;
  const activeMax = health === 'unhealthy' ? 70 : health === 'atRisk' ? 30 : 5;
  const clearMax = health === 'unhealthy' ? 90 : health === 'atRisk' ? 80 : 75;
  if (h >= clearMax) return false;
  return h < activeMax;
};

interface KindSpec {
  label: string;
  total: number;
  seedNames: readonly string[];
  seedHealth: readonly LabHealth[];
  fallback: (index: number) => string;
}

const K8S_SPECS: readonly KindSpec[] = [
  {
    label: 'Clusters',
    total: 2,
    seedNames: CLUSTERS,
    seedHealth: CLUSTER_SEED_HEALTH,
    fallback: (i) => `cluster-${padIndex(i, 2)}`,
  },
  {
    label: 'Nodes',
    total: NODE_COUNT,
    seedNames: NODE_SEED,
    seedHealth: NODE_SEED_HEALTH,
    fallback: (i) => `node-${padIndex(i, 3)}`,
  },
  {
    label: 'Namespaces',
    total: NAMESPACE_COUNT,
    seedNames: NAMESPACE_SEED,
    seedHealth: NAMESPACE_SEED_HEALTH,
    fallback: (i) => `ns-${padIndex(i, 2)}`,
  },
  {
    label: 'Pods',
    total: POD_COUNT,
    seedNames: POD_SEED,
    seedHealth: POD_SEED_HEALTH,
    fallback: (i) => `pod-${padIndex(i, 3)}`,
  },
  { label: 'Containers', total: 320, seedNames: [], seedHealth: [], fallback: (i) => `container-${padIndex(i, 3)}` },
  {
    label: 'Deployments',
    total: DEPLOYMENT_COUNT,
    seedNames: [],
    seedHealth: [],
    fallback: (i) => `deployment-${padIndex(i, 3)}`,
  },
  { label: 'ReplicaSets', total: 12, seedNames: [], seedHealth: [], fallback: (i) => `replicaset-${padIndex(i, 3)}` },
  { label: 'StatefulSets', total: 4, seedNames: [], seedHealth: [], fallback: (i) => `statefulset-${padIndex(i, 2)}` },
  { label: 'DaemonSets', total: 3, seedNames: [], seedHealth: [], fallback: (i) => `daemonset-${padIndex(i, 2)}` },
  { label: 'CronJobs', total: 5, seedNames: [], seedHealth: [], fallback: (i) => `cronjob-${padIndex(i, 2)}` },
];

const namesForSpec = (spec: KindSpec): string[] =>
  Array.from({ length: spec.total }, (_, i) => spec.seedNames[i] ?? spec.fallback(i));

const alertingNamesByKind = (): Record<string, Set<string>> => {
  const salt = inventoryHash('kubernetes');
  const byKind: Record<string, Set<string>> = {};
  for (const label of SEED_KINDS) byKind[label] = new Set();
  let runningOffset = 0;
  for (const spec of K8S_SPECS) {
    for (let i = 0; i < spec.total; i++) {
      const name = spec.seedNames[i] ?? spec.fallback(i);
      const globalIndex = runningOffset + i;
      const region =
        REGION_VALUES[
          inventoryHash(`kubernetes-${spec.label}-region-${globalIndex}`) % REGION_VALUES.length
        ];
      const baseHealth =
        spec.seedHealth[i] ?? seededHealth(salt + globalIndex * 3, globalIndex);
      const health = regionAdjustedHealth(baseHealth, region);
      if (SEED_KINDS.has(spec.label) && hasActiveAlerts(name, health)) {
        byKind[spec.label].add(name);
      }
    }
    runningOffset += spec.total;
  }
  return byKind;
};

const CTR_NAMES = [
  'api-server',
  'sidecar-proxy',
  'worker',
  'nginx-proxy',
  'redis-cache',
  'frontend',
  'backend',
  'gateway',
  'scheduler',
  'logger',
  'etcd',
  'prometheus',
  'batch-proc',
  'cache',
  'ingress',
];

const POD_PHASES = [2, 2, 2, 2, 2, 2, 2, 1, 3, 4];

// ---------------------------------------------------------------------------
// Build topology arrays
// ---------------------------------------------------------------------------
interface Cluster {
  name: string;
}
interface Node {
  name: string;
  cluster: string;
}
interface Namespace {
  name: string;
  cluster: string;
}
interface Deploy {
  name: string;
  ns: string;
  cluster: string;
}
interface Pod {
  name: string;
  node: string;
  ns: string;
  cluster: string;
  deploy: string;
}

const buildTopology = () => {
  const alerting = alertingNamesByKind();
  const clusterSpec = K8S_SPECS.find((spec) => spec.label === 'Clusters')!;
  const nodeSpec = K8S_SPECS.find((spec) => spec.label === 'Nodes')!;
  const namespaceSpec = K8S_SPECS.find((spec) => spec.label === 'Namespaces')!;
  const deploySpec = K8S_SPECS.find((spec) => spec.label === 'Deployments')!;
  const podSpec = K8S_SPECS.find((spec) => spec.label === 'Pods')!;

  const allClusterNames = namesForSpec(clusterSpec);
  const allNodeNames = namesForSpec(nodeSpec);
  const allNamespaceNames = namesForSpec(namespaceSpec);
  const allDeployNames = namesForSpec(deploySpec);

  const clusters: Cluster[] = allClusterNames
    .filter((name) => alerting.Clusters.has(name))
    .map((name) => ({ name }));

  const nodes: Node[] = allNodeNames
    .filter((name) => alerting.Nodes.has(name))
    .map((name) => ({
      name,
      cluster: pickFrom(allClusterNames, `k8s-cluster-${name}`),
    }));

  const namespaces: Namespace[] = allNamespaceNames
    .filter((name) => alerting.Namespaces.has(name))
    .map((name) => ({
      name,
      cluster: pickFrom(allClusterNames, `k8s-cluster-${name}`),
    }));

  const deploys: Deploy[] = allDeployNames
    .filter((name) => alerting.Deployments.has(name))
    .map((name) => {
      const ns = pickFrom(allNamespaceNames, `k8s-ns-${name}`);
      return {
        name,
        ns,
        cluster: pickFrom(allClusterNames, `k8s-cluster-${name}`),
      };
    });

  const makePod = (name: string, deployOverride?: string): Pod => {
    const ns = pickFrom(allNamespaceNames, `k8s-ns-${name}`);
    return {
      name,
      node: pickFrom(allNodeNames, `k8s-node-${name}`),
      ns,
      cluster: pickFrom(allClusterNames, `k8s-cluster-${name}`),
      deploy: deployOverride ?? pickFrom(allDeployNames, `k8s-deploy-${name}`),
    };
  };

  const podByName = new Map<string, Pod>();
  const allPodNames = namesForSpec(podSpec);
  for (const name of allPodNames) {
    if (alerting.Pods.has(name)) podByName.set(name, makePod(name));
  }

  // Deployment dashboards filter on k8s.deployment.name and read pod metrics.
  // Attach a few inventory pods to each alerting deployment so those panels
  // have series even when the pods themselves are not alerting.
  for (const deploy of deploys) {
    let attached = 0;
    for (const podName of allPodNames) {
      if (attached >= 3) break;
      if (pickFrom(allDeployNames, `k8s-deploy-${podName}`) !== deploy.name) continue;
      if (!podByName.has(podName)) {
        podByName.set(podName, makePod(podName, deploy.name));
      } else {
        podByName.set(podName, { ...podByName.get(podName)!, deploy: deploy.name });
      }
      attached++;
    }
    if (attached === 0) {
      for (let replica = 1; replica <= 2; replica++) {
        const podName = `${deploy.name}-replica-${replica}`;
        podByName.set(podName, {
          name: podName,
          node: allNodeNames[0],
          ns: deploy.ns,
          cluster: deploy.cluster,
          deploy: deploy.name,
        });
      }
    }
  }

  const pods = [...podByName.values()];

  return { clusters, nodes, namespaces, deploys, pods };
};

// ---------------------------------------------------------------------------
// Random helpers
// ---------------------------------------------------------------------------
const rand = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo) + lo);
const randPhase = () => POD_PHASES[Math.floor(Math.random() * POD_PHASES.length)];

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33 + value.charCodeAt(i)) % 1000003;
  }
  return hash;
};

const ranged = (key: string, lo: number, hi: number): number => lo + (hashString(key) % (hi - lo));

/**
 * Cumulative bytes for a counter metric. RATE() needs a monotonic counter;
 * the sine term makes throughput vary instead of drawing a flat line.
 */
const cumulativeCounter = (basePerSec: number, elapsedSec: number, phase: number): number => {
  const period = 1200;
  const amp = 0.35;
  const omega = (2 * Math.PI) / period;
  const integral = elapsedSec - (amp / omega) * Math.cos(omega * elapsedSec + phase) + amp / omega;
  return Math.max(1, Math.round(basePerSec * integral));
};

const containersForPod = (podIndex: number): readonly string[] => {
  const primary = CTR_NAMES[podIndex % CTR_NAMES.length];
  const secondary = CTR_NAMES[(podIndex + 5) % CTR_NAMES.length];
  return primary === secondary ? [primary] : [primary, secondary];
};

const NETWORK_DIRECTIONS = ['receive', 'transmit'] as const;

// ---------------------------------------------------------------------------
// Generate documents for a single timestamp
// ---------------------------------------------------------------------------
const CDS = 'metrics-k8sclusterreceiver.otel-default';
const KDS = 'metrics-kubeletstatsreceiver.otel-default';
const LDS = 'logs-k8seventsreceiver.otel-default';

const LOG_MSGS = [
  'Pod scheduled on node',
  'Container started',
  'Liveness probe failed',
  'Pulling image',
  'Back-off restarting',
  'Readiness probe succeeded',
  'Volume mounted',
  'Successfully pulled image',
  'Scaled up replica set',
  'Deployment updated',
];
const LOG_SEVS = [
  'Info',
  'Info',
  'Warning',
  'Info',
  'Warning',
  'Info',
  'Info',
  'Info',
  'Info',
  'Info',
];

interface BulkOp {
  index: string;
  doc: Record<string, unknown>;
  /** Applied on first sight of a metric so TSDB maps it as a counter or gauge. */
  dynamicTemplates?: Record<string, string>;
}

const generateDocsForTimestamp = (
  ts: string,
  elapsedSec: number,
  clusters: Cluster[],
  namespaces: Namespace[],
  nodes: Node[],
  deploys: Deploy[],
  pods: Pod[]
): BulkOp[] => {
  const ops: BulkOp[] = [];
  const ra = (attrs: Record<string, unknown>) => ({ resource: { attributes: attrs } });

  // Cluster docs so Cluster Detail dashboards have a matching series.
  for (const { name } of clusters) {
    ops.push({
      index: CDS,
      doc: {
        '@timestamp': ts,
        ...ra({
          'k8s.cluster.name': name,
        }),
      },
    });
  }

  // Node metrics (cluster-receiver)
  for (const { name, cluster } of nodes) {
    ops.push({
      index: CDS,
      doc: {
        '@timestamp': ts,
        ...ra({
          'k8s.cluster.name': cluster,
          'k8s.node.name': name,
          'k8s.node.condition_ready': 1,
          'k8s.node.condition_memory_pressure': 0,
          'k8s.node.cpu.usage': rand(100, 900) / 1000,
          'k8s.node.memory.available': rand(8e9, 16e9),
          'k8s.node.memory.working_set': rand(2e9, 8e9),
          'k8s.node.memory.rss': rand(1e9, 6e9),
          'k8s.node.allocatable_cpu': rand(4, 8),
          'k8s.node.allocatable_memory': rand(16e9, 32e9),
          'k8s.node.filesystem.capacity': 107374182400,
          'k8s.node.filesystem.usage': rand(20e9, 60e9),
        }),
      },
    });
  }

  // Namespace docs
  for (const { name, cluster } of namespaces) {
    ops.push({
      index: CDS,
      doc: {
        '@timestamp': ts,
        ...ra({
          'k8s.cluster.name': cluster,
          'k8s.namespace.name': name,
          'k8s.namespace.phase': 1,
        }),
      },
    });
  }

  // Deployment metrics
  for (const { name, ns, cluster } of deploys) {
    const desired = rand(2, 5);
    ops.push({
      index: CDS,
      doc: {
        '@timestamp': ts,
        ...ra({
          'k8s.cluster.name': cluster,
          'k8s.namespace.name': ns,
          'k8s.deployment.name': name,
          'k8s.workload.name': name,
          'k8s.deployment.desired': desired,
          'k8s.deployment.available': rand(1, desired + 1),
        }),
      },
    });
  }

  // Pod phase + container info (cluster-receiver)
  for (let pi = 0; pi < pods.length; pi++) {
    const { name, node, ns, cluster, deploy } = pods[pi];
    ops.push({
      index: CDS,
      doc: {
        '@timestamp': ts,
        ...ra({
          'k8s.cluster.name': cluster,
          'k8s.namespace.name': ns,
          'k8s.node.name': node,
          'k8s.pod.name': name,
          'k8s.pod.uid': `uid-${name}`,
          'k8s.pod.phase': randPhase(),
          'k8s.deployment.name': deploy,
          'k8s.object.name': name,
          'k8s.object.kind': 'Pod',
        }),
      },
    });
    for (const ctr of containersForPod(pi)) {
      ops.push({
        index: CDS,
        doc: {
          '@timestamp': ts,
          ...ra({
            'k8s.cluster.name': cluster,
            'k8s.namespace.name': ns,
            'k8s.node.name': node,
            'k8s.pod.name': name,
            'k8s.pod.uid': `uid-${name}`,
            'k8s.deployment.name': deploy,
            'k8s.container.name': ctr,
            'k8s.container.restarts': rand(0, 3),
            // Numeric: the pod detail table compares ready == 1 / == 0.
            'k8s.container.ready': 1,
            'k8s.container.cpu_limit': 2.0,
            'k8s.container.cpu_request': 0.5,
            'k8s.container.memory_limit': 2147483648,
            'k8s.container.memory_request': 536870912,
          }),
        },
      });
    }
  }

  // Kubelet — pod resource usage
  for (const { name, node, ns, cluster, deploy } of pods) {
    ops.push({
      index: KDS,
      doc: {
        '@timestamp': ts,
        ...ra({
          'k8s.cluster.name': cluster,
          'k8s.namespace.name': ns,
          'k8s.node.name': node,
          'k8s.pod.name': name,
          'k8s.pod.uid': `uid-${name}`,
          'k8s.pod.phase': randPhase(),
          'k8s.deployment.name': deploy,
          'k8s.pod.cpu.usage': rand(10, 500) / 1000,
          'k8s.pod.memory.working_set': rand(1e8, 5e8),
          'k8s.pod.memory.rss': rand(8e7, 4e8),
          'k8s.pod.memory.available': rand(5e8, 15e8),
          'k8s.pod.memory_limit_utilization': rand(10, 80) / 100,
          'k8s.pod.cpu_limit_utilization': rand(5, 60) / 100,
        }),
      },
    });
  }

  // Kubelet — per-container gauges. Pod detail charts read container.cpu.usage
  // and container.memory.working_set from this data stream (not k8s.container.*).
  for (let pi = 0; pi < pods.length; pi++) {
    const { name, node, ns, cluster, deploy } = pods[pi];
    const containers = containersForPod(pi);
    for (const [ci, ctr] of containers.entries()) {
      const phase = (hashString(`${name}:${ctr}`) % 628) / 100;
      const cpuMid = 0.15 + ci * 0.2;
      ops.push({
        index: KDS,
        dynamicTemplates: {
          'metrics.container.cpu.usage': 'gauge_double',
          'metrics.container.memory.working_set': 'gauge_long',
        },
        doc: {
          '@timestamp': ts,
          ...ra({
            'k8s.cluster.name': cluster,
            'k8s.namespace.name': ns,
            'k8s.node.name': node,
            'k8s.pod.name': name,
            'k8s.pod.uid': `uid-${name}`,
            'k8s.deployment.name': deploy,
            'k8s.container.name': ctr,
            'k8s.container.ready': 1,
            'k8s.container.restarts': ci,
          }),
          metrics: {
            'container.cpu.usage': Number(
              (cpuMid + 0.08 * Math.sin(elapsedSec / 400 + phase)).toFixed(4)
            ),
            'container.memory.working_set': Math.round(
              1.2e8 + ci * 8e7 + 3e7 * Math.sin(elapsedSec / 500 + phase)
            ),
          },
        },
      });
    }
  }

  // Kubelet — pod network counters, one series per direction.
  // Namespace, deployment, and pod Network I/O panels all RATE() this metric
  // and split the series on `direction`.
  for (const { name, node, ns, cluster, deploy } of pods) {
    for (const direction of NETWORK_DIRECTIONS) {
      const base = ranged(
        `${name}:${direction}`,
        direction === 'receive' ? 2e5 : 8e4,
        direction === 'receive' ? 2e6 : 8e5
      );
      ops.push({
        index: KDS,
        dynamicTemplates: { 'metrics.k8s.pod.network.io': 'counter_long' },
        doc: {
          '@timestamp': ts,
          attributes: { direction },
          metrics: {
            'k8s.pod.network.io': cumulativeCounter(base, elapsedSec, hashString(name) % 7),
          },
          ...ra({
            'k8s.cluster.name': cluster,
            'k8s.namespace.name': ns,
            'k8s.node.name': node,
            'k8s.pod.name': name,
            'k8s.pod.uid': `uid-${name}`,
            'k8s.deployment.name': deploy,
          }),
        },
      });
    }
  }

  // Kubelet — node resource usage
  for (const { name, cluster } of nodes) {
    ops.push({
      index: KDS,
      doc: {
        '@timestamp': ts,
        ...ra({
          'k8s.cluster.name': cluster,
          'k8s.node.name': name,
          'k8s.node.cpu.usage': rand(100, 900) / 1000,
          'k8s.node.memory.working_set': rand(2e9, 8e9),
          'k8s.node.memory.available': rand(8e9, 16e9),
          'k8s.node.memory.rss': rand(1e9, 6e9),
          'k8s.node.filesystem.capacity': 107374182400,
          'k8s.node.filesystem.usage': rand(20e9, 60e9),
        }),
      },
    });
  }

  // Kubelet — node network counters, one series per direction.
  // The node detail Network I/O panel RATE()s this metric and splits on `direction`.
  for (const { name, cluster } of nodes) {
    for (const direction of NETWORK_DIRECTIONS) {
      const base = ranged(
        `node:${name}:${direction}`,
        direction === 'receive' ? 5e5 : 2e5,
        direction === 'receive' ? 8e6 : 3e6
      );
      ops.push({
        index: KDS,
        dynamicTemplates: { 'metrics.k8s.node.network.io': 'counter_long' },
        doc: {
          '@timestamp': ts,
          attributes: { direction },
          metrics: {
            'k8s.node.network.io': cumulativeCounter(base, elapsedSec, hashString(name) % 7),
          },
          ...ra({ 'k8s.cluster.name': cluster, 'k8s.node.name': name }),
        },
      });
    }
  }

  // Kubelet — volume stats. Deployment Detail volume panels require
  // k8s.deployment.name on the same docs as k8s.volume.{available,capacity},
  // and TS/STATS need those values as gauges (not resource-attribute dimensions).
  for (const { name, ns, cluster, deploy, node } of pods) {
    const capacity = 10737418240;
    const available = ranged(`${name}:vol`, 2e9, 8e9);
    ops.push({
      index: KDS,
      dynamicTemplates: {
        'metrics.k8s.volume.available': 'gauge_long',
        'metrics.k8s.volume.capacity': 'gauge_long',
      },
      doc: {
        '@timestamp': ts,
        metrics: {
          'k8s.volume.available': available,
          'k8s.volume.capacity': capacity,
        },
        ...ra({
          'k8s.cluster.name': cluster,
          'k8s.namespace.name': ns,
          'k8s.deployment.name': deploy,
          'k8s.workload.name': deploy,
          'k8s.node.name': node,
          'k8s.pod.name': name,
          'k8s.pod.uid': `uid-${name}`,
          'k8s.volume.name': 'data-vol',
        }),
      },
    });
  }

  // Event logs
  for (let li = 0; li < 6; li++) {
    const pod = pods[Math.floor(Math.random() * pods.length)];
    const mi = Math.floor(Math.random() * LOG_MSGS.length);
    ops.push({
      index: LDS,
      doc: {
        '@timestamp': ts,
        body: { text: LOG_MSGS[mi] },
        severity_text: LOG_SEVS[mi],
        ...ra({
          'k8s.cluster.name': pod.cluster,
          'k8s.namespace.name': pod.ns,
          'k8s.pod.name': pod.name,
          'k8s.node.name': pod.node,
          'k8s.object.name': pod.name,
          'k8s.object.kind': 'Pod',
        }),
      },
    });
  }

  return ops;
};

// ---------------------------------------------------------------------------
// Bulk index helper (chunks of 500 actions)
// ---------------------------------------------------------------------------
const CHUNK_SIZE = 2000;

const bulkIndex = async (esClient: ElasticsearchClient, ops: BulkOp[], logger: Logger) => {
  let ok = 0;
  let failed = 0;

  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const body: Array<Record<string, unknown>> = [];
    for (const { index, doc, dynamicTemplates } of chunk) {
      body.push({
        create: {
          _index: index,
          ...(dynamicTemplates ? { dynamic_templates: dynamicTemplates } : {}),
        },
      });
      body.push(doc);
    }
    const resp = await esClient.bulk({ body, refresh: false });
    if (resp.errors) {
      for (const item of resp.items) {
        const status = item.create?.status ?? 0;
        if (status >= 200 && status < 300) {
          ok++;
        } else {
          failed++;
          if (failed <= 3) {
            logger.warn(`Seed bulk error: ${JSON.stringify(item.create?.error)}`);
          }
        }
      }
    } else {
      ok += chunk.length;
    }
  }

  return { ok, failed };
};

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

const seedK8sDataRoute = createServerRoute({
  endpoint: 'POST /internal/streams/entity_centric_lab/seed_k8s_data',
  options: {
    access: 'internal',
    summary: 'Seed synthetic K8s OTel data for the entity-centric lab dashboards',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      hours: z.number().min(1).max(48).default(8),
      intervalMinutes: z.number().min(1).max(60).default(5),
      deleteExisting: z.boolean().default(true),
    }),
  }),
  handler: async ({ params, request, getScopedClients, logger }) => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const esClient = scopedClusterClient.asCurrentUser;

    const { hours, intervalMinutes, deleteExisting } = params.body;
    const numSamples = Math.floor((hours * 60) / intervalMinutes);

    // Optionally delete existing data streams
    if (deleteExisting) {
      for (const ds of [CDS, KDS, LDS]) {
        try {
          await esClient.indices.deleteDataStream({ name: ds });
          logger.info(`Deleted data stream: ${ds}`);
        } catch (e) {
          // Ignore 404 (doesn't exist yet)
        }
      }
    }

    // Build topology matching the inventory (every cluster/node/ns/deploy/pod).
    const { clusters, nodes, namespaces, deploys, pods } = buildTopology();

    // Oldest sample first so counter values increase with @timestamp.
    // Index one interval at a time so the full inventory does not sit in RAM.
    const now = Date.now();
    let ok = 0;
    let failed = 0;
    let docsPerInterval = 0;
    for (let i = 0; i < numSamples; i++) {
      const elapsedSec = i * intervalMinutes * 60;
      const epoch = now - (numSamples - 1 - i) * intervalMinutes * 60 * 1000;
      const ops = generateDocsForTimestamp(
        new Date(epoch).toISOString(),
        elapsedSec,
        clusters,
        namespaces,
        nodes,
        deploys,
        pods
      );
      if (i === 0) docsPerInterval = ops.length;
      const indexed = await bulkIndex(esClient, ops, logger);
      ok += indexed.ok;
      failed += indexed.failed;
    }

    // Refresh
    try {
      await esClient.indices.refresh({ index: [CDS, KDS, LDS].join(',') });
    } catch (e) {
      // Ignore
    }

    logger.info(
      `Seeded K8s OTel data: ${ok} docs indexed, ${failed} failed ` +
        `(${numSamples} intervals × ${docsPerInterval} docs/interval over ${hours}h)`
    );

    return {
      success: failed === 0,
      indexed: ok,
      failed,
      intervals: numSamples,
      hours,
      intervalMinutes,
      topology: {
        clusters: clusters.length,
        nodes: nodes.length,
        namespaces: namespaces.length,
        deployments: deploys.length,
        pods: pods.length,
      },
    };
  },
});

export const entityCentricLabRoutes = {
  ...seedK8sDataRoute,
};
