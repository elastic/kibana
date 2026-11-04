/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Entity } from './fake_entities';
import { getK8sContextValue } from './kubernetes_hierarchy';
import {
  filterEntitiesByResourceType,
  filterKubernetesEntities,
  getKubernetesClusterNames,
  KUBERNETES_FILTER_ALL,
  type KubernetesResourceType,
} from './kubernetes_cluster_filter';

export interface HexTileRelatedFilterApplyArgs {
  readonly resourceType: KubernetesResourceType;
  readonly cluster?: string;
  readonly namespace?: string;
  readonly deployment?: string;
  readonly node?: string;
  readonly pod?: string;
}

export interface HexTileRelatedFilterAction {
  readonly id: string;
  readonly label: string;
  readonly total: number;
  /** Resources with at least one active alert (same semantics as left nav). */
  readonly alerting: number;
  readonly apply: HexTileRelatedFilterApplyArgs;
}

export interface HexTileRelatedTargetSummary {
  readonly total: number;
  readonly alerting: number;
}

/** Inventory rows that match a related-resource preset (same rules as page filters). */
export const resolveHexTileRelatedTargetEntities = (
  inventory: readonly Entity[],
  apply: HexTileRelatedFilterApplyArgs
): readonly Entity[] => {
  const k8sEntities = inventory.filter((entity) => entity.category === 'kubernetes');
  if (k8sEntities.length === 0) {
    return [];
  }
  const clusterNames = getKubernetesClusterNames(k8sEntities);
  const scoped = filterKubernetesEntities(
    k8sEntities,
    apply.cluster ?? KUBERNETES_FILTER_ALL,
    apply.namespace ?? KUBERNETES_FILTER_ALL,
    apply.deployment ?? KUBERNETES_FILTER_ALL,
    apply.node ?? KUBERNETES_FILTER_ALL,
    clusterNames
  );
  let matches = filterEntitiesByResourceType(scoped, apply.resourceType);
  if (apply.pod) {
    matches = matches.filter((entity) => getK8sContextValue(entity, 'pod') === apply.pod);
  }
  return matches;
};

export const summarizeHexTileRelatedTargets = (
  inventory: readonly Entity[],
  apply: HexTileRelatedFilterApplyArgs
): HexTileRelatedTargetSummary => {
  const matches = resolveHexTileRelatedTargetEntities(inventory, apply);
  let alerting = 0;
  for (const entity of matches) {
    if ((entity.alerts?.active ?? 0) > 0) {
      alerting += 1;
    }
  }
  return { total: matches.length, alerting };
};

const clusterFromEntity = (entity: Entity): string | undefined => {
  if (entity.subType === 'Clusters') {
    return entity.name;
  }
  const fromAttrs = getK8sContextValue(entity, 'cluster');
  return fromAttrs || undefined;
};

type RelatedActionDraft = Omit<HexTileRelatedFilterAction, 'total' | 'alerting'>;

const withRelatedCounts = (
  inventory: readonly Entity[],
  drafts: readonly RelatedActionDraft[]
): readonly HexTileRelatedFilterAction[] =>
  drafts
    .map((draft) => {
      const { total, alerting } = summarizeHexTileRelatedTargets(inventory, draft.apply);
      return { ...draft, total, alerting };
    })
    .filter((action) => action.total > 0);

/** Contextual “see related resources” presets for the hex tile popover (K8s inventory only). */
export const resolveHexTileRelatedFilterActions = (
  entity: Entity,
  k8sInventory: readonly Entity[] = []
): readonly HexTileRelatedFilterAction[] => {
  if (entity.category !== 'kubernetes' || !entity.subType) {
    return [];
  }

  const cluster = clusterFromEntity(entity);
  const namespace =
    entity.subType === 'Namespaces'
      ? entity.name
      : getK8sContextValue(entity, 'namespace') || undefined;
  const node =
    entity.subType === 'Nodes' ? entity.name : getK8sContextValue(entity, 'node') || undefined;
  const deployment =
    entity.subType === 'Deployments'
      ? entity.name
      : getK8sContextValue(entity, 'deployment') || undefined;

  switch (entity.subType) {
    case 'Nodes': {
      if (!node) return [];
      return withRelatedCounts(k8sInventory, [
        {
          id: 'pods-on-node',
          label: i18n.translate(
            'xpack.streams.entityCentricLab.entities.tileTooltip.related.podsOnNode',
            { defaultMessage: 'See pods on this node' }
          ),
          apply: { resourceType: 'Pods', cluster, node },
        },
      ]);
    }
    case 'Clusters': {
      const clusterName = entity.name;
      return withRelatedCounts(k8sInventory, [
        {
          id: 'nodes-in-cluster',
          label: i18n.translate(
            'xpack.streams.entityCentricLab.entities.tileTooltip.related.nodesInCluster',
            { defaultMessage: 'See nodes in this cluster' }
          ),
          apply: { resourceType: 'Nodes', cluster: clusterName },
        },
        {
          id: 'pods-in-cluster',
          label: i18n.translate(
            'xpack.streams.entityCentricLab.entities.tileTooltip.related.podsInCluster',
            { defaultMessage: 'See pods in this cluster' }
          ),
          apply: { resourceType: 'Pods', cluster: clusterName },
        },
        {
          id: 'namespaces-in-cluster',
          label: i18n.translate(
            'xpack.streams.entityCentricLab.entities.tileTooltip.related.namespacesInCluster',
            { defaultMessage: 'See namespaces in this cluster' }
          ),
          apply: { resourceType: 'Namespaces', cluster: clusterName },
        },
      ]);
    }
    case 'Namespaces': {
      if (!namespace) return [];
      return withRelatedCounts(k8sInventory, [
        {
          id: 'pods-in-namespace',
          label: i18n.translate(
            'xpack.streams.entityCentricLab.entities.tileTooltip.related.podsInNamespace',
            { defaultMessage: 'See pods in this namespace' }
          ),
          apply: { resourceType: 'Pods', cluster, namespace },
        },
      ]);
    }
    case 'Deployments': {
      if (!deployment) return [];
      return withRelatedCounts(k8sInventory, [
        {
          id: 'pods-for-deployment',
          label: i18n.translate(
            'xpack.streams.entityCentricLab.entities.tileTooltip.related.podsForDeployment',
            { defaultMessage: 'See pods for this deployment' }
          ),
          apply: { resourceType: 'Pods', cluster, namespace, deployment },
        },
      ]);
    }
    case 'Pods':
      return withRelatedCounts(k8sInventory, [
        {
          id: 'containers-on-pod',
          label: i18n.translate(
            'xpack.streams.entityCentricLab.entities.tileTooltip.related.containersOnPod',
            { defaultMessage: 'See containers on this pod' }
          ),
          apply: {
            resourceType: 'Containers',
            cluster,
            namespace,
            node,
            deployment,
            pod: entity.name,
          },
        },
      ]);
    default:
      return [];
  }
};
