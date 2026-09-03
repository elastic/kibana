/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Kubernetes parent-chain context for ElasticOn Inventory.
 *
 * Seeds `entity.attributes` so a Node knows its Cluster, a Pod knows
 * Namespace / Node / Cluster / Deployment, etc. Table columns and hex
 * popovers read the same fields; the cluster filter prefers
 * `attributes.cluster` so the dropdown and the columns stay in sync.
 */

import { i18n } from '@kbn/i18n';
import type { Entity } from './fake_entities';
import { assignClusterForEntity, getKubernetesClusterNames } from './kubernetes_cluster_filter';

export const K8S_CONTEXT_KEYS = ['cluster', 'namespace', 'node', 'deployment', 'pod'] as const;

export type K8sContextKey = (typeof K8S_CONTEXT_KEYS)[number];

export const K8S_CONTEXT_LABEL: Record<K8sContextKey, string> = {
  cluster: i18n.translate('xpack.streams.entityCentricLab.entities.k8sContext.cluster', {
    defaultMessage: 'Cluster',
  }),
  namespace: i18n.translate('xpack.streams.entityCentricLab.entities.k8sContext.namespace', {
    defaultMessage: 'Namespace',
  }),
  node: i18n.translate('xpack.streams.entityCentricLab.entities.k8sContext.node', {
    defaultMessage: 'Node',
  }),
  deployment: i18n.translate('xpack.streams.entityCentricLab.entities.k8sContext.deployment', {
    defaultMessage: 'Deployment',
  }),
  pod: i18n.translate('xpack.streams.entityCentricLab.entities.k8sContext.pod', {
    defaultMessage: 'Pod',
  }),
};

interface ContextColumnSpec {
  readonly defaultVisible: readonly K8sContextKey[];
  readonly hidden: readonly K8sContextKey[];
}

/**
 * Per-bucket columns. Default-visible = parents that disambiguate the
 * row name. Hidden = useful but crowded (addable from Columns).
 */
const CONTEXT_BY_BUCKET: Record<string, ContextColumnSpec> = {
  'kubernetes:nodes': { defaultVisible: ['cluster'], hidden: [] },
  'kubernetes:namespaces': { defaultVisible: ['cluster'], hidden: [] },
  'kubernetes:deployments': { defaultVisible: ['namespace', 'cluster'], hidden: [] },
  'kubernetes:pods': {
    defaultVisible: ['namespace', 'node', 'cluster'],
    hidden: ['deployment'],
  },
  'kubernetes:containers': {
    defaultVisible: ['pod', 'namespace', 'cluster'],
    hidden: ['node', 'deployment'],
  },
};

/** Compact popover lines (under name + type). Fewer than the table. */
const POPOVER_KEYS_BY_SUBTYPE: Record<string, readonly K8sContextKey[]> = {
  Nodes: ['cluster'],
  Namespaces: ['cluster'],
  Deployments: ['namespace', 'cluster'],
  Pods: ['namespace', 'node', 'cluster'],
  Containers: ['pod', 'namespace', 'cluster'],
};

export const getK8sContextColumnIds = (
  bucketKey: string
): { readonly defaultVisible: readonly K8sContextKey[]; readonly hidden: readonly K8sContextKey[] } => {
  const spec = CONTEXT_BY_BUCKET[bucketKey];
  if (!spec) return { defaultVisible: [], hidden: [] };
  return spec;
};

export const getK8sContextValue = (entity: Entity, key: K8sContextKey): string =>
  entity.attributes?.[key] ?? '';

export const getK8sPopoverLines = (
  entity: Entity
): ReadonlyArray<{ readonly label: string; readonly value: string }> => {
  if (entity.category !== 'kubernetes') return [];
  const keys = POPOVER_KEYS_BY_SUBTYPE[entity.subType ?? ''] ?? [];
  return keys.flatMap((key) => {
    const value = getK8sContextValue(entity, key);
    return value ? [{ label: K8S_CONTEXT_LABEL[key], value }] : [];
  });
};

const STORY_EU_CLUSTER = 'k8s-eu-prod';
const STORY_NODE = 'node-prod-eu-04';
const STORY_NAMESPACES = new Set(['payments', 'checkout', 'fraud', 'settlement']);

const POD_STORY: Record<
  string,
  { readonly namespace: string; readonly node: string; readonly deployment: string }
> = {
  'payments-pod-7f9b2': { namespace: 'payments', node: STORY_NODE, deployment: 'payments' },
  'payments-pod-3ac1f': { namespace: 'payments', node: STORY_NODE, deployment: 'payments' },
  'batch-settlement-job-xk2p': {
    namespace: 'settlement',
    node: STORY_NODE,
    deployment: 'batch-settlement',
  },
  'fraud-pod-9a1c': { namespace: 'fraud', node: STORY_NODE, deployment: 'fraud' },
};

const stableHash = (input: string): number => {
  const MOD = 0x7fffffff;
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % MOD;
  }
  return hash;
};

const pickFrom = (pool: readonly string[], seed: string): string | undefined => {
  if (pool.length === 0) return undefined;
  return pool[stableHash(seed) % pool.length];
};

const withAttrs = (entity: Entity, attrs: Record<string, string>): Entity => {
  const next = Object.fromEntries(Object.entries(attrs).filter(([, value]) => value.length > 0));
  if (Object.keys(next).length === 0) return entity;
  return { ...entity, attributes: { ...entity.attributes, ...next } };
};

const namesInCluster = (entities: readonly Entity[], subType: string, cluster: string): string[] =>
  entities
    .filter((entity) => {
      if (entity.category !== 'kubernetes' || entity.subType !== subType) return false;
      if (subType === 'Clusters') return entity.name === cluster;
      return entity.attributes?.cluster === cluster;
    })
    .map((entity) => entity.name);

const namespaceFromName = (name: string, namespaces: readonly string[]): string | undefined => {
  const lower = name.toLowerCase();
  const matched = [...namespaces]
    .sort((a, b) => b.length - a.length)
    .find((ns) => lower === ns.toLowerCase() || lower.startsWith(`${ns.toLowerCase()}-`));
  return matched;
};

/**
 * Attach parent-chain attributes to every Kubernetes entity. Non-K8s
 * rows pass through unchanged. Idempotent enough to run once at dataset
 * build time.
 */
export const withKubernetesHierarchy = (entities: readonly Entity[]): Entity[] => {
  const clusterNames = getKubernetesClusterNames(entities);
  if (clusterNames.length === 0) return [...entities];

  const withCluster = entities.map((entity) => {
    if (entity.category !== 'kubernetes' || entity.subType === 'Clusters') return entity;
    let cluster = assignClusterForEntity(entity, clusterNames) ?? clusterNames[0];
    if (entity.subType === 'Namespaces' && STORY_NAMESPACES.has(entity.name)) {
      cluster = STORY_EU_CLUSTER;
    }
    if (entity.name === STORY_NODE || POD_STORY[entity.name]) {
      cluster = STORY_EU_CLUSTER;
    }
    return withAttrs(entity, { cluster });
  });

  const withDeployments = withCluster.map((entity) => {
    if (entity.category !== 'kubernetes' || entity.subType !== 'Deployments') return entity;
    const cluster = entity.attributes?.cluster ?? clusterNames[0];
    const namespaces = namesInCluster(withCluster, 'Namespaces', cluster);
    const namespace = pickFrom(namespaces, `deploy-ns-${entity.name}`) ?? namespaces[0] ?? '';
    return withAttrs(entity, { namespace });
  });

  const withPods = withDeployments.map((entity) => {
    if (entity.category !== 'kubernetes' || entity.subType !== 'Pods') return entity;
    const cluster = entity.attributes?.cluster ?? clusterNames[0];
    const namespaces = namesInCluster(withDeployments, 'Namespaces', cluster);
    const nodes = namesInCluster(withDeployments, 'Nodes', cluster);
    const story = POD_STORY[entity.name];
    const namespace =
      story?.namespace ??
      namespaceFromName(entity.name, namespaces) ??
      pickFrom(namespaces, `pod-ns-${entity.name}`) ??
      '';
    const node =
      story?.node && nodes.includes(story.node)
        ? story.node
        : pickFrom(nodes, `pod-node-${entity.name}`) ?? '';
    const deploymentsInNs = withDeployments
      .filter(
        (candidate) =>
          candidate.category === 'kubernetes' &&
          candidate.subType === 'Deployments' &&
          candidate.attributes?.cluster === cluster &&
          candidate.attributes?.namespace === namespace
      )
      .map((candidate) => candidate.name);
    const deployment =
      story?.deployment ??
      pickFrom(deploymentsInNs, `pod-deploy-${entity.name}`) ??
      pickFrom(
        namesInCluster(withDeployments, 'Deployments', cluster),
        `pod-deploy-${entity.name}`
      ) ??
      '';
    return withAttrs(entity, { namespace, node, deployment });
  });

  return withPods.map((entity) => {
    if (entity.category !== 'kubernetes' || entity.subType !== 'Containers') return entity;
    const cluster = entity.attributes?.cluster ?? clusterNames[0];
    const pods = withPods.filter(
      (candidate) =>
        candidate.category === 'kubernetes' &&
        candidate.subType === 'Pods' &&
        candidate.attributes?.cluster === cluster
    );
    const pod = pickFrom(
      pods.map((candidate) => candidate.name),
      `container-pod-${entity.name}`
    );
    const parent = pods.find((candidate) => candidate.name === pod);
    return withAttrs(entity, {
      pod: parent?.name ?? pod ?? '',
      namespace: parent?.attributes?.namespace ?? '',
      node: parent?.attributes?.node ?? '',
      deployment: parent?.attributes?.deployment ?? '',
    });
  });
};
