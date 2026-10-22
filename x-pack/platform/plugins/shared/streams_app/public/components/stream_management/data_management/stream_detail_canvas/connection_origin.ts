/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  canConnectRouteToDestination,
  canConnectSourceToDestination,
  connectRouteToDestination,
  connectSourceToDestination,
  disconnectRouteFromDestination,
  disconnectSourceFromDestination,
  moveRouteConnection,
  moveUnitConnection,
  type RouteRuleRef,
} from '../../../../services/unit_connections';
import type { Unit } from '../../../../services/unit_repository';
import {
  readConfiguredRoutingId,
  readConfiguredSourceId,
  readRoutingRuleIndex,
} from './build_unit_connection_edges';

/**
 * Where a drawn line starts: a source node, which wires its direct pipeline, or
 * one rule handle of a routing node, which wires that rule.
 */
export type ConnectionOrigin =
  | { kind: 'source'; sourceId: string }
  | { kind: 'route'; rule: RouteRuleRef };

export const readConnectionOrigin = (
  nodeId: string | null | undefined,
  handleId: string | null | undefined
): ConnectionOrigin | undefined => {
  const sourceId = readConfiguredSourceId(nodeId);
  if (sourceId) {
    return { kind: 'source', sourceId };
  }
  const pipelineId = readConfiguredRoutingId(nodeId);
  const ruleIndex = readRoutingRuleIndex(handleId);
  if (pipelineId && ruleIndex !== undefined) {
    return { kind: 'route', rule: { pipelineId, ruleIndex } };
  }
  return undefined;
};

export const canConnectOrigin = (
  unit: Unit,
  origin: ConnectionOrigin,
  destinationId: string
): boolean =>
  origin.kind === 'source'
    ? canConnectSourceToDestination(unit, origin.sourceId, destinationId)
    : canConnectRouteToDestination(unit, origin.rule, destinationId);

export const connectOrigin = (unit: Unit, origin: ConnectionOrigin, destinationId: string): Unit =>
  origin.kind === 'source'
    ? connectSourceToDestination(unit, origin.sourceId, destinationId)
    : connectRouteToDestination(unit, origin.rule, destinationId);

export const disconnectOrigin = (
  unit: Unit,
  origin: ConnectionOrigin,
  destinationId: string
): Unit =>
  origin.kind === 'source'
    ? disconnectSourceFromDestination(unit, origin.sourceId, destinationId)
    : disconnectRouteFromDestination(unit, origin.rule, destinationId);

export const moveOriginConnection = (
  unit: Unit,
  {
    previousOrigin,
    previousDestinationId,
    origin,
    destinationId,
  }: {
    previousOrigin: ConnectionOrigin;
    previousDestinationId: string;
    origin: ConnectionOrigin;
    destinationId: string;
  }
): Unit => {
  if (previousOrigin.kind === 'source' && origin.kind === 'source') {
    return moveUnitConnection(unit, {
      previousSourceId: previousOrigin.sourceId,
      previousDestinationId,
      sourceId: origin.sourceId,
      destinationId,
    });
  }
  if (previousOrigin.kind === 'route' && origin.kind === 'route') {
    return moveRouteConnection(unit, {
      previousRule: previousOrigin.rule,
      previousDestinationId,
      rule: origin.rule,
      destinationId,
    });
  }
  if (!canConnectOrigin(unit, origin, destinationId)) {
    return unit;
  }
  return disconnectOrigin(
    connectOrigin(unit, origin, destinationId),
    previousOrigin,
    previousDestinationId
  );
};
