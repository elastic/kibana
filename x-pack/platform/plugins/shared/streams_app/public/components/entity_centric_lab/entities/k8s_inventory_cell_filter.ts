/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from './fake_entities';
import type { BucketKey } from './bucket_metrics';
import {
  K8S_CONTEXT_KEYS,
  K8S_CONTEXT_LABEL,
  getK8sContextValue,
  type K8sContextKey,
} from './kubernetes_hierarchy';

const NAME_COLUMN_FILTER_BY_BUCKET: Partial<Record<BucketKey, K8sContextKey>> = {
  'kubernetes:clusters': 'cluster',
  'kubernetes:namespaces': 'namespace',
  'kubernetes:nodes': 'node',
  'kubernetes:deployments': 'deployment',
};

/** Page-level K8s dropdowns only cover these dimensions (not pod). */
const PAGE_FILTER_DIMENSIONS: ReadonlySet<K8sContextKey> = new Set([
  'cluster',
  'namespace',
  'node',
  'deployment',
]);

export interface K8sCellFilterTarget {
  readonly dimension: K8sContextKey;
  readonly value: string;
  readonly kqlField: K8sContextKey;
}

export const resolveK8sCellFilterTarget = (
  columnId: string,
  entity: Entity,
  bucketKey: BucketKey
): K8sCellFilterTarget | null => {
  if (K8S_CONTEXT_KEYS.includes(columnId as K8sContextKey)) {
    const dimension = columnId as K8sContextKey;
    if (!PAGE_FILTER_DIMENSIONS.has(dimension)) return null;
    const value = getK8sContextValue(entity, dimension);
    return value ? { dimension, value, kqlField: dimension } : null;
  }
  if (columnId === 'name') {
    const dimension = NAME_COLUMN_FILTER_BY_BUCKET[bucketKey];
    if (!dimension) return null;
    return entity.name ? { dimension, value: entity.name, kqlField: dimension } : null;
  }
  return null;
};

export const isK8sInventoryFilterColumn = (
  columnId: string,
  bucketKey: BucketKey
): boolean => {
  if (K8S_CONTEXT_KEYS.includes(columnId as K8sContextKey)) {
    return PAGE_FILTER_DIMENSIONS.has(columnId as K8sContextKey);
  }
  return columnId === 'name' && NAME_COLUMN_FILTER_BY_BUCKET[bucketKey] !== undefined;
};

export const k8sFilterColumnLabel = (columnId: string): string => {
  if (K8S_CONTEXT_KEYS.includes(columnId as K8sContextKey)) {
    return K8S_CONTEXT_LABEL[columnId as K8sContextKey];
  }
  return columnId;
};

export type ApplyK8sInventoryCellFilterArgs = {
  readonly entity: Entity;
  readonly target: K8sCellFilterTarget;
  readonly clusterNames: readonly string[];
  readonly assignCluster: (entity: Entity, clusterNames: readonly string[]) => string | undefined;
  readonly setResourceTypeAll: () => void;
  readonly setCluster: (value: string) => void;
  readonly setNamespace: (value: string) => void;
  readonly setDeployment: (value: string) => void;
  readonly setNode: (value: string) => void;
  readonly filterAll: string;
};

/** Filter for (+) → page K8s facet dropdowns (cluster / namespace / …). */
export const applyK8sInventoryCellFilter = ({
  entity,
  target,
  clusterNames,
  assignCluster,
  setResourceTypeAll,
  setCluster,
  setNamespace,
  setDeployment,
  setNode,
  filterAll,
}: ApplyK8sInventoryCellFilterArgs): void => {
  const { dimension, value } = target;

  setResourceTypeAll();

  const clusterFromEntity =
    entity.subType === 'Clusters'
      ? entity.name
      : entity.attributes?.cluster ?? assignCluster(entity, clusterNames);

  switch (dimension) {
    case 'cluster':
      setCluster(value);
      setNamespace(filterAll);
      setDeployment(filterAll);
      setNode(filterAll);
      break;
    case 'namespace':
      if (clusterFromEntity) setCluster(clusterFromEntity);
      setNamespace(value);
      setDeployment(filterAll);
      setNode(filterAll);
      break;
    case 'deployment':
      if (clusterFromEntity) setCluster(clusterFromEntity);
      if (entity.attributes?.namespace) setNamespace(entity.attributes.namespace);
      setDeployment(value);
      setNode(filterAll);
      break;
    case 'node':
      if (clusterFromEntity) setCluster(clusterFromEntity);
      setNamespace(filterAll);
      setDeployment(filterAll);
      setNode(value);
      break;
    default:
      break;
  }
};
