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
import { EuiFlexGroup, EuiFlexItem, EuiSelect, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Entity } from './fake_entities';

export const KUBERNETES_CLUSTER_FILTER_ALL = '__all__';

/**
 * Canonical sub-type ordering. Reading flow goes infra-first
 * (Clusters → Nodes → Namespaces) and workloads after (Pods →
 * Deployments → Containers). Shared so the Grouped grid and List
 * view stay in lock-step.
 */
export const KUBERNETES_SUB_TYPE_ORDER: readonly string[] = [
  'Clusters',
  'Nodes',
  'Namespaces',
  'Pods',
  'Deployments',
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
  if (clusterFilter === KUBERNETES_CLUSTER_FILTER_ALL) return entities;
  return entities.filter(
    (entity) => assignClusterForEntity(entity, clusterNames) === clusterFilter
  );
};

// Fixed width so the filter dropdown lines up neatly with the other
// inline controls on the K8s card (Grouped grid) or above the K8s
// section (List view).
const CLUSTER_FILTER_WIDTH = 200;

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
  const options = useMemo(
    () => [
      {
        value: KUBERNETES_CLUSTER_FILTER_ALL,
        text: i18n.translate(
          'xpack.streams.entityCentricLab.entities.kubernetesClusterFilter.allOption',
          { defaultMessage: 'All clusters' }
        ),
      },
      ...clusterNames.map((name) => ({ value: name, text: name })),
    ],
    [clusterNames]
  );
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.streams.entityCentricLab.entities.kubernetesClusterFilter.label', {
            defaultMessage: 'Cluster',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <div style={{ width: CLUSTER_FILTER_WIDTH }}>
          <EuiSelect
            compressed
            options={options}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={i18n.translate(
              'xpack.streams.entityCentricLab.entities.kubernetesClusterFilter.ariaLabel',
              { defaultMessage: 'Filter Kubernetes entities by cluster' }
            )}
            data-test-subj="entityCentricLabKubernetesClusterFilter"
          />
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
