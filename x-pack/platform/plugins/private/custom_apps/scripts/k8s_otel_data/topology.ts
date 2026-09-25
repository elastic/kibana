/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hexFrom, intFrom, noise, pick, suffix, uuidFrom } from './signals';
import type { ScenarioKind } from './scenarios';

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;

export interface NamespaceProfile {
  name: string;
  /** Relative share of a cluster's pods. */
  weight: number;
  cpuLimit: number;
  memLimit: number;
  /** Baseline utilisation as a fraction of the limit. */
  cpuBase: number;
  memBase: number;
  /** 0 keeps the series flat, 1 gives it the full day/night swing. */
  diurnal: number;
  deployments: readonly string[];
}

/**
 * Hand-written rather than randomised: a cluster only reads as real when
 * `kube-system` is flat and boring, `search` is hot and spiky, and `staging` is
 * mostly idle. Random baselines produce a uniform fog.
 */
export const NAMESPACES: readonly NamespaceProfile[] = [
  {
    name: 'kube-system',
    weight: 8,
    cpuLimit: 0.5,
    memLimit: 512 * MIB,
    cpuBase: 0.18,
    memBase: 0.55,
    diurnal: 0.1,
    deployments: ['coredns', 'kube-proxy', 'metrics-server', 'cluster-autoscaler'],
  },
  {
    name: 'istio-system',
    weight: 7,
    cpuLimit: 2,
    memLimit: 1 * GIB,
    cpuBase: 0.42,
    memBase: 0.61,
    diurnal: 0.9,
    deployments: ['istiod', 'istio-ingressgateway', 'istio-egressgateway'],
  },
  {
    name: 'checkout',
    weight: 14,
    cpuLimit: 2,
    memLimit: 2 * GIB,
    cpuBase: 0.55,
    memBase: 0.68,
    diurnal: 1,
    deployments: ['checkout-api', 'checkout-worker', 'cart-service'],
  },
  {
    name: 'payments',
    weight: 11,
    cpuLimit: 2,
    memLimit: 4 * GIB,
    cpuBase: 0.48,
    memBase: 0.74,
    diurnal: 0.85,
    deployments: ['payments-api', 'payments-ledger', 'fraud-detector'],
  },
  {
    name: 'search',
    weight: 12,
    cpuLimit: 4,
    memLimit: 8 * GIB,
    cpuBase: 0.66,
    memBase: 0.81,
    diurnal: 0.8,
    deployments: ['search-api', 'search-indexer', 'query-router'],
  },
  {
    name: 'analytics',
    weight: 9,
    cpuLimit: 4,
    memLimit: 16 * GIB,
    cpuBase: 0.3,
    memBase: 0.88,
    diurnal: 0.4,
    deployments: ['analytics-etl', 'event-collector', 'report-builder'],
  },
  {
    name: 'frontend',
    weight: 16,
    cpuLimit: 1,
    memLimit: 1 * GIB,
    cpuBase: 0.38,
    memBase: 0.42,
    diurnal: 1,
    deployments: ['web-ui', 'bff-gateway', 'asset-server'],
  },
  {
    name: 'observability',
    weight: 9,
    cpuLimit: 1,
    memLimit: 2 * GIB,
    cpuBase: 0.25,
    memBase: 0.7,
    diurnal: 0.2,
    deployments: ['otel-collector', 'prometheus-adapter', 'log-shipper'],
  },
  {
    name: 'ml-serving',
    weight: 6,
    cpuLimit: 8,
    memLimit: 16 * GIB,
    cpuBase: 0.72,
    memBase: 0.79,
    diurnal: 0.5,
    deployments: ['model-server', 'feature-store', 'inference-router'],
  },
  {
    name: 'staging',
    weight: 8,
    cpuLimit: 1,
    memLimit: 1 * GIB,
    cpuBase: 0.09,
    memBase: 0.22,
    diurnal: 0.3,
    deployments: ['staging-api', 'staging-web'],
  },
];

export interface Cluster {
  name: string;
  uid: string;
  region: string;
  zones: readonly string[];
  provider: string;
  platform: string;
  accountId: string;
}

export interface K8sNode {
  name: string;
  uid: string;
  cluster: Cluster;
  zone: string;
  cpuCores: number;
  memoryBytes: number;
  filesystemBytes: number;
}

export interface Deployment {
  name: string;
  uid: string;
  namespace: NamespaceProfile;
  cluster: Cluster;
  replicaSet: string;
  desired: number;
}

export interface Pod {
  name: string;
  uid: string;
  cluster: Cluster;
  namespace: NamespaceProfile;
  node: K8sNode;
  deployment: Deployment;
  environment: string;
  serviceVersion: string;
  startTimeMs: number;
  cpuLimit: number;
  memLimit: number;
  /** Per-pod personality, so two replicas of one deployment are not identical. */
  cpuBase: number;
  memBase: number;
  networkBase: number;
  scenario: ScenarioKind;
  containers: Container[];
  volumes: Volume[];
}

export interface Container {
  name: string;
  id: string;
  image: string;
  imageTag: string;
  cpuLimit: number;
  memLimit: number;
}

export interface Volume {
  name: string;
  type: string;
  claim: string;
  capacityBytes: number;
}

export interface Topology {
  clusters: Cluster[];
  nodes: K8sNode[];
  deployments: Deployment[];
  pods: Pod[];
}

export interface TopologyOptions {
  seed: number;
  clusterCount: number;
  podsPerCluster: number[];
  nodesPerCluster: number[];
  /** How many pods get a failure archetype, spread across clusters. */
  unhealthy: number;
  nowMs: number;
}

const CLUSTER_SITES = [
  { name: 'k8s-eu-prod', region: 'eu-west-1', zones: ['eu-west-1a', 'eu-west-1b', 'eu-west-1c'] },
  { name: 'k8s-us-prod', region: 'us-east-1', zones: ['us-east-1a', 'us-east-1b', 'us-east-1d'] },
  { name: 'k8s-ap-prod', region: 'ap-south-1', zones: ['ap-south-1a', 'ap-south-1b'] },
];

const SCENARIO_ROTATION: ScenarioKind[] = [
  'cpu_hot',
  'mem_leak',
  'crashloop',
  'noisy_network',
  'flapping',
];

/** Distributes a total across weights, giving any rounding remainder to the largest. */
const distribute = (total: number, weights: number[]): number[] => {
  const sum = weights.reduce((acc, weight) => acc + weight, 0);
  const counts = weights.map((weight) => Math.floor((total * weight) / sum));
  let remainder = total - counts.reduce((acc, count) => acc + count, 0);
  const order = weights.map((_, index) => index).sort((a, b) => weights[b] - weights[a]);
  for (let index = 0; remainder > 0; index = (index + 1) % order.length, remainder--) {
    counts[order[index]]++;
  }
  return counts;
};

export const buildTopology = ({
  seed,
  clusterCount,
  podsPerCluster,
  nodesPerCluster,
  unhealthy,
  nowMs,
}: TopologyOptions): Topology => {
  const clusters: Cluster[] = [];
  const nodes: K8sNode[] = [];
  const deployments: Deployment[] = [];
  const pods: Pod[] = [];

  for (let index = 0; index < clusterCount; index++) {
    const site = CLUSTER_SITES[index % CLUSTER_SITES.length];
    const name = index < CLUSTER_SITES.length ? site.name : `${site.name}-${index}`;
    const cluster: Cluster = {
      name,
      uid: uuidFrom(`${seed}:cluster:${name}`),
      region: site.region,
      zones: site.zones,
      provider: 'aws',
      platform: 'aws_eks',
      accountId: String(100000000000 + intFrom(`${seed}:account:${name}`, 899999999999)),
    };
    clusters.push(cluster);

    const clusterNodes: K8sNode[] = [];
    const nodeCount = nodesPerCluster[index] ?? nodesPerCluster[0] ?? 8;
    for (let nodeIndex = 0; nodeIndex < nodeCount; nodeIndex++) {
      const zone = cluster.zones[nodeIndex % cluster.zones.length];
      const octet = 10 + Math.floor(nodeIndex / 250);
      const nodeName = `ip-10-${octet}-${nodeIndex % 250}-${
        11 + intFrom(`${cluster.name}:ip:${nodeIndex}`, 240)
      }.${cluster.region}.compute.internal`;
      const sizeRoll = noise(`${seed}:nodesize:${cluster.name}`, nodeIndex);
      const cpuCores = sizeRoll > 0.8 ? 32 : sizeRoll > 0.45 ? 16 : 8;
      const node: K8sNode = {
        name: nodeName,
        uid: uuidFrom(`${seed}:node:${nodeName}`),
        cluster,
        zone,
        cpuCores,
        memoryBytes: cpuCores * 4 * GIB,
        filesystemBytes: 200 * GIB,
      };
      clusterNodes.push(node);
      nodes.push(node);
    }

    // Pods are split across namespaces by weight, then across that namespace's
    // deployments, so replica counts vary the way they do in a real cluster.
    const podTotal = podsPerCluster[index] ?? podsPerCluster[0] ?? 100;
    const namespaceCounts = distribute(
      podTotal,
      NAMESPACES.map((namespace) => namespace.weight)
    );

    NAMESPACES.forEach((namespace, namespaceIndex) => {
      const namespacePods = namespaceCounts[namespaceIndex];
      if (namespacePods === 0) return;

      const deploymentWeights = namespace.deployments.map(
        (deploymentName) => 1 + noise(`${seed}:dw:${cluster.name}:${deploymentName}`, 0) * 2
      );
      const deploymentCounts = distribute(namespacePods, deploymentWeights);

      namespace.deployments.forEach((deploymentName, deploymentIndex) => {
        const replicas = deploymentCounts[deploymentIndex];
        if (replicas === 0) return;

        const key = `${cluster.name}:${namespace.name}:${deploymentName}`;
        const deployment: Deployment = {
          name: deploymentName,
          uid: uuidFrom(`${seed}:deployment:${key}`),
          namespace,
          cluster,
          replicaSet: suffix(`${seed}:rs:${key}`, 5),
          desired: replicas,
        };
        deployments.push(deployment);

        for (let replica = 0; replica < replicas; replica++) {
          const podKey = `${key}:${replica}`;
          const podName = `${deploymentName}-${deployment.replicaSet}-${suffix(
            `${seed}:pod:${podKey}`,
            5
          )}`;
          const node = clusterNodes[intFrom(`${seed}:place:${podKey}`, clusterNodes.length)];

          // A few pods are deliberately young, so a pod-age column shows a
          // plausible mix rather than every pod starting at the same instant.
          const isFresh = noise(`${seed}:fresh:${podKey}`, 0) < 0.04;
          const ageMs = isFresh
            ? noise(`${seed}:age:${podKey}`, 1) * 2 * 3_600_000
            : (1 + noise(`${seed}:age:${podKey}`, 2) * 20) * 86_400_000;

          const containerCount = noise(`${seed}:sidecar:${podKey}`, 0) < 0.35 ? 2 : 1;
          const containers: Container[] = [];
          for (let containerIndex = 0; containerIndex < containerCount; containerIndex++) {
            const containerName = containerIndex === 0 ? deploymentName : 'istio-proxy';
            containers.push({
              name: containerName,
              id: hexFrom(`${seed}:cid:${podKey}:${containerIndex}`, 64),
              image:
                containerIndex === 0
                  ? `registry.internal/${containerName}`
                  : 'docker.io/istio/proxyv2',
              imageTag:
                containerIndex === 0
                  ? `2.${1 + intFrom(`${podKey}:minor`, 30)}.${intFrom(`${podKey}:patch`, 12)}`
                  : '1.24.1',
              cpuLimit: containerIndex === 0 ? namespace.cpuLimit : 0.2,
              memLimit: containerIndex === 0 ? namespace.memLimit : 128 * MIB,
            });
          }

          const volumes: Volume[] = [];
          if (noise(`${seed}:vol:${podKey}`, 0) < 0.5) {
            volumes.push({
              name: 'data',
              type: 'persistentVolumeClaim',
              claim: `${deploymentName}-data-${replica}`,
              capacityBytes: pick([10, 20, 50, 100], `${seed}:volsize:${podKey}`) * GIB,
            });
          }

          pods.push({
            name: podName,
            uid: uuidFrom(`${seed}:pod:${podKey}`),
            cluster,
            namespace,
            node,
            deployment,
            environment: namespace.name === 'staging' ? 'staging' : 'production',
            serviceVersion: containers[0].imageTag,
            startTimeMs: nowMs - ageMs,
            cpuLimit: namespace.cpuLimit,
            memLimit: namespace.memLimit,
            cpuBase: namespace.cpuBase * (0.7 + noise(`${seed}:cpu:${podKey}`, 0) * 0.6),
            memBase: namespace.memBase * (0.85 + noise(`${seed}:mem:${podKey}`, 0) * 0.3),
            networkBase: 50_000 * (0.4 + noise(`${seed}:net:${podKey}`, 0) * 2),
            scenario: 'healthy',
            containers,
            volumes,
          });
        }
      });
    });
  }

  assignScenarios(pods, seed, unhealthy);

  return { clusters, nodes, deployments, pods };
};

/**
 * Unhealthy pods are drawn from the busy namespaces and spread across clusters, so
 * the honeycomb has red cells in both cards rather than one obviously broken corner.
 */
const assignScenarios = (pods: Pod[], seed: number, unhealthy: number): void => {
  if (unhealthy <= 0) return;

  const candidates = pods
    .filter((pod) => pod.namespace.name !== 'kube-system' && pod.namespace.name !== 'staging')
    .sort((a, b) => noise(`${seed}:sick:${a.uid}`, 0) - noise(`${seed}:sick:${b.uid}`, 0));

  const byCluster = new Map<string, Pod[]>();
  for (const pod of candidates) {
    const list = byCluster.get(pod.cluster.name) ?? [];
    list.push(pod);
    byCluster.set(pod.cluster.name, list);
  }

  const lists = [...byCluster.values()];
  for (let index = 0; index < unhealthy; index++) {
    const list = lists[index % lists.length];
    const pod = list[Math.floor(index / lists.length)];
    if (pod) pod.scenario = SCENARIO_ROTATION[index % SCENARIO_ROTATION.length];
  }
};
