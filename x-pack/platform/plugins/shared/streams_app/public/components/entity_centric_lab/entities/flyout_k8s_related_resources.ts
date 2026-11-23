/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  k8sFlyoutFilterMatchBadgePresentation,
  type K8sFlyoutRelatedResource,
} from '@kbn/entity-centric-lab-flyout';
import type { Entity } from './fake_entities';
import type { EntityDetailRow } from '@kbn/entity-centric-lab-flyout';
import { podPhaseWithReason } from './bucket_metrics';
import {
  findK8sInventoryEntityByContext,
  getK8sContextValue,
  getK8sPopoverContext,
  type K8sContextKey,
} from './kubernetes_hierarchy';
import { resolveHexTileRelatedFilterActions } from './hex_tile_related_filters';

const seeContextActionLabel = (key: K8sContextKey): string => {
  switch (key) {
    case 'cluster':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.flyoutK8sRelated.seeCluster',
        { defaultMessage: 'See cluster' }
      );
    case 'namespace':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.flyoutK8sRelated.seeNamespace',
        { defaultMessage: 'See namespace' }
      );
    case 'node':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.flyoutK8sRelated.seeNode',
        { defaultMessage: 'See node' }
      );
    case 'deployment':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.flyoutK8sRelated.seeDeployment',
        { defaultMessage: 'See deployment' }
      );
    case 'pod':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.flyoutK8sRelated.seePod',
        { defaultMessage: 'See pod' }
      );
    default:
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.flyoutK8sRelated.seeResource',
        { defaultMessage: 'See resource' }
      );
  }
};

const clusterFromEntity = (entity: Entity): string | undefined => {
  if (entity.subType === 'Clusters') {
    return entity.name;
  }
  return getK8sContextValue(entity, 'cluster') || undefined;
};

const nodeNameHash = (name: string): number => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 33 + name.charCodeAt(i)) % 997;
  }
  return hash;
};

/**
 * Kubernetes node condition for the Overview metadata. Healthy nodes are
 * Ready. Pressured nodes name the condition, and an unhealthy node can
 * report more than one.
 */
const nodeConditionValue = (name: string, health: Entity['health']): string => {
  if (name === 'node-prod-eu-04') return 'Memory pressure';
  const hash = nodeNameHash(name);
  if (health === 'healthy') return 'Ready';
  if (health === 'atRisk') {
    const single = ['Memory pressure', 'Disk pressure', 'PID pressure'] as const;
    return single[hash % single.length];
  }
  const combined = [
    'Memory pressure, Disk pressure',
    'Memory pressure, PID pressure',
    'Disk pressure, PID pressure',
  ] as const;
  return combined[hash % combined.length];
};

/** Skip pivots that would open the same inventory row as the flyout entity. */
const isSameInventoryEntity = (openEntity: Entity, target: Entity): boolean =>
  target.name === openEntity.name && target.subType === openEntity.subType;

export const enrichK8sFlyoutOverviewDetails = (
  entity: Entity | undefined,
  rows: readonly EntityDetailRow[]
): readonly EntityDetailRow[] => {
  if (!entity || entity.category !== 'kubernetes') {
    return rows;
  }
  const patchById: Partial<Record<string, string>> = {
    namespace: getK8sContextValue(entity, 'namespace'),
    node: getK8sContextValue(entity, 'node'),
    cluster: clusterFromEntity(entity),
    deployment: getK8sContextValue(entity, 'deployment'),
    pod: getK8sContextValue(entity, 'pod'),
  };
  const patched = rows.map((row) => {
    const next = patchById[row.id];
    return next ? { ...row, value: next } : row;
  });
  if (entity.subType === 'Nodes') {
    const conditionRow: EntityDetailRow = {
      id: 'nodeCondition',
      label: 'Node condition',
      value: nodeConditionValue(entity.name, entity.health),
    };
    if (patched.some((row) => row.id === 'nodeCondition')) {
      return patched.map((row) => (row.id === 'nodeCondition' ? conditionRow : row));
    }
    const insertAt = Math.min(1, patched.length);
    return [...patched.slice(0, insertAt), conditionRow, ...patched.slice(insertAt)];
  }
  if (entity.subType !== 'Pods') {
    return patched;
  }
  // Every pod shows its phase and, when Kubernetes has one, the reason.
  // Same phase as the header badge, so the two cannot disagree.
  // The incident pod's whole story is an OOM kill. Keep that reason instead
  // of a hashed one so the metadata matches the summary and the alerts.
  const phaseValue =
    entity.name === 'payments-pod-7f9b2'
      ? 'Failed (OOMKilled)'
      : podPhaseWithReason(entity.name, entity.health);
  const phaseRow: EntityDetailRow = { id: 'phase', label: 'Phase', value: phaseValue };
  if (patched.some((row) => row.id === 'phase')) {
    return patched.map((row) => (row.id === 'phase' ? { ...row, value: phaseValue } : row));
  }
  const insertAt = Math.min(1, patched.length);
  return [...patched.slice(0, insertAt), phaseRow, ...patched.slice(insertAt)];
};

export const buildK8sFlyoutRelatedResources = (
  entity: Entity,
  inventory: readonly Entity[]
): readonly K8sFlyoutRelatedResource[] => {
  if (entity.category !== 'kubernetes') {
    return [];
  }

  const resources: K8sFlyoutRelatedResource[] = [];

  for (const entry of getK8sPopoverContext(entity)) {
    const target = findK8sInventoryEntityByContext(
      inventory,
      entry.key,
      entry.value,
      entity
    );
    if (target && !isSameInventoryEntity(entity, target)) {
      resources.push({
        id: entry.key,
        actionLabel: seeContextActionLabel(entry.key),
        value: entry.value,
        targetEntityName: target.name,
      });
    }
  }

  const deployment =
    entity.subType === 'Deployments'
      ? entity.name
      : getK8sContextValue(entity, 'deployment');
  if (
    deployment &&
    entity.subType !== 'Deployments' &&
    !resources.some((row) => row.id === 'deployment')
  ) {
    const target = findK8sInventoryEntityByContext(
      inventory,
      'deployment',
      deployment,
      entity
    );
    if (target && !isSameInventoryEntity(entity, target)) {
      resources.push({
        id: 'deployment',
        actionLabel: seeContextActionLabel('deployment'),
        value: deployment,
        targetEntityName: target.name,
      });
    }
  }

  for (const action of resolveHexTileRelatedFilterActions(entity, inventory)) {
    const badge = k8sFlyoutFilterMatchBadgePresentation(action.total, action.alerting);
    resources.push({
      id: action.id,
      actionLabel: action.label,
      value: badge.label,
      filterApply: action.apply,
      filterMatchTotal: action.total,
      filterMatchAlerting: action.alerting,
    });
  }

  return resources;
};
