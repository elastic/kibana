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
  return rows.map((row) => {
    const patched = patchById[row.id];
    return patched ? { ...row, value: patched } : row;
  });
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
