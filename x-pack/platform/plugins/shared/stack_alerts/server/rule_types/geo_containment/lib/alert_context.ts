/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import type {
  GeoContainmentAlertInstanceContext,
  GeoContainmentAlertInstanceState,
} from '../types';

export function getAlertId(entityName: string, boundaryName: unknown) {
  return `${entityName}-${boundaryName}`;
}

function splitAlertId(alertId: string): { entityName: string; boundaryName: string } {
  const split = alertId.split('-');

  // entityName and boundaryName values are "user provided data" from elasticsearch
  // Values may contain '-', breaking alertId parsing
  // In these cases, recovered alert context cannot be obtained
  if (split.length !== 2) {
    throw new Error(
      `Can not split alertId '${alertId}' into entity name and boundary name. This can happen when entity name and boundary name contain '-' character.`
    );
  }

  return {
    entityName: split[0],
    boundaryName: split[1],
  };
}

function getAlertContext({
  entityName,
  containment,
  shapesIdsNamesMap,
  windowEnd,
  isRecovered,
}: {
  entityName: string;
  containment: GeoContainmentAlertInstanceState;
  shapesIdsNamesMap?: Record<string, unknown>;
  windowEnd: Date;
  isRecovered: boolean;
}): GeoContainmentAlertInstanceContext {
  const context: GeoContainmentAlertInstanceContext = {
    entityId: entityName,
    entityDateTime: containment.dateInShape || null,
    entityDocumentId: containment.docId,
    entityLocation:
      containment.locationWkt !== undefined
        ? containment.locationWkt
        : `POINT (${containment.location[0]} ${containment.location[1]})`,
    detectionDateTime: new Date(windowEnd).toISOString(),
  };
  if (!isRecovered) {
    context.containingBoundaryId = containment.shapeLocationId;
    context.containingBoundaryName =
      (shapesIdsNamesMap && shapesIdsNamesMap[containment.shapeLocationId]) ||
      containment.shapeLocationId;
  }
  return context;
}

export function getContainedAlertContext(args: {
  entityName: string;
  containment: GeoContainmentAlertInstanceState;
  shapesIdsNamesMap: Record<string, unknown>;
  windowEnd: Date;
}): GeoContainmentAlertInstanceContext {
  return getAlertContext({ ...args, isRecovered: false });
}

export function getRecoveredAlertContext({
  alertId,
  activeEntities,
  inactiveEntities,
  windowEnd,
}: {
  alertId: string;
  activeEntities: Map<string, GeoContainmentAlertInstanceState[]>;
  inactiveEntities: Map<string, GeoContainmentAlertInstanceState[]>;
  windowEnd: Date;
}): GeoContainmentAlertInstanceContext | null {
  const { entityName } = splitAlertId(alertId);

  // recovered alert's latest entity location is either:
  // 1) activeEntities - entity moved from one boundary to another boundary
  // 2) inactiveEntities - entity moved from one boundary to outside all boundaries
  let containment: GeoContainmentAlertInstanceState | undefined;
  if (activeEntities.has(entityName) && activeEntities.get(entityName)?.length) {
    containment = _.orderBy(activeEntities.get(entityName), ['dateInShape'], ['desc'])[0];
  } else if (inactiveEntities.has(entityName) && inactiveEntities.get(entityName)?.length) {
    containment = inactiveEntities.get(entityName)![0];
  }

  return containment
    ? getAlertContext({
        entityName,
        containment,
        windowEnd,
        isRecovered: true,
      })
    : null;
}
