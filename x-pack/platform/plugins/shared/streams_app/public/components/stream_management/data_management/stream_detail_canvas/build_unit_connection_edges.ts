/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { canDisconnectFromDestination } from '../../../../services/unit_connections';
import {
  GRAPH_ENDPOINT_KIND,
  PROCESSING_SLOT_KIND,
  SLOT_POSITION,
  buildUnitGraph,
  isProcessingSlotEditable,
  processingNodeId,
  type ProcessingNodeRef,
  type UnitEdgeProcessingTarget,
  type UnitGraphEndpoint,
  type UnitGraphProcessingNode,
} from '../../../../services/unit_graph';
import type { Unit } from '../../../../services/unit_repository';
import {
  PIPELINE_ENTRY,
  intersectSignals,
  readEntryIds,
  readRoutes,
  type UnitPipeline,
} from '../../../../services/unit_pipeline';
import type { RoutingViewModel } from '../../../streams_layout/routing/types';
import {
  ANIMATED_EDGE_TYPE,
  PROCESSING_NODE_TYPE,
  type ClassicCanvasEdge,
  type ProcessingNode,
  type ProcessingNodeOutput,
  type UnitEdgeData,
} from './types';

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

/** Rule handles are keyed by rule position so they stay stable as targets change. */
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

const endpointNodeId = (endpoint: UnitGraphEndpoint): string => {
  switch (endpoint.kind) {
    case GRAPH_ENDPOINT_KIND.source:
      return configuredSourceNodeId(endpoint.id);
    case GRAPH_ENDPOINT_KIND.destination:
      return configuredDestinationNodeId(endpoint.id);
    case GRAPH_ENDPOINT_KIND.processing:
      return processingNodeId(endpoint.ref);
  }
};

const defaultProcessingTitle = i18n.translate('xpack.streams.canvas.processingNode.title', {
  defaultMessage: 'Processing',
});

const buildProcessingNode = (
  { ref, processorIds, name, editable }: UnitGraphProcessingNode,
  output: ProcessingNodeOutput
): ProcessingNode => {
  const title = name?.trim() || defaultProcessingTitle;
  return {
    id: processingNodeId(ref),
    type: PROCESSING_NODE_TYPE,
    position: { x: 0, y: 0 },
    deletable: false,
    ariaLabel: i18n.translate('xpack.streams.canvas.processingNode.ariaLabel', {
      defaultMessage:
        '{title}, {count, plural, one {# processor} other {# processors}}. Press Enter to configure.',
      values: { title, count: processorIds.length },
    }),
    data: { ref, title, processorCount: processorIds.length, editable, output },
  };
};

export interface UnitCanvasGraph {
  processingNodes: ProcessingNode[];
  edges: ClassicCanvasEdge[];
}

/**
 * Lines into a routing node are fixed. Lines out of a rule, or out of the rule's
 * processing, can be moved to another destination or child routing node.
 */
const routingEdge = (
  edge: Pick<ClassicCanvasEdge, 'id' | 'source' | 'target' | 'sourceHandle'>,
  isEditable: boolean,
  processingTarget: UnitEdgeProcessingTarget | undefined
): ClassicCanvasEdge => {
  const data: UnitEdgeData = { routing: true, unitConnection: isEditable };
  return {
    ...edge,
    type: ANIMATED_EDGE_TYPE,
    reconnectable: isEditable ? 'target' : false,
    selectable: false,
    deletable: false,
    className: isEditable ? 'streamsUnitConnection nopan' : 'streamsRoutingConnection nopan',
    data: processingTarget ? { ...data, processingTarget } : data,
  };
};

/** The slot "Add processing" writes to, at the end of the slot. */
const slotTarget = (
  unit: Unit,
  ref: ProcessingNodeRef,
  exists: boolean
): UnitEdgeProcessingTarget | undefined =>
  isProcessingSlotEditable(unit, ref) ? { ref, position: SLOT_POSITION.end, exists } : undefined;

/**
 * Processing nodes and lines for routing pipelines. A pipeline's own processors
 * sit in front of its routing node, and a rule's processors sit between the
 * rule handle and the rule's targets.
 */
const buildRoutingGraph = (
  unit: Unit,
  routings: readonly RoutingViewModel[],
  sourceIds: ReadonlySet<string>,
  destinationIds: ReadonlySet<string>
): UnitCanvasGraph => {
  const pipelinesById = new Map(unit.unit.pipelines.map((pipeline) => [pipeline.id, pipeline]));
  const processingNodes: ProcessingNode[] = [];
  const edges: ClassicCanvasEdge[] = [];

  const pipelineRef = (pipelineId: string): ProcessingNodeRef => ({
    kind: PROCESSING_SLOT_KIND.pipeline,
    pipelineId,
  });
  const pipelineProcessorIds = (pipeline: UnitPipeline | undefined): string[] =>
    pipeline ? readEntryIds(pipeline.config, PIPELINE_ENTRY.processors) : [];
  /** Lines into a routing pipeline end at its processing, when it has any. */
  const entryNodeId = (pipelineId: string): string =>
    pipelineProcessorIds(pipelinesById.get(pipelineId)).length > 0
      ? processingNodeId(pipelineRef(pipelineId))
      : configuredRoutingNodeId(pipelineId);

  for (const routing of routings) {
    const pipeline = pipelinesById.get(routing.id);
    const routingNodeId = configuredRoutingNodeId(routing.id);
    const ownRef = pipelineRef(routing.id);
    const ownProcessorIds = pipelineProcessorIds(pipeline);
    const hasOwnProcessing = ownProcessorIds.length > 0;
    const isOwnSlotEditable = isProcessingSlotEditable(unit, ownRef);

    if (pipeline && hasOwnProcessing) {
      processingNodes.push(
        buildProcessingNode(
          {
            ref: ownRef,
            processorIds: ownProcessorIds,
            telemetry: [...pipeline.supported_telemetry],
            name: pipeline.name,
            editable: isOwnSlotEditable,
          },
          'fixed'
        )
      );
      edges.push(
        routingEdge(
          {
            id: `routing-${processingNodeId(ownRef)}->${routing.id}`,
            source: processingNodeId(ownRef),
            target: routingNodeId,
          },
          false,
          isOwnSlotEditable ? { ref: ownRef, position: SLOT_POSITION.end, exists: true } : undefined
        )
      );
    }

    const shownSourceIds = routing.sourceIds.filter((sourceId) => sourceIds.has(sourceId));
    for (const sourceId of shownSourceIds) {
      edges.push(
        routingEdge(
          {
            id: `routing-${sourceId}->${routing.id}`,
            source: configuredSourceNodeId(sourceId),
            target: entryNodeId(routing.id),
          },
          false,
          hasOwnProcessing
            ? isOwnSlotEditable
              ? { ref: ownRef, position: SLOT_POSITION.start, exists: true }
              : undefined
            : // A pipeline slot is shared by every source line, so only a lone line creates it.
            routing.sourceIds.length === 1
            ? slotTarget(unit, ownRef, false)
            : undefined
        )
      );
    }

    const routes = pipeline ? readRoutes(pipeline.config) : [];
    const usesRoutes = pipeline?.config.some(({ name }) => name === PIPELINE_ENTRY.routes) ?? false;
    for (const rule of routing.rules) {
      const handleId = routingRuleHandleId(rule.index);
      const routeRef: ProcessingNodeRef = {
        kind: PROCESSING_SLOT_KIND.route,
        pipelineId: routing.id,
        routeIndex: rule.index,
      };
      const routeProcessorIds = usesRoutes ? routes[rule.index]?.processors ?? [] : [];
      let ruleOutput: Pick<ClassicCanvasEdge, 'source' | 'sourceHandle'> = {
        source: routingNodeId,
        sourceHandle: handleId,
      };
      let ruleProcessingTarget: UnitEdgeProcessingTarget | undefined;
      if (routeProcessorIds.length > 0 && pipeline) {
        const route = routes[rule.index];
        processingNodes.push(
          buildProcessingNode(
            {
              ref: routeRef,
              processorIds: [...routeProcessorIds],
              telemetry: intersectSignals(pipeline.supported_telemetry, route?.telemetry),
              editable: true,
            },
            'reconnect'
          )
        );
        edges.push(
          routingEdge(
            {
              id: `routing-${routing.id}:${rule.index}->${processingNodeId(routeRef)}`,
              source: routingNodeId,
              sourceHandle: handleId,
              target: processingNodeId(routeRef),
            },
            false,
            { ref: routeRef, position: SLOT_POSITION.start, exists: true }
          )
        );
        ruleOutput = { source: processingNodeId(routeRef), sourceHandle: undefined };
        ruleProcessingTarget = { ref: routeRef, position: SLOT_POSITION.end, exists: true };
      } else if (usesRoutes) {
        ruleProcessingTarget = slotTarget(unit, routeRef, false);
      } else {
        // A routed child pipeline with plain destinations runs its own processors first.
        ruleProcessingTarget = slotTarget(unit, ownRef, hasOwnProcessing);
      }

      for (const { kind, id } of rule.targets) {
        const isOnCanvas = kind === 'destination' ? destinationIds.has(id) : pipelinesById.has(id);
        if (!isOnCanvas) {
          continue;
        }
        edges.push(
          routingEdge(
            {
              id: `routing-${routing.id}:${rule.index}->${kind}-${id}`,
              ...ruleOutput,
              target: kind === 'destination' ? configuredDestinationNodeId(id) : entryNodeId(id),
            },
            true,
            ruleProcessingTarget
          )
        );
      }
    }
  }
  return { processingNodes, edges };
};

/**
 * Processing nodes and edges for the unit's pipelines, between the configured
 * sources and destinations. Routing pipelines are drawn through their routing
 * nodes; every other pipeline follows the unit graph.
 */
export const buildUnitCanvasGraph = (
  unit: Unit,
  sourceIds: readonly string[],
  destinationIds: readonly string[],
  routings: readonly RoutingViewModel[] = []
): UnitCanvasGraph => {
  const shownSourceIds = new Set(sourceIds);
  const shownDestinationIds = new Set(destinationIds);
  const routingIds = new Set(routings.map(({ id }) => id));
  // Only routes delegate to other pipelines, so the rest of the unit stands on its own.
  const unrouted: Unit = {
    ...unit,
    unit: {
      ...unit.unit,
      pipelines: unit.unit.pipelines.filter(({ id }) => !routingIds.has(id)),
    },
  };
  const graph = buildUnitGraph(unrouted, shownSourceIds, shownDestinationIds);
  const processingNodes = graph.processingNodes.map((node) =>
    buildProcessingNode(node, node.ref.kind === PROCESSING_SLOT_KIND.pipeline ? 'connect' : 'fixed')
  );
  const edges = graph.edges.map(
    ({ source, target, forwarding, processingTarget }): ClassicCanvasEdge => {
      const isDirect =
        source.kind === GRAPH_ENDPOINT_KIND.source &&
        target.kind === GRAPH_ENDPOINT_KIND.destination;
      const isMovable =
        source.kind !== GRAPH_ENDPOINT_KIND.destination &&
        target.kind === GRAPH_ENDPOINT_KIND.destination &&
        canDisconnectFromDestination(unit, source, target.id);
      return {
        id: isDirect
          ? `unit-connection-${source.id}->${target.id}`
          : `unit-connection-${endpointNodeId(source)}->${endpointNodeId(target)}`,
        source: endpointNodeId(source),
        target: endpointNodeId(target),
        type: ANIMATED_EDGE_TYPE,
        reconnectable: isMovable,
        selectable: false,
        deletable: false,
        className: 'streamsUnitConnection nopan',
        data: { unitConnection: isMovable, forwarding, processingTarget },
      };
    }
  );
  const routed = buildRoutingGraph(unit, routings, shownSourceIds, shownDestinationIds);
  return {
    processingNodes: [...processingNodes, ...routed.processingNodes],
    edges: [...edges, ...routed.edges],
  };
};
