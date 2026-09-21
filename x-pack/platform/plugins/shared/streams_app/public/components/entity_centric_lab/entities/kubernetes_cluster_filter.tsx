/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared Kubernetes cluster filter — used by both the Grouped grid
 * and the List view to narrow the K8s entities to a single cluster.
 *
 * Centralizes:
 *   - the entity-to-cluster assignment heuristic (region hint first,
 *     stable hash fallback) so a node called `node-prod-eu-04` lands
 *     in `k8s-eu-prod` whichever view is rendering it;
 *   - the dropdown UI itself so the two views look identical;
 *   - the canonical K8s sub-type ordering shared by both views.
 */

import React, { useMemo } from 'react';
import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Entity } from './fake_entities';
import { labThings, useIsElasticOn } from '../lab_terminology';

export const KUBERNETES_FILTER_ALL = '__all__';

/** @deprecated Use KUBERNETES_FILTER_ALL */
export const KUBERNETES_CLUSTER_FILTER_ALL = KUBERNETES_FILTER_ALL;

/**
 * Canonical sub-type ordering. Infra-first (Clusters → Nodes →
 * Namespaces → Deployments) then workloads (Pods → Containers).
 * Shared so the Grouped grid and List view stay in lock-step.
 */
export const KUBERNETES_SUB_TYPE_ORDER: readonly string[] = [
  'Clusters',
  'Nodes',
  'Namespaces',
  'Deployments',
  'Pods',
  'Containers',
];

/**
 * Polynomial hash. Pure arithmetic to keep `no-bitwise` happy;
 * deterministic so the same entity always lands in the same cluster
 * across reloads, nav, and view-switches.
 */
const stableHashInt = (input: string): number => {
  const MOD = 0x7fffffff;
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % MOD;
  }
  return hash;
};

/**
 * Assign a Kubernetes entity to one of the known clusters:
 *   1. Cluster entities are their own owner.
 *   2. Entities whose name carries a region hint (`-eu-`, `eu-prod`,
 *      `-us-`, `us-prod`) get routed to the matching named cluster —
 *      so `node-prod-eu-04` lives in `k8s-eu-prod` regardless of view.
 *   3. Everything else falls back to a stable hash bucket.
 * Returns `null` only when `clusterNames` is empty (i.e. the dataset
 * has no cluster entities at all).
 */
export const assignClusterForEntity = (
  entity: Entity,
  clusterNames: readonly string[]
): string | null => {
  if (clusterNames.length === 0) return null;
  if (entity.subType === 'Clusters') return entity.name;
  const stored = entity.attributes?.cluster;
  if (stored && clusterNames.includes(stored)) return stored;
  const lower = entity.name.toLowerCase();
  const matched = clusterNames.find((cluster) => {
    const region = cluster.includes('eu') ? 'eu' : cluster.includes('us') ? 'us' : null;
    if (!region) return false;
    return lower.includes(`-${region}-`) || lower.includes(`${region}-prod`);
  });
  if (matched) return matched;
  return clusterNames[stableHashInt(entity.name) % clusterNames.length];
};

/**
 * Convenience: extract the sorted list of known cluster names from
 * a list of Kubernetes entities. Stable order so the dropdown
 * options don't shuffle on re-render.
 */
export const getKubernetesClusterNames = (entities: readonly Entity[]): string[] =>
  entities
    .filter((entity) => entity.subType === 'Clusters')
    .map((entity) => entity.name)
    .sort();

/**
 * Filter a list of Kubernetes entities by the currently-selected
 * cluster. Pass-through when the filter is `__all__`.
 */
export const filterEntitiesByCluster = (
  entities: readonly Entity[],
  clusterFilter: string,
  clusterNames: readonly string[]
): readonly Entity[] => {
  if (clusterFilter === KUBERNETES_FILTER_ALL) return entities;
  return entities.filter(
    (entity) => assignClusterForEntity(entity, clusterNames) === clusterFilter
  );
};

// Sub-types that carry a `namespace` attribute.
const NAMESPACE_SCOPED_SUBTYPES = new Set(['Deployments', 'Pods', 'Containers']);
// Sub-types that carry a `node` attribute.
const NODE_SCOPED_SUBTYPES = new Set(['Pods', 'Containers']);

/**
 * Extract sorted, unique namespace names from a list of K8s entities,
 * optionally scoped to a specific cluster.
 */
export const getKubernetesNamespaceNames = (
  entities: readonly Entity[],
  clusterFilter: string = KUBERNETES_FILTER_ALL,
  clusterNames: readonly string[] = []
): string[] => {
  const scoped = filterEntitiesByCluster(entities, clusterFilter, clusterNames);
  const namespaces = new Set<string>();
  for (const entity of scoped) {
    if (entity.subType === 'Namespaces') {
      namespaces.add(entity.name);
    } else if (entity.attributes?.namespace) {
      namespaces.add(entity.attributes.namespace);
    }
  }
  return [...namespaces].sort();
};

/**
 * Extract sorted, unique node names from a list of K8s entities,
 * optionally scoped to a specific cluster.
 */
export const getKubernetesNodeNames = (
  entities: readonly Entity[],
  clusterFilter: string = KUBERNETES_FILTER_ALL,
  clusterNames: readonly string[] = []
): string[] => {
  const scoped = filterEntitiesByCluster(entities, clusterFilter, clusterNames);
  const nodes = new Set<string>();
  for (const entity of scoped) {
    if (entity.subType === 'Nodes') {
      nodes.add(entity.name);
    } else if (entity.attributes?.node) {
      nodes.add(entity.attributes.node);
    }
  }
  return [...nodes].sort();
};

/**
 * Apply all three cascading filters (cluster → namespace → node) at once.
 * Entities whose sub-type is not scoped by a filter dimension pass through
 * for that dimension (e.g. Clusters and Nodes are not namespace-scoped, so
 * a namespace filter does not hide them).
 */
export const filterKubernetesEntities = (
  entities: readonly Entity[],
  clusterFilter: string,
  namespaceFilter: string,
  nodeFilter: string,
  clusterNames: readonly string[]
): readonly Entity[] => {
  let result = filterEntitiesByCluster(entities, clusterFilter, clusterNames);
  if (namespaceFilter !== KUBERNETES_FILTER_ALL) {
    result = result.filter((entity) => {
      if (entity.subType === 'Namespaces') return entity.name === namespaceFilter;
      if (entity.subType === 'Clusters' || entity.subType === 'Nodes') return true;
      return entity.attributes?.namespace === namespaceFilter;
    });
  }
  if (nodeFilter !== KUBERNETES_FILTER_ALL) {
    result = result.filter((entity) => {
      if (entity.subType === 'Nodes') return entity.name === nodeFilter;
      if (entity.subType === 'Clusters' || entity.subType === 'Namespaces' || entity.subType === 'Deployments') return true;
      return entity.attributes?.node === nodeFilter;
    });
  }
  return result;
};

// ---------------------------------------------------------------------------
// Kubernetes group-by
// ---------------------------------------------------------------------------

export type KubernetesGroupBy = 'subType' | 'cluster' | 'namespace' | 'node';

export const KUBERNETES_GROUP_BY_OPTIONS: ReadonlyArray<{
  readonly value: KubernetesGroupBy;
  readonly label: string;
}> = [
  { value: 'subType', label: 'Sub-type' },
  { value: 'cluster', label: 'Cluster' },
  { value: 'namespace', label: 'Namespace' },
  { value: 'node', label: 'Node' },
];

/**
 * Group K8s entities by the selected dimension. Returns an ordered array
 * of `{ label, rows }` groups.
 *
 * - **subType**: canonical KUBERNETES_SUB_TYPE_ORDER
 * - **cluster**: one group per cluster (stable order)
 * - **namespace**: one group per namespace; entities without a namespace
 *   go into an "Other" group
 * - **node**: one group per node; entities without a node go into "Other"
 */
export const groupKubernetesEntities = (
  entities: readonly Entity[],
  groupBy: KubernetesGroupBy
): ReadonlyArray<{ label: string; rows: Entity[] }> => {
  if (groupBy === 'subType') {
    const groups = new Map<string, Entity[]>();
    for (const entity of entities) {
      const key = entity.subType ?? 'Other';
      const list = groups.get(key) ?? [];
      list.push(entity);
      groups.set(key, list);
    }
    return KUBERNETES_SUB_TYPE_ORDER
      .map((label) => ({ label, rows: groups.get(label) ?? [] }))
      .filter((g) => g.rows.length > 0);
  }

  const attrKey =
    groupBy === 'cluster' ? 'cluster' : groupBy === 'namespace' ? 'namespace' : 'node';
  const groups = new Map<string, Entity[]>();
  const order: string[] = [];
  for (const entity of entities) {
    let key: string | undefined;
    if (groupBy === 'cluster' && entity.subType === 'Clusters') {
      key = entity.name;
    } else {
      key = entity.attributes?.[attrKey];
    }
    const groupLabel = key || 'Other';
    const list = groups.get(groupLabel) ?? [];
    if (list.length === 0) order.push(groupLabel);
    list.push(entity);
    groups.set(groupLabel, list);
  }
  order.sort((a, b) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)));
  return order.map((label) => ({ label, rows: groups.get(label) ?? [] }));
};

// ---------------------------------------------------------------------------
// Resource-type filter
// ---------------------------------------------------------------------------

export type KubernetesResourceType = '__all__' | string;
export const KUBERNETES_RESOURCE_TYPE_ALL = '__all__';

/** Which downstream filters are meaningful for each resource type. */
export const resourceTypeFilterVisibility = (
  resourceType: KubernetesResourceType
): { showCluster: boolean; showNamespace: boolean; showNode: boolean } => {
  switch (resourceType) {
    case KUBERNETES_RESOURCE_TYPE_ALL:
      return { showCluster: true, showNamespace: true, showNode: true };
    case 'Clusters':
      return { showCluster: false, showNamespace: false, showNode: false };
    case 'Nodes':
      return { showCluster: true, showNamespace: false, showNode: false };
    case 'Namespaces':
      return { showCluster: true, showNamespace: false, showNode: false };
    case 'Deployments':
      return { showCluster: true, showNamespace: true, showNode: false };
    case 'Pods':
      return { showCluster: true, showNamespace: true, showNode: true };
    case 'Containers':
      return { showCluster: true, showNamespace: true, showNode: true };
    default:
      return { showCluster: true, showNamespace: true, showNode: true };
  }
};

/** Filter entities to a single sub-type (pass-through when "All"). */
export const filterEntitiesByResourceType = (
  entities: readonly Entity[],
  resourceType: KubernetesResourceType
): readonly Entity[] => {
  if (resourceType === KUBERNETES_RESOURCE_TYPE_ALL) return entities;
  return entities.filter((e) => e.subType === resourceType);
};

interface KubernetesResourceTypeFilterProps {
  readonly value: KubernetesResourceType;
  readonly onChange: (next: KubernetesResourceType) => void;
}

export const KubernetesResourceTypeFilter = ({
  value,
  onChange,
}: KubernetesResourceTypeFilterProps) => {
  const allLabel = i18n.translate(
    'xpack.streams.entityCentricLab.entities.kubernetesResourceTypeFilter.allOption',
    { defaultMessage: 'All resource types' }
  );
  const options = useMemo(
    () => [
      { value: KUBERNETES_RESOURCE_TYPE_ALL, text: allLabel },
      ...KUBERNETES_SUB_TYPE_ORDER.map((subType) => ({
        value: subType,
        text: subType,
      })),
    ],
    [allLabel]
  );
  return (
    <EuiSelect
      compressed
      options={options}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.kubernetesResourceTypeFilter.ariaLabel',
        { defaultMessage: 'Filter Kubernetes entities by resource type' }
      )}
      data-test-subj="entityCentricLabKubernetesResourceTypeFilter"
    />
  );
};

// ---------------------------------------------------------------------------
// Cluster filter
// ---------------------------------------------------------------------------

interface KubernetesClusterFilterProps {
  readonly clusterNames: readonly string[];
  readonly value: string;
  readonly onChange: (next: string) => void;
}

/**
 * Compact dropdown with an inline "Cluster" label. Defaults to "All
 * clusters" which is a pass-through. Shared by Grouped grid and List
 * views so the control looks identical wherever the user encounters
 * it.
 */
export const KubernetesClusterFilter = ({
  clusterNames,
  value,
  onChange,
}: KubernetesClusterFilterProps) => {
  const isElasticOn = useIsElasticOn();
  const allClustersLabel = i18n.translate(
    'xpack.streams.entityCentricLab.entities.kubernetesClusterFilter.allOption',
    { defaultMessage: 'All clusters' }
  );
  const options = useMemo(
    () => [
      {
        value: KUBERNETES_FILTER_ALL,
        text: allClustersLabel,
      },
      ...clusterNames.map((name) => ({
        value: name,
        text: i18n.translate(
          'xpack.streams.entityCentricLab.entities.kubernetesClusterFilter.clusterOption',
          { defaultMessage: 'Cluster: {name}', values: { name } }
        ),
      })),
    ],
    [clusterNames, allClustersLabel]
  );
  return (
    <EuiSelect
      compressed
      options={options}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.kubernetesClusterFilter.ariaLabel',
        {
          defaultMessage: 'Filter Kubernetes {things} by cluster',
          values: { things: labThings(isElasticOn) },
        }
      )}
      data-test-subj="entityCentricLabKubernetesClusterFilter"
    />
  );
};

// ---------------------------------------------------------------------------
// Namespace filter
// ---------------------------------------------------------------------------

interface KubernetesNamespaceFilterProps {
  readonly namespaceNames: readonly string[];
  readonly value: string;
  readonly onChange: (next: string) => void;
}

export const KubernetesNamespaceFilter = ({
  namespaceNames,
  value,
  onChange,
}: KubernetesNamespaceFilterProps) => {
  const allLabel = i18n.translate(
    'xpack.streams.entityCentricLab.entities.kubernetesNamespaceFilter.allOption',
    { defaultMessage: 'All namespaces' }
  );
  const options = useMemo(
    () => [
      { value: KUBERNETES_FILTER_ALL, text: allLabel },
      ...namespaceNames.map((name) => ({
        value: name,
        text: i18n.translate(
          'xpack.streams.entityCentricLab.entities.kubernetesNamespaceFilter.option',
          { defaultMessage: 'Namespace: {name}', values: { name } }
        ),
      })),
    ],
    [namespaceNames, allLabel]
  );
  return (
    <EuiSelect
      compressed
      options={options}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.kubernetesNamespaceFilter.ariaLabel',
        { defaultMessage: 'Filter Kubernetes entities by namespace' }
      )}
      data-test-subj="entityCentricLabKubernetesNamespaceFilter"
    />
  );
};

// ---------------------------------------------------------------------------
// Node filter
// ---------------------------------------------------------------------------

interface KubernetesNodeFilterProps {
  readonly nodeNames: readonly string[];
  readonly value: string;
  readonly onChange: (next: string) => void;
}

export const KubernetesNodeFilter = ({
  nodeNames,
  value,
  onChange,
}: KubernetesNodeFilterProps) => {
  const allLabel = i18n.translate(
    'xpack.streams.entityCentricLab.entities.kubernetesNodeFilter.allOption',
    { defaultMessage: 'All nodes' }
  );
  const options = useMemo(
    () => [
      { value: KUBERNETES_FILTER_ALL, text: allLabel },
      ...nodeNames.map((name) => ({
        value: name,
        text: i18n.translate(
          'xpack.streams.entityCentricLab.entities.kubernetesNodeFilter.option',
          { defaultMessage: 'Node: {name}', values: { name } }
        ),
      })),
    ],
    [nodeNames, allLabel]
  );
  return (
    <EuiSelect
      compressed
      options={options}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.kubernetesNodeFilter.ariaLabel',
        { defaultMessage: 'Filter Kubernetes entities by node' }
      )}
      data-test-subj="entityCentricLabKubernetesNodeFilter"
    />
  );
};

// ---------------------------------------------------------------------------
// Group-by dropdown
// ---------------------------------------------------------------------------

interface KubernetesGroupBySelectProps {
  readonly value: KubernetesGroupBy;
  readonly onChange: (next: KubernetesGroupBy) => void;
}

export const KubernetesGroupBySelect = ({
  value,
  onChange,
}: KubernetesGroupBySelectProps) => {
  const options = useMemo(
    () =>
      KUBERNETES_GROUP_BY_OPTIONS.map((opt) => ({
        value: opt.value,
        text: i18n.translate(
          `xpack.streams.entityCentricLab.entities.kubernetesGroupBy.${opt.value}`,
          { defaultMessage: 'Group by: {label}', values: { label: opt.label } }
        ),
      })),
    []
  );
  return (
    <EuiSelect
      compressed
      options={options}
      value={value}
      onChange={(event) => onChange(event.target.value as KubernetesGroupBy)}
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.kubernetesGroupBy.ariaLabel',
        { defaultMessage: 'Group Kubernetes entities by dimension' }
      )}
      data-test-subj="entityCentricLabKubernetesGroupBy"
    />
  );
};
