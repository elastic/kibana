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

import React, { useCallback, useMemo } from 'react';
import { EuiComboBox, EuiSelect } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Entity } from './fake_entities';
import { labThings, useIsElasticOn } from '../lab_terminology';

export const KUBERNETES_FILTER_ALL = '__all__';

/** @deprecated Use KUBERNETES_FILTER_ALL */
export const KUBERNETES_CLUSTER_FILTER_ALL = KUBERNETES_FILTER_ALL;

/**
 * A type group clusters related K8s resource sub-types under a shared
 * heading (e.g. "Workload Management" groups Deployments, ReplicaSets,
 * StatefulSets, DaemonSets, CronJobs). Sub-types that don't belong to
 * any group sit at the top level.
 */
export interface KubernetesTypeGroup {
  /** Unique identifier used as a filter value (e.g. `'workloadManagement'`). */
  readonly id: string;
  /** Human-readable heading shown in the filter dropdown and section dividers. */
  readonly label: string;
  /** Sub-type labels that belong to this group, in display order. */
  readonly members: readonly string[];
}

/**
 * Registry of K8s type groups. Order here determines the visual
 * ordering of the group sections in both hex-map and table views.
 */
export const KUBERNETES_TYPE_GROUPS: readonly KubernetesTypeGroup[] = [
  {
    id: 'workloadManagement',
    label: 'Workload Management',
    members: ['Deployments', 'ReplicaSets', 'StatefulSets', 'DaemonSets', 'CronJobs'],
  },
];

/** Look up the type group a sub-type label belongs to (if any). */
export const getTypeGroupForSubType = (
  subTypeLabel: string
): KubernetesTypeGroup | undefined =>
  KUBERNETES_TYPE_GROUPS.find((g) => g.members.includes(subTypeLabel));

/** All sub-type labels that belong to any type group. */
const TYPE_GROUP_MEMBER_SET = new Set(
  KUBERNETES_TYPE_GROUPS.flatMap((g) => g.members)
);

/** Whether a sub-type label belongs to a type group. */
export const isTypeGroupMember = (subTypeLabel: string): boolean =>
  TYPE_GROUP_MEMBER_SET.has(subTypeLabel);

/**
 * Canonical sub-type ordering. Infrastructure-first (Clusters → Nodes →
 * Namespaces) then workloads (Pods → Containers), followed by type-group
 * members in the group's own order (Workload Management: Deployments →
 * ReplicaSets → StatefulSets → DaemonSets → CronJobs).
 *
 * Shared so the Grouped grid and List view stay in lock-step.
 */
export const KUBERNETES_SUB_TYPE_ORDER: readonly string[] = [
  'Clusters',
  'Nodes',
  'Namespaces',
  'Pods',
  'Containers',
  ...KUBERNETES_TYPE_GROUPS.flatMap((g) => g.members),
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
 * Extract sorted, unique deployment names from a list of K8s entities,
 * optionally scoped to a specific cluster and/or namespace.
 */
export const getKubernetesDeploymentNames = (
  entities: readonly Entity[],
  clusterFilter: string = KUBERNETES_FILTER_ALL,
  namespaceFilter: string = KUBERNETES_FILTER_ALL,
  clusterNames: readonly string[] = []
): string[] => {
  let scoped = filterEntitiesByCluster(entities, clusterFilter, clusterNames);
  if (namespaceFilter !== KUBERNETES_FILTER_ALL) {
    scoped = scoped.filter((entity) => {
      if (entity.subType === 'Namespaces') return entity.name === namespaceFilter;
      if (entity.subType === 'Clusters' || entity.subType === 'Nodes') return true;
      return entity.attributes?.namespace === namespaceFilter;
    });
  }
  const deployments = new Set<string>();
  for (const entity of scoped) {
    if (entity.subType === 'Deployments') {
      deployments.add(entity.name);
    } else if (entity.attributes?.deployment) {
      deployments.add(entity.attributes.deployment);
    }
  }
  return [...deployments].sort();
};

/**
 * Apply all four cascading filters (cluster → namespace → deployment → node)
 * at once. Entities whose sub-type is not scoped by a filter dimension pass
 * through for that dimension (e.g. Clusters and Nodes are not namespace-scoped,
 * so a namespace filter does not hide them).
 */
export const filterKubernetesEntities = (
  entities: readonly Entity[],
  clusterFilter: string,
  namespaceFilter: string,
  deploymentFilter: string,
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
  if (deploymentFilter !== KUBERNETES_FILTER_ALL) {
    result = result.filter((entity) => {
      if (entity.subType === 'Deployments') return entity.name === deploymentFilter;
      if (entity.subType === 'Clusters' || entity.subType === 'Nodes' || entity.subType === 'Namespaces') return true;
      return entity.attributes?.deployment === deploymentFilter;
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

export interface KubernetesGroupEntry {
  readonly label: string;
  readonly rows: Entity[];
  /**
   * When grouping by subType, this field is set on the **first** member
   * of a type group (e.g. "Deployments" gets `typeGroupLabel: 'Workload
   * Management'`). Views use it to render a section divider before the
   * group's first sub-type row. `undefined` for ungrouped sub-types and
   * for non-subType grouping dimensions.
   */
  readonly typeGroupLabel?: string;
}

/**
 * Group K8s entities by the selected dimension. Returns an ordered array
 * of `{ label, rows, typeGroupLabel? }` groups.
 *
 * - **subType**: canonical KUBERNETES_SUB_TYPE_ORDER, with type-group
 *   divider metadata on first members
 * - **cluster**: one group per cluster (stable order)
 * - **namespace**: one group per namespace; entities without a namespace
 *   go into an "Other" group
 * - **node**: one group per node; entities without a node go into "Other"
 */
export const groupKubernetesEntities = (
  entities: readonly Entity[],
  groupBy: KubernetesGroupBy
): readonly KubernetesGroupEntry[] => {
  if (groupBy === 'subType') {
    const groups = new Map<string, Entity[]>();
    for (const entity of entities) {
      const key = entity.subType ?? 'Other';
      const list = groups.get(key) ?? [];
      list.push(entity);
      groups.set(key, list);
    }
    const seenGroups = new Set<string>();
    return KUBERNETES_SUB_TYPE_ORDER
      .map((label) => {
        const rows = groups.get(label) ?? [];
        const group = getTypeGroupForSubType(label);
        let typeGroupLabel: string | undefined;
        if (group && !seenGroups.has(group.id) && rows.length > 0) {
          seenGroups.add(group.id);
          typeGroupLabel = group.label;
        }
        return { label, rows, typeGroupLabel };
      })
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
): { showCluster: boolean; showNamespace: boolean; showDeployment: boolean; showNode: boolean } => {
  switch (resourceType) {
    case KUBERNETES_RESOURCE_TYPE_ALL:
      return { showCluster: true, showNamespace: true, showDeployment: true, showNode: true };
    case 'Clusters':
      return { showCluster: false, showNamespace: false, showDeployment: false, showNode: false };
    case 'Nodes':
      return { showCluster: true, showNamespace: false, showDeployment: false, showNode: false };
    case 'Namespaces':
      return { showCluster: true, showNamespace: false, showDeployment: false, showNode: false };
    case 'Deployments':
    case 'ReplicaSets':
    case 'StatefulSets':
    case 'DaemonSets':
    case 'CronJobs':
      return { showCluster: true, showNamespace: true, showDeployment: true, showNode: false };
    case 'Pods':
      return { showCluster: true, showNamespace: true, showDeployment: true, showNode: true };
    case 'Containers':
      return { showCluster: true, showNamespace: true, showDeployment: true, showNode: true };
    default:
      // Type-group IDs (e.g. 'workloadManagement') show all filters.
      return { showCluster: true, showNamespace: true, showDeployment: true, showNode: true };
  }
};

/**
 * Filter entities to a single sub-type or all members of a type group.
 * Pass-through when "All".
 */
export const filterEntitiesByResourceType = (
  entities: readonly Entity[],
  resourceType: KubernetesResourceType
): readonly Entity[] => {
  if (resourceType === KUBERNETES_RESOURCE_TYPE_ALL) return entities;
  const group = KUBERNETES_TYPE_GROUPS.find((g) => g.id === resourceType);
  if (group) {
    const memberSet = new Set(group.members);
    return entities.filter((e) => e.subType !== undefined && memberSet.has(e.subType));
  }
  return entities.filter((e) => e.subType === resourceType);
};

interface KubernetesResourceTypeFilterProps {
  readonly value: KubernetesResourceType;
  readonly onChange: (next: KubernetesResourceType) => void;
}

/**
 * Build the grouped option list for the resource-type filter.
 * Top-level sub-types (not belonging to any group) come first as flat
 * options, then each type group appears as a labelled option group with
 * a selectable group header (selects all members) + its individual
 * member options.
 */
const buildResourceTypeOptions = (): EuiComboBoxOptionOption[] => {
  const topLevel = KUBERNETES_SUB_TYPE_ORDER.filter((s) => !isTypeGroupMember(s));
  const flat: EuiComboBoxOptionOption[] = topLevel.map((subType) => ({
    label: subType,
    value: subType,
  }));
  const groups: EuiComboBoxOptionOption[] = KUBERNETES_TYPE_GROUPS.map((group) => ({
    label: group.label,
    value: group.id,
    options: group.members.map((member) => ({ label: member, value: member })),
  }));
  return [...flat, ...groups];
};

export const KubernetesResourceTypeFilter = ({
  value,
  onChange,
}: KubernetesResourceTypeFilterProps) => {
  const allLabel = i18n.translate(
    'xpack.streams.entityCentricLab.entities.kubernetesResourceTypeFilter.allOption',
    { defaultMessage: 'All resource types' }
  );
  const options = useMemo<EuiComboBoxOptionOption[]>(() => buildResourceTypeOptions(), []);
  const allFlat = useMemo<EuiComboBoxOptionOption[]>(() => {
    const result: EuiComboBoxOptionOption[] = [];
    for (const opt of options) {
      if (opt.options) {
        result.push(opt);
        result.push(...opt.options);
      } else {
        result.push(opt);
      }
    }
    return result;
  }, [options]);
  const selectedOptions = useMemo<EuiComboBoxOptionOption[]>(
    () =>
      value === KUBERNETES_RESOURCE_TYPE_ALL
        ? []
        : allFlat.filter((o) => o.value === value),
    [value, allFlat]
  );
  const handleChange = useCallback(
    (selected: EuiComboBoxOptionOption[]) => {
      onChange(selected.length > 0 ? (selected[0].value as string) : KUBERNETES_RESOURCE_TYPE_ALL);
    },
    [onChange]
  );
  return (
    <EuiComboBox
      compressed
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selectedOptions}
      onChange={handleChange}
      placeholder={allLabel}
      isClearable
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.kubernetesResourceTypeFilter.ariaLabel',
        { defaultMessage: 'Filter Kubernetes entities by resource type' }
      )}
      data-test-subj="entityCentricLabKubernetesResourceTypeFilter"
      style={{ minWidth: 180 }}
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
  const options = useMemo<EuiComboBoxOptionOption[]>(
    () => clusterNames.map((name) => ({ label: name, value: name })),
    [clusterNames]
  );
  const selectedOptions = useMemo<EuiComboBoxOptionOption[]>(
    () =>
      value === KUBERNETES_FILTER_ALL
        ? []
        : [{ label: `Cluster: ${value}`, value }],
    [value]
  );
  const handleChange = useCallback(
    (selected: EuiComboBoxOptionOption[]) => {
      onChange(selected.length > 0 ? (selected[0].value as string) : KUBERNETES_FILTER_ALL);
    },
    [onChange]
  );
  return (
    <EuiComboBox
      compressed
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selectedOptions}
      onChange={handleChange}
      placeholder={allClustersLabel}
      isClearable
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.kubernetesClusterFilter.ariaLabel',
        {
          defaultMessage: 'Filter Kubernetes {things} by cluster',
          values: { things: labThings(isElasticOn) },
        }
      )}
      data-test-subj="entityCentricLabKubernetesClusterFilter"
      style={{ minWidth: 200 }}
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
  const options = useMemo<EuiComboBoxOptionOption[]>(
    () => namespaceNames.map((name) => ({ label: name, value: name })),
    [namespaceNames]
  );
  const selectedOptions = useMemo<EuiComboBoxOptionOption[]>(
    () =>
      value === KUBERNETES_FILTER_ALL
        ? []
        : [{ label: `Namespace: ${value}`, value }],
    [value]
  );
  const handleChange = useCallback(
    (selected: EuiComboBoxOptionOption[]) => {
      onChange(selected.length > 0 ? (selected[0].value as string) : KUBERNETES_FILTER_ALL);
    },
    [onChange]
  );
  return (
    <EuiComboBox
      compressed
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selectedOptions}
      onChange={handleChange}
      placeholder={allLabel}
      isClearable
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.kubernetesNamespaceFilter.ariaLabel',
        { defaultMessage: 'Filter Kubernetes entities by namespace' }
      )}
      data-test-subj="entityCentricLabKubernetesNamespaceFilter"
      style={{ minWidth: 170 }}
    />
  );
};

// ---------------------------------------------------------------------------
// Deployment filter
// ---------------------------------------------------------------------------

interface KubernetesDeploymentFilterProps {
  readonly deploymentNames: readonly string[];
  readonly value: string;
  readonly onChange: (next: string) => void;
}

export const KubernetesDeploymentFilter = ({
  deploymentNames,
  value,
  onChange,
}: KubernetesDeploymentFilterProps) => {
  const allLabel = i18n.translate(
    'xpack.streams.entityCentricLab.entities.kubernetesDeploymentFilter.allOption',
    { defaultMessage: 'All deployments' }
  );
  const options = useMemo<EuiComboBoxOptionOption[]>(
    () => deploymentNames.map((name) => ({ label: name, value: name })),
    [deploymentNames]
  );
  const selectedOptions = useMemo<EuiComboBoxOptionOption[]>(
    () =>
      value === KUBERNETES_FILTER_ALL
        ? []
        : [{ label: `Deployment: ${value}`, value }],
    [value]
  );
  const handleChange = useCallback(
    (selected: EuiComboBoxOptionOption[]) => {
      onChange(selected.length > 0 ? (selected[0].value as string) : KUBERNETES_FILTER_ALL);
    },
    [onChange]
  );
  return (
    <EuiComboBox
      compressed
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selectedOptions}
      onChange={handleChange}
      placeholder={allLabel}
      isClearable
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.kubernetesDeploymentFilter.ariaLabel',
        { defaultMessage: 'Filter Kubernetes entities by deployment' }
      )}
      data-test-subj="entityCentricLabKubernetesDeploymentFilter"
      style={{ minWidth: 170 }}
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
  const options = useMemo<EuiComboBoxOptionOption[]>(
    () => nodeNames.map((name) => ({ label: name, value: name })),
    [nodeNames]
  );
  const selectedOptions = useMemo<EuiComboBoxOptionOption[]>(
    () =>
      value === KUBERNETES_FILTER_ALL
        ? []
        : [{ label: `Node: ${value}`, value }],
    [value]
  );
  const handleChange = useCallback(
    (selected: EuiComboBoxOptionOption[]) => {
      onChange(selected.length > 0 ? (selected[0].value as string) : KUBERNETES_FILTER_ALL);
    },
    [onChange]
  );
  return (
    <EuiComboBox
      compressed
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selectedOptions}
      onChange={handleChange}
      placeholder={allLabel}
      isClearable
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.kubernetesNodeFilter.ariaLabel',
        { defaultMessage: 'Filter Kubernetes entities by node' }
      )}
      data-test-subj="entityCentricLabKubernetesNodeFilter"
      style={{ minWidth: 150 }}
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

// ---------------------------------------------------------------------------
// Generic category resource-type filter
// ---------------------------------------------------------------------------

export const CATEGORY_RESOURCE_TYPE_ALL = '__all__';

/**
 * Extract the sorted, unique type labels from a list of entities.
 * Uses `subType` when present (Cloud, K8s) and falls back to `type`.
 */
export const getEntityTypeLabels = (entities: readonly Entity[]): string[] => {
  const types = new Set<string>();
  for (const entity of entities) {
    const label = entity.subType ?? entity.type;
    if (label) types.add(label);
  }
  return [...types].sort();
};

/**
 * Filter entities to a single type label. Pass-through when "All".
 */
export const filterEntitiesByCategoryType = (
  entities: readonly Entity[],
  typeFilter: string
): readonly Entity[] => {
  if (typeFilter === CATEGORY_RESOURCE_TYPE_ALL) return entities;
  return entities.filter((e) => (e.subType ?? e.type) === typeFilter);
};

interface CategoryResourceTypeFilterProps {
  readonly typeLabels: readonly string[];
  readonly value: string;
  readonly onChange: (next: string) => void;
}

/**
 * Generic searchable resource-type filter for any category page.
 * Shown when a category has 2+ distinct types.
 */
export const CategoryResourceTypeFilter = ({
  typeLabels,
  value,
  onChange,
}: CategoryResourceTypeFilterProps) => {
  const allLabel = i18n.translate(
    'xpack.streams.entityCentricLab.entities.categoryResourceTypeFilter.allOption',
    { defaultMessage: 'All types' }
  );
  const options = useMemo<EuiComboBoxOptionOption[]>(
    () => typeLabels.map((label) => ({ label, value: label })),
    [typeLabels]
  );
  const selectedOptions = useMemo<EuiComboBoxOptionOption[]>(
    () =>
      value === CATEGORY_RESOURCE_TYPE_ALL
        ? []
        : [{ label: `Type: ${value}`, value }],
    [value]
  );
  const handleChange = useCallback(
    (selected: EuiComboBoxOptionOption[]) => {
      onChange(selected.length > 0 ? (selected[0].value as string) : CATEGORY_RESOURCE_TYPE_ALL);
    },
    [onChange]
  );
  return (
    <EuiComboBox
      compressed
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selectedOptions}
      onChange={handleChange}
      placeholder={allLabel}
      isClearable
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.categoryResourceTypeFilter.ariaLabel',
        { defaultMessage: 'Filter resources by type' }
      )}
      data-test-subj="entityCentricLabCategoryResourceTypeFilter"
      style={{ minWidth: 180 }}
    />
  );
};
