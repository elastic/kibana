/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUnitConnections } from '../../../../services/unit_connections';
import type { Unit } from '../../../../services/unit_repository';
import type { RoutingViewModel } from '../../../streams_layout/routing/types';
import { ANIMATED_EDGE_TYPE, type ClassicCanvasEdge } from './types';

const CONFIGURED_SOURCE_PREFIX = 'configured-source-';
const CONFIGURED_DESTINATION_PREFIX = 'configured-destination-';
const CONFIGURED_ROUTING_PREFIX = 'configured-routing-';
const ROUTING_RULE_HANDLE_PREFIX = 'rule-';

export const configuredSourceNodeId = (sourceId: string): string =>
  `${CONFIGURED_SOURCE_PREFIX}${sourceId}`;

export const configuredDestinationNodeId = (destinationId: string): string =>
  `${CONFIGURED_DESTINATION_PREFIX}${destinationId}`;

export const configuredRoutingNodeId = (pipelineId: string): string =>
  `${CONFIGURED_ROUTING_PREFIX}${pipelineId}`;

/**
 * Rule handles are keyed by rule position so they stay stable as targets change.\
 */
export const routingRuleHandleId = (ruleIndex: number): string =>
  `${ROUTING_RULE_HANDLE_PREFIX}${ruleIndex}`;

export const readRoutingRuleIndex = (handleId: string | null | undefined): number | undefined => {
  if (!handleId?.startsWith(ROUTING_RULE_HANDLE_PREFIX)) {
    return undefined;
  }
  const index = Number(handleId.slice(ROUTING_RULE_HANDLE_PREFIX.length));
  return Number.isInteger(index) && index >= 0 ? index : undefined;
};

export const readConfiguredSourceId = (nodeId: string | null | undefined): string | undefined =>
  nodeId?.startsWith(CONFIGURED_SOURCE_PREFIX)
    ? nodeId.slice(CONFIGURED_SOURCE_PREFIX.length)
    : undefined;

export const readConfiguredDestinationId = (
  nodeId: string | null | undefined
): string | undefined =>
  nodeId?.startsWith(CONFIGURED_DESTINATION_PREFIX)
    ? nodeId.slice(CONFIGURED_DESTINATION_PREFIX.length)
    : undefined;

export const readConfiguredRoutingId = (nodeId: string | null | undefined): string | undefined =>
  nodeId?.startsWith(CONFIGURED_ROUTING_PREFIX)
    ? nodeId.slice(CONFIGURED_ROUTING_PREFIX.length)
    : undefined;

/**
 * Edges for each source pipeline's own destination list. Routed connections are
 * drawn through a routing node by {@link buildRoutingEdges} instead.
 */
export const buildUnitConnectionEdges = (
  unit: Unit,
  sourceIds: readonly string[],
  destinationIds: readonly string[]
): ClassicCanvasEdge[] =>
  getUnitConnections(unit, new Set(sourceIds), new Set(destinationIds))
    .filter(({ forwarding }) => forwarding === 'direct')
    .map(({ sourceId, destinationId, forwarding }) => ({
      id: `unit-connection-${sourceId}->${destinationId}`,
      source: configuredSourceNodeId(sourceId),
      target: configuredDestinationNodeId(destinationId),
      type: ANIMATED_EDGE_TYPE,
      reconnectable: true,
      selectable: false,
      deletable: false,
      className: 'streamsUnitConnection nopan',
      data: { unitConnection: true, forwarding },
    }));

/**
 * Lines out of a rule can be moved to another destination or child routing
 * node. Lines from a source into a routing node are fixed.
 */
const routingEdge = (
  edge: Pick<ClassicCanvasEdge, 'id' | 'source' | 'target' | 'sourceHandle'>,
  isEditable: boolean
): ClassicCanvasEdge => ({
  ...edge,
  type: ANIMATED_EDGE_TYPE,
  reconnectable: isEditable ? 'target' : false,
  selectable: false,
  deletable: false,
  className: isEditable ? 'streamsUnitConnection nopan' : 'streamsRoutingConnection nopan',
  data: { routing: true, unitConnection: isEditable },
});

/**
 * Edges into each routing node from its sources, and out of each rule handle to
 * the destinations or child routing nodes the rule forwards to. Targets that are
 * not on the canvas are skipped.
 */
export const buildRoutingEdges = (
  routings: readonly RoutingViewModel[],
  sourceIds: readonly string[],
  destinationIds: readonly string[]
): ClassicCanvasEdge[] => {
  const sources = new Set(sourceIds);
  const destinations = new Set(destinationIds);
  const pipelines = new Set(routings.map(({ id }) => id));

  return routings.flatMap((routing) => {
    const routingNodeId = configuredRoutingNodeId(routing.id);
    const inbound = routing.sourceIds
      .filter((sourceId) => sources.has(sourceId))
      .map((sourceId) =>
        routingEdge(
          {
            id: `routing-${sourceId}->${routing.id}`,
            source: configuredSourceNodeId(sourceId),
            target: routingNodeId,
          },
          false
        )
      );
    const outbound = routing.rules.flatMap((rule) =>
      rule.targets.reduce((out, { kind, id }) => {
        const isOnCanvas = kind === 'destination' ? destinations.has(id) : pipelines.has(id);
        if (isOnCanvas) {
          out.push(
            routingEdge(
              {
                id: `routing-${routing.id}:${rule.index}->${kind}-${id}`,
                source: routingNodeId,
                sourceHandle: routingRuleHandleId(rule.index),
                target:
                  kind === 'destination'
                    ? configuredDestinationNodeId(id)
                    : configuredRoutingNodeId(id),
              },
              true
            )
          );
        }
        return out;
      }, [] as ClassicCanvasEdge[])
    );
    return [...inbound, ...outbound];
  });
};
