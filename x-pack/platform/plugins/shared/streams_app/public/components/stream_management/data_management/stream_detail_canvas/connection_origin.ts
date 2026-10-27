/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  canConnectSourceToDestination,
  connectRouteToTarget,
  connectSourceToDestination,
  disconnectRouteFromTarget,
  disconnectSourceFromDestination,
  moveRouteConnection,
  moveUnitConnection,
  type RouteRuleRef,
  type RouteTarget,
} from '../../../../services/unit_connections';
import type { Unit } from '../../../../services/unit_repository';
import {
  readConfiguredDestinationId,
  readConfiguredRoutingId,
  readConfiguredSourceId,
  readRoutingRuleIndex,
} from './build_unit_connection_edges';

export type { RouteTarget };

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

/** Where a drawn line ends: a configured destination, or a routing node's pipeline. */
export const readConnectionTarget = (
  nodeId: string | null | undefined
): RouteTarget | undefined => {
  const destinationId = readConfiguredDestinationId(nodeId);
  if (destinationId) {
    return { kind: 'destination', id: destinationId };
  }
  const pipelineId = readConfiguredRoutingId(nodeId);
  return pipelineId ? { kind: 'pipeline', id: pipelineId } : undefined;
};

export const canConnectOrigin = (
  unit: Unit,
  origin: ConnectionOrigin,
  target: RouteTarget
): boolean => connectOrigin(unit, origin, target) !== unit;

/** Sources only wire straight to destinations. Rules take destinations or pipelines. */
export const connectOrigin = (unit: Unit, origin: ConnectionOrigin, target: RouteTarget): Unit => {
  if (origin.kind === 'route') {
    return connectRouteToTarget(unit, origin.rule, target);
  }
  return target.kind === 'destination' &&
    canConnectSourceToDestination(unit, origin.sourceId, target.id)
    ? connectSourceToDestination(unit, origin.sourceId, target.id)
    : unit;
};

export const disconnectOrigin = (
  unit: Unit,
  origin: ConnectionOrigin,
  target: RouteTarget
): Unit => {
  if (origin.kind === 'route') {
    return disconnectRouteFromTarget(unit, origin.rule, target);
  }
  return target.kind === 'destination'
    ? disconnectSourceFromDestination(unit, origin.sourceId, target.id)
    : unit;
};

export interface OriginConnectionMove {
  previousOrigin: ConnectionOrigin;
  previousTarget: RouteTarget;
  origin: ConnectionOrigin;
  target: RouteTarget;
}

/** Moves an existing line. Returns `unit` unchanged when the move is not allowed. */
export const moveOriginConnection = (
  unit: Unit,
  { previousOrigin, previousTarget, origin, target }: OriginConnectionMove
): Unit => {
  if (previousOrigin.kind === 'source' && origin.kind === 'source') {
    return previousTarget.kind === 'destination' && target.kind === 'destination'
      ? moveUnitConnection(unit, {
          previousSourceId: previousOrigin.sourceId,
          previousDestinationId: previousTarget.id,
          sourceId: origin.sourceId,
          destinationId: target.id,
        })
      : unit;
  }
  if (previousOrigin.kind === 'route' && origin.kind === 'route') {
    return moveRouteConnection(unit, {
      previousRule: previousOrigin.rule,
      previousTarget,
      rule: origin.rule,
      target,
    });
  }
  const connected = connectOrigin(unit, origin, target);
  return connected === unit ? unit : disconnectOrigin(connected, previousOrigin, previousTarget);
};
