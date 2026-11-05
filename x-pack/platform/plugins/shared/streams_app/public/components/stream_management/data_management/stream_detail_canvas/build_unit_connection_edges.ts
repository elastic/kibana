/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { UnitLineOrigin } from '../../../../services/unit_connections';
import {
  GRAPH_ENDPOINT_KIND,
  LINE_TARGET_KIND,
  PROCESSING_SLOT_KIND,
  buildUnitGraph,
  processingNodeId,
  type UnitGraph,
  type UnitGraphEdge,
  type UnitGraphEndpoint,
  type UnitGraphProcessingNode,
  type UnitGraphRoutingNode,
  type UnitLineTarget,
} from '../../../../services/unit_graph';
import type { UnitSignal } from '../../../../services/unit_pipeline';
import type { Unit } from '../../../../services/unit_repository';
import { DESTINATION_SIGNAL_LABELS } from '../../../streams_layout/destinations/destination_type_config';
import type { DestinationSignal } from '../../../streams_layout/destinations/types';
import {
  ANIMATED_EDGE_TYPE,
  DESTINATION_NODE_TYPE,
  PROCESSING_NODE_TYPE,
  ROUTING_NODE_TYPE,
  SOURCE_NODE_TYPE,
  type ClassicCanvasEdge,
  type ClassicCanvasNode,
  type ProcessingNode,
  type ProcessingNodeOutput,
  type RoutingNode,
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

const findNode = (
  nodes: readonly ClassicCanvasNode[],
  nodeId: string | null | undefined
): ClassicCanvasNode | undefined => (nodeId ? nodes.find((node) => node.id === nodeId) : undefined);

export const readLineOrigin = (
  nodes: readonly ClassicCanvasNode[],
  nodeId: string | null | undefined,
  handleId: string | null | undefined
): UnitLineOrigin | undefined => {
  const node = findNode(nodes, nodeId);
  switch (node?.type) {
    case SOURCE_NODE_TYPE:
      return node.data.sourceId
        ? { kind: GRAPH_ENDPOINT_KIND.source, id: node.data.sourceId }
        : undefined;
    case ROUTING_NODE_TYPE: {
      const ruleIndex = readRoutingRuleIndex(handleId);
      return ruleIndex === undefined
        ? undefined
        : { kind: GRAPH_ENDPOINT_KIND.rule, rule: { pipelineId: node.data.pipelineId, ruleIndex } };
    }
    case PROCESSING_NODE_TYPE:
      return { kind: GRAPH_ENDPOINT_KIND.processing, ref: node.data.ref };
    default:
      return undefined;
  }
};

/**
 * Where a dragged line can end: a destination node, or a pipeline through its
 * routing node or the processing in front of it. A route's processing only
 * receives its own rule.
 */
export const readLineTarget = (
  nodes: readonly ClassicCanvasNode[],
  nodeId: string | null | undefined
): UnitLineTarget | undefined => {
  const node = findNode(nodes, nodeId);
  switch (node?.type) {
    case DESTINATION_NODE_TYPE:
      return node.data.destinationId
        ? { kind: LINE_TARGET_KIND.destination, id: node.data.destinationId }
        : undefined;
    case ROUTING_NODE_TYPE:
      return { kind: LINE_TARGET_KIND.pipeline, id: node.data.pipelineId };
    case PROCESSING_NODE_TYPE:
      return node.data.ref.kind === PROCESSING_SLOT_KIND.pipeline
        ? { kind: LINE_TARGET_KIND.pipeline, id: node.data.ref.pipelineId }
        : undefined;
    default:
      return undefined;
  }
};

const endpointNodeId = (endpoint: UnitGraphEndpoint): string => {
  switch (endpoint.kind) {
    case GRAPH_ENDPOINT_KIND.source:
      return configuredSourceNodeId(endpoint.id);
    case GRAPH_ENDPOINT_KIND.destination:
      return configuredDestinationNodeId(endpoint.id);
    case GRAPH_ENDPOINT_KIND.processing:
      return processingNodeId(endpoint.ref);
    case GRAPH_ENDPOINT_KIND.routing:
      return configuredRoutingNodeId(endpoint.pipelineId);
    case GRAPH_ENDPOINT_KIND.rule:
      return configuredRoutingNodeId(endpoint.rule.pipelineId);
  }
};

const endpointHandleId = (endpoint: UnitGraphEndpoint): string | undefined =>
  endpoint.kind === GRAPH_ENDPOINT_KIND.rule
    ? routingRuleHandleId(endpoint.rule.ruleIndex)
    : undefined;

const edgeId = ({ source, target }: UnitGraphEdge): string => {
  if (
    source.kind === GRAPH_ENDPOINT_KIND.source &&
    target.kind === GRAPH_ENDPOINT_KIND.destination
  ) {
    return `unit-connection-${source.id}->${target.id}`;
  }
  const handle = endpointHandleId(source);
  return `unit-connection-${endpointNodeId(source)}${handle ? `:${handle}` : ''}->${endpointNodeId(
    target
  )}`;
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

const ruleLabel = (when: string | undefined, ruleCount: number): string => {
  if (when) {
    return i18n.translate('xpack.streams.canvas.routingNode.whenRuleLabel', {
      defaultMessage: 'Condition: {condition}',
      values: { condition: when },
    });
  }
  return ruleCount === 1
    ? i18n.translate('xpack.streams.canvas.routingNode.allDataRuleLabel', {
        defaultMessage: 'All data',
      })
    : i18n.translate('xpack.streams.canvas.routingNode.otherwiseRuleLabel', {
        defaultMessage: 'Otherwise',
      });
};

/** Rule badges only exist for the signals destinations can be configured for. */
const isDestinationSignal = (signal: UnitSignal): signal is DestinationSignal =>
  signal in DESTINATION_SIGNAL_LABELS;

const buildRoutingNode = (routing: UnitGraphRoutingNode): RoutingNode => {
  const name = routing.name || routing.pipelineId;
  return {
    id: configuredRoutingNodeId(routing.pipelineId),
    type: ROUTING_NODE_TYPE,
    position: { x: 0, y: 0 },
    deletable: false,
    ariaLabel: i18n.translate('xpack.streams.canvas.routingNode.ariaLabel', {
      defaultMessage: 'Routing: {name}, {count, plural, one {# rule} other {# rules}}',
      values: { name, count: routing.rules.length },
    }),
    data: {
      pipelineId: routing.pipelineId,
      rules: routing.rules.map((rule) => ({
        handleId: routingRuleHandleId(rule.index),
        label: ruleLabel(rule.when, routing.rules.length),
        isCatchAll: rule.when === undefined,
        connected: rule.targets.length > 0,
        action: rule.action,
        ...(rule.telemetry ? { signals: rule.telemetry.filter(isDestinationSignal) } : {}),
      })),
    },
  };
};

const processingOutput = (
  graph: UnitGraph,
  node: UnitGraphProcessingNode
): ProcessingNodeOutput => {
  const { ref } = node;
  if (ref.kind === PROCESSING_SLOT_KIND.route) {
    const rule = graph.routingNodes
      .find(({ pipelineId }) => pipelineId === ref.pipelineId)
      ?.rules.find(({ index }) => index === ref.routeIndex);
    return rule && rule.targets.length > 0 ? 'reconnect' : 'connect';
  }
  const feedsRouting = graph.edges.some(
    ({ source, target }) =>
      source.kind === GRAPH_ENDPOINT_KIND.processing &&
      source.ref.pipelineId === ref.pipelineId &&
      source.ref.kind === PROCESSING_SLOT_KIND.pipeline &&
      target.kind === GRAPH_ENDPOINT_KIND.routing
  );
  return feedsRouting ? 'fixed' : 'connect';
};

const buildEdge = (edge: UnitGraphEdge): ClassicCanvasEdge => {
  const { source, target, forwarding, reference, editable, processingTarget } = edge;
  const data: UnitEdgeData = {
    editable,
    forwarding,
    ...(reference ? { reference } : {}),
    ...(processingTarget ? { processingTarget } : {}),
  };
  const sourceHandle = endpointHandleId(source);
  return {
    id: edgeId(edge),
    source: endpointNodeId(source),
    ...(sourceHandle ? { sourceHandle } : {}),
    target: endpointNodeId(target),
    type: ANIMATED_EDGE_TYPE,
    reconnectable: editable ? 'target' : false,
    selectable: false,
    deletable: false,
    className: editable ? 'streamsUnitConnection nopan' : 'streamsRoutingConnection nopan',
    data,
  };
};

export interface UnitCanvasGraph {
  processingNodes: ProcessingNode[];
  routingNodes: RoutingNode[];
  edges: ClassicCanvasEdge[];
}

/**
 * Processing nodes, routing nodes and lines for the unit's pipelines, between
 * the configured sources and destinations.
 */
export const buildUnitCanvasGraph = (
  unit: Unit,
  sourceIds: readonly string[],
  destinationIds: readonly string[]
): UnitCanvasGraph => {
  const graph = buildUnitGraph(unit, new Set(sourceIds), new Set(destinationIds));
  return {
    processingNodes: graph.processingNodes.map((node) =>
      buildProcessingNode(node, processingOutput(graph, node))
    ),
    routingNodes: graph.routingNodes.map(buildRoutingNode),
    edges: graph.edges.map(buildEdge),
  };
};
