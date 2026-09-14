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
// Entity topology (matches fake_entities.ts)
// ---------------------------------------------------------------------------
const C1 = 'k8s-eu-prod';
const C2 = 'k8s-us-prod';

const ALL_NS = ['payments', 'checkout', 'fraud', 'settlement', 'kube-system', 'ns-05', 'ns-06', 'ns-07', 'ns-08'] as const;
const NS_CLUSTER: Record<string, string> = {
  payments: C1, checkout: C1, fraud: C1,
  settlement: C2, 'kube-system': C2,
  'ns-05': C1, 'ns-06': C2, 'ns-07': C2, 'ns-08': C1,
};

const buildNodes = () => {
  const nodes: Array<{ name: string; cluster: string }> = [
    { name: 'node-prod-eu-04', cluster: C1 },
  ];
  for (let i = 1; i <= 24; i++) {
    const name = `node-${String(i).padStart(3, '0')}`;
    nodes.push({ name, cluster: i % 2 === 1 ? C1 : C2 });
  }
  return nodes;
};

const SEED_PODS = ['payments-pod-7f9b2', 'payments-pod-3ac1f', 'batch-settlement-job-xk2p', 'fraud-pod-9a1c'];
const SEED_POD_NODES = ['node-prod-eu-04', 'node-001', 'node-002', 'node-003'];
const SEED_POD_NS = ['payments', 'payments', 'settlement', 'fraud'];
const SEED_POD_DEPLOY = ['payments-api', 'payments-api', 'deployment-001', 'fraud-detector'];

const NAMED_DEPLOYS = ['payments-api', 'checkout-svc', 'fraud-detector'];
const NAMED_DEPLOY_NS = ['payments', 'checkout', 'fraud'];

const CTR_NAMES = [
  'api-server', 'sidecar-proxy', 'worker', 'nginx-proxy', 'redis-cache',
  'frontend', 'backend', 'gateway', 'scheduler', 'logger',
  'etcd', 'prometheus', 'batch-proc', 'cache', 'ingress',
];

const POD_PHASES = [2, 2, 2, 2, 2, 2, 2, 1, 3, 4];

// ---------------------------------------------------------------------------
// Build topology arrays
// ---------------------------------------------------------------------------
interface Pod { name: string; node: string; ns: string; cluster: string; deploy: string }
interface Deploy { name: string; ns: string; cluster: string }

const buildTopology = () => {
  const nodes = buildNodes();

  const deploys: Deploy[] = NAMED_DEPLOYS.map((name, i) => ({
    name, ns: NAMED_DEPLOY_NS[i], cluster: C1,
  }));
  for (let i = 1; i <= 24; i++) {
    const nsIdx = (i - 1) % ALL_NS.length;
    deploys.push({
      name: `deployment-${String(i).padStart(3, '0')}`,
      ns: ALL_NS[nsIdx],
      cluster: NS_CLUSTER[ALL_NS[nsIdx]],
    });
  }

  const pods: Pod[] = SEED_PODS.map((name, i) => ({
    name,
    node: SEED_POD_NODES[i],
    ns: SEED_POD_NS[i],
    cluster: NS_CLUSTER[SEED_POD_NS[i]],
    deploy: SEED_POD_DEPLOY[i],
  }));
  for (let i = 1; i <= 48; i++) {
    const nodeIdx = (i - 1) % nodes.length;
    const nsIdx = (i - 1) % ALL_NS.length;
    const deployIdx = (i - 1) % deploys.length;
    const ns = ALL_NS[nsIdx];
    pods.push({
      name: `pod-${String(i).padStart(3, '0')}`,
      node: nodes[nodeIdx].name,
      ns,
      cluster: NS_CLUSTER[ns],
      deploy: deploys[deployIdx].name,
    });
  }

  return { nodes, deploys, pods };
};

// ---------------------------------------------------------------------------
// Random helpers
// ---------------------------------------------------------------------------
const rand = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo) + lo);
const randPhase = () => POD_PHASES[Math.floor(Math.random() * POD_PHASES.length)];

// ---------------------------------------------------------------------------
// Generate documents for a single timestamp
// ---------------------------------------------------------------------------
const CDS = 'metrics-k8sclusterreceiver.otel-default';
const KDS = 'metrics-kubeletstatsreceiver.otel-default';
const LDS = 'logs-k8seventsreceiver.otel-default';

const LOG_MSGS = [
  'Pod scheduled on node', 'Container started', 'Liveness probe failed',
  'Pulling image', 'Back-off restarting', 'Readiness probe succeeded',
  'Volume mounted', 'Successfully pulled image', 'Scaled up replica set',
  'Deployment updated',
];
const LOG_SEVS = ['Info', 'Info', 'Warning', 'Info', 'Warning', 'Info', 'Info', 'Info', 'Info', 'Info'];

interface BulkOp { index: string; doc: Record<string, unknown> }

const generateDocsForTimestamp = (
  ts: string,
  nodes: ReturnType<typeof buildNodes>,
  deploys: Deploy[],
  pods: Pod[]
): BulkOp[] => {
  const ops: BulkOp[] = [];
  const ra = (attrs: Record<string, unknown>) => ({ resource: { attributes: attrs } });

  // Node metrics (cluster-receiver)
  for (const { name, cluster } of nodes) {
    ops.push({ index: CDS, doc: {
      '@timestamp': ts,
      ...ra({
        'k8s.cluster.name': cluster, 'k8s.node.name': name,
        'k8s.node.condition_ready': 1, 'k8s.node.condition_memory_pressure': 0,
        'k8s.node.cpu.usage': rand(100, 900) / 1000,
        'k8s.node.memory.available': rand(8e9, 16e9),
        'k8s.node.memory.working_set': rand(2e9, 8e9),
        'k8s.node.memory.rss': rand(1e9, 6e9),
        'k8s.node.allocatable_cpu': rand(4, 8),
        'k8s.node.allocatable_memory': rand(16e9, 32e9),
        'k8s.node.filesystem.capacity': 107374182400,
        'k8s.node.filesystem.usage': rand(20e9, 60e9),
        'k8s.node.network.io': rand(10e6, 500e6),
      }),
    }});
  }

  // Namespace docs
  for (const ns of ALL_NS) {
    ops.push({ index: CDS, doc: {
      '@timestamp': ts,
      ...ra({ 'k8s.cluster.name': NS_CLUSTER[ns], 'k8s.namespace.name': ns, 'k8s.namespace.phase': 1 }),
    }});
  }

  // Deployment metrics
  for (const { name, ns, cluster } of deploys) {
    const desired = rand(2, 5);
    ops.push({ index: CDS, doc: {
      '@timestamp': ts,
      ...ra({
        'k8s.cluster.name': cluster, 'k8s.namespace.name': ns,
        'k8s.deployment.name': name,
        'k8s.deployment.desired': desired, 'k8s.deployment.available': rand(1, desired + 1),
      }),
    }});
  }

  // Pod phase + container info (cluster-receiver)
  for (let pi = 0; pi < pods.length; pi++) {
    const { name, node, ns, cluster, deploy } = pods[pi];
    ops.push({ index: CDS, doc: {
      '@timestamp': ts,
      ...ra({
        'k8s.cluster.name': cluster, 'k8s.namespace.name': ns, 'k8s.node.name': node,
        'k8s.pod.name': name, 'k8s.pod.uid': `uid-${name}`, 'k8s.pod.phase': randPhase(),
        'k8s.deployment.name': deploy,
        'k8s.object.name': name, 'k8s.object.kind': 'Pod',
      }),
    }});
    const ctr = CTR_NAMES[pi % CTR_NAMES.length];
    ops.push({ index: CDS, doc: {
      '@timestamp': ts,
      ...ra({
        'k8s.cluster.name': cluster, 'k8s.namespace.name': ns, 'k8s.node.name': node,
        'k8s.pod.name': name, 'k8s.pod.uid': `uid-${name}`,
        'k8s.container.name': ctr, 'k8s.container.restarts': rand(0, 3),
        'k8s.container.ready': true,
        'k8s.container.cpu_limit': 2.0, 'k8s.container.cpu_request': 0.5,
        'k8s.container.memory_limit': 2147483648, 'k8s.container.memory_request': 536870912,
      }),
    }});
  }

  // Kubelet — pod resource usage
  for (const { name, node, ns, cluster, deploy } of pods) {
    ops.push({ index: KDS, doc: {
      '@timestamp': ts,
      ...ra({
        'k8s.cluster.name': cluster, 'k8s.namespace.name': ns, 'k8s.node.name': node,
        'k8s.pod.name': name, 'k8s.pod.uid': `uid-${name}`, 'k8s.pod.phase': randPhase(),
        'k8s.deployment.name': deploy,
        'k8s.pod.cpu.usage': rand(10, 500) / 1000,
        'k8s.pod.memory.working_set': rand(1e8, 5e8),
        'k8s.pod.memory.rss': rand(8e7, 4e8),
        'k8s.pod.memory.available': rand(5e8, 15e8),
        'k8s.pod.memory_limit_utilization': rand(10, 80) / 100,
        'k8s.pod.cpu_limit_utilization': rand(5, 60) / 100,
        'k8s.pod.network.io': rand(1e6, 5e7),
      }),
    }});
  }

  // Kubelet — node resource usage
  for (const { name, cluster } of nodes) {
    ops.push({ index: KDS, doc: {
      '@timestamp': ts,
      ...ra({
        'k8s.cluster.name': cluster, 'k8s.node.name': name,
        'k8s.node.cpu.usage': rand(100, 900) / 1000,
        'k8s.node.memory.working_set': rand(2e9, 8e9),
        'k8s.node.memory.available': rand(8e9, 16e9),
        'k8s.node.memory.rss': rand(1e9, 6e9),
        'k8s.node.filesystem.capacity': 107374182400,
        'k8s.node.filesystem.usage': rand(20e9, 60e9),
        'k8s.node.network.io': rand(10e6, 500e6),
      }),
    }});
  }

  // Kubelet — volume stats
  for (const { name, ns, cluster } of pods) {
    ops.push({ index: KDS, doc: {
      '@timestamp': ts,
      ...ra({
        'k8s.cluster.name': cluster, 'k8s.namespace.name': ns,
        'k8s.pod.name': name, 'k8s.pod.uid': `uid-${name}`,
        'k8s.volume.name': 'data-vol',
        'k8s.volume.capacity': 10737418240, 'k8s.volume.available': rand(2e9, 8e9),
      }),
    }});
  }

  // Event logs
  for (let li = 0; li < 6; li++) {
    const pod = pods[Math.floor(Math.random() * pods.length)];
    const mi = Math.floor(Math.random() * LOG_MSGS.length);
    ops.push({ index: LDS, doc: {
      '@timestamp': ts,
      body: { text: LOG_MSGS[mi] },
      severity_text: LOG_SEVS[mi],
      ...ra({
        'k8s.cluster.name': pod.cluster, 'k8s.namespace.name': pod.ns,
        'k8s.pod.name': pod.name, 'k8s.node.name': pod.node,
        'k8s.object.name': pod.name, 'k8s.object.kind': 'Pod',
      }),
    }});
  }

  return ops;
};

// ---------------------------------------------------------------------------
// Bulk index helper (chunks of 500 actions)
// ---------------------------------------------------------------------------
const CHUNK_SIZE = 500;

const bulkIndex = async (esClient: ElasticsearchClient, ops: BulkOp[], logger: Logger) => {
  let ok = 0;
  let failed = 0;

  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const body: Array<Record<string, unknown>> = [];
    for (const { index, doc } of chunk) {
      body.push({ create: { _index: index } });
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

    // Build topology
    const { nodes, deploys, pods } = buildTopology();

    // Generate timestamps
    const now = Date.now();
    const timestamps: string[] = [];
    for (let i = 0; i < numSamples; i++) {
      const epoch = now - i * intervalMinutes * 60 * 1000;
      timestamps.push(new Date(epoch).toISOString());
    }

    // Generate all docs
    const allOps: BulkOp[] = [];
    for (const ts of timestamps) {
      allOps.push(...generateDocsForTimestamp(ts, nodes, deploys, pods));
    }

    // Bulk index
    const { ok, failed } = await bulkIndex(esClient, allOps, logger);

    // Refresh
    try {
      await esClient.indices.refresh({ index: [CDS, KDS, LDS].join(',') });
    } catch (e) {
      // Ignore
    }

    const docsPerInterval =
      nodes.length + ALL_NS.length + deploys.length + pods.length * 4 + nodes.length + 6;
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
        nodes: nodes.length,
        namespaces: ALL_NS.length,
        deployments: deploys.length,
        pods: pods.length,
      },
    };
  },
});

export const entityCentricLabRoutes = {
  ...seedK8sDataRoute,
};
