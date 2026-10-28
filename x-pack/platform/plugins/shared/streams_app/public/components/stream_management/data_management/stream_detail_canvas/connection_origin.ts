/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import {
  addTestRoutingToLine,
  canMoveUnitConnection,
  connectRouteToTarget,
  connectToDestination,
  disconnectFromDestination,
  disconnectRouteFromTarget,
  moveRouteConnection,
  moveUnitConnection,
  type RouteRuleRef,
  type RouteTarget,
  type UnitConnectionOrigin,
} from '../../../../services/unit_connections';
import {
  GRAPH_ENDPOINT_KIND,
  PROCESSING_SLOT_KIND,
  type ProcessingNodeRef,
} from '../../../../services/unit_graph';
import type { Unit } from '../../../../services/unit_repository';
import {
  readConfiguredDestinationId,
  readConfiguredRoutingId,
  readConfiguredSourceId,
  readRoutingRuleIndex,
} from './build_unit_connection_edges';

export type { RouteTarget };

/** Processing node ids on the canvas, mapped to the slot each one draws. */
export type ProcessingRefsByNodeId = ReadonlyMap<string, ProcessingNodeRef>;

/**
 * Where a drawn line starts: a source node or a pipeline's processing, which
 * wire straight to destinations, or one rule of a routing node (its handle, or
 * the rule's processing), which wires that rule.
 */
export type ConnectionOrigin =
  | { kind: 'source'; sourceId: string }
  | { kind: 'processing'; ref: ProcessingNodeRef }
  | { kind: 'route'; rule: RouteRuleRef };

export const readConnectionOrigin = (
  nodeId: string | null | undefined,
  handleId: string | null | undefined,
  processingRefs: ProcessingRefsByNodeId = new Map()
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
  const ref = nodeId ? processingRefs.get(nodeId) : undefined;
  if (!ref) {
    return undefined;
  }
  return ref.kind === PROCESSING_SLOT_KIND.route
    ? { kind: 'route', rule: { pipelineId: ref.pipelineId, ruleIndex: ref.routeIndex } }
    : { kind: 'processing', ref };
};

/**
 * Where a drawn line ends: a configured destination, or a routing pipeline,
 * drawn as its routing node or the processing in front of it.
 */
export const readConnectionTarget = (
  nodeId: string | null | undefined,
  processingRefs: ProcessingRefsByNodeId = new Map(),
  routingIds: ReadonlySet<string> = new Set()
): RouteTarget | undefined => {
  const destinationId = readConfiguredDestinationId(nodeId);
  if (destinationId) {
    return { kind: 'destination', id: destinationId };
  }
  const pipelineId = readConfiguredRoutingId(nodeId);
  if (pipelineId) {
    return { kind: 'pipeline', id: pipelineId };
  }
  const ref = nodeId ? processingRefs.get(nodeId) : undefined;
  return ref?.kind === PROCESSING_SLOT_KIND.pipeline && routingIds.has(ref.pipelineId)
    ? { kind: 'pipeline', id: ref.pipelineId }
    : undefined;
};

/** Sources and pipeline processing are the origins the unit graph wires to destinations. */
const toUnitConnectionOrigin = (origin: ConnectionOrigin): UnitConnectionOrigin | undefined => {
  switch (origin.kind) {
    case 'source':
      return { kind: GRAPH_ENDPOINT_KIND.source, id: origin.sourceId };
    case 'processing':
      return { kind: GRAPH_ENDPOINT_KIND.processing, ref: origin.ref };
    case 'route':
      return undefined;
  }
};

/**
 * Testing aid: routes a source or processing line through a routing node with
 * one placeholder rule. Returns `unit` unchanged for other lines. TO BE REMOVED
 */
export const addTestRouting = (unit: Unit, origin: ConnectionOrigin, target: RouteTarget): Unit => {
  const unitOrigin = toUnitConnectionOrigin(origin);
  return unitOrigin && target.kind === 'destination'
    ? addTestRoutingToLine(unit, unitOrigin, target.id)
    : unit;
};

export const canConnectOrigin = (
  unit: Unit,
  origin: ConnectionOrigin,
  target: RouteTarget
): boolean => connectOrigin(unit, origin, target) !== unit;

/** Sources and processing only wire straight to destinations. Rules take destinations or pipelines. */
export const connectOrigin = (unit: Unit, origin: ConnectionOrigin, target: RouteTarget): Unit => {
  if (origin.kind === 'route') {
    return connectRouteToTarget(unit, origin.rule, target);
  }
  const unitOrigin = toUnitConnectionOrigin(origin);
  return unitOrigin && target.kind === 'destination'
    ? connectToDestination(unit, unitOrigin, target.id)
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
  const unitOrigin = toUnitConnectionOrigin(origin);
  return unitOrigin && target.kind === 'destination'
    ? disconnectFromDestination(unit, unitOrigin, target.id)
    : unit;
};

export interface OriginConnectionMove {
  previousOrigin: ConnectionOrigin;
  previousTarget: RouteTarget;
  origin: ConnectionOrigin;
  target: RouteTarget;
}

/** Whether the move puts the line back where it started. */
const isSameLine = ({ previousOrigin, previousTarget, origin, target }: OriginConnectionMove) =>
  isEqual(previousOrigin, origin) && isEqual(previousTarget, target);

/** Moves an existing line. Returns `unit` unchanged when the move is not allowed. */
export const moveOriginConnection = (unit: Unit, move: OriginConnectionMove): Unit => {
  const { previousOrigin, previousTarget, origin, target } = move;
  if (isSameLine(move)) {
    return unit;
  }
  if (previousOrigin.kind === 'route' && origin.kind === 'route') {
    return moveRouteConnection(unit, {
      previousRule: previousOrigin.rule,
      previousTarget,
      rule: origin.rule,
      target,
    });
  }
  const previousUnitOrigin = toUnitConnectionOrigin(previousOrigin);
  const unitOrigin = toUnitConnectionOrigin(origin);
  if (previousUnitOrigin && unitOrigin) {
    return previousTarget.kind === 'destination' && target.kind === 'destination'
      ? moveUnitConnection(unit, {
          previousOrigin: previousUnitOrigin,
          previousDestinationId: previousTarget.id,
          origin: unitOrigin,
          destinationId: target.id,
        })
      : unit;
  }
  const connected = connectOrigin(unit, origin, target);
  return connected === unit ? unit : disconnectOrigin(connected, previousOrigin, previousTarget);
};

/** Whether a moved line can be dropped there. Dropping it back where it started is allowed. */
export const canMoveOriginConnection = (unit: Unit, move: OriginConnectionMove): boolean => {
  if (isSameLine(move)) {
    return true;
  }
  const { previousOrigin, previousTarget, origin, target } = move;
  const previousUnitOrigin = toUnitConnectionOrigin(previousOrigin);
  const unitOrigin = toUnitConnectionOrigin(origin);
  if (
    previousUnitOrigin &&
    unitOrigin &&
    previousTarget.kind === 'destination' &&
    target.kind === 'destination'
  ) {
    return canMoveUnitConnection(unit, {
      previousOrigin: previousUnitOrigin,
      previousDestinationId: previousTarget.id,
      origin: unitOrigin,
      destinationId: target.id,
    });
  }
  return moveOriginConnection(unit, move) !== unit;
};
