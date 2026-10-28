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
  buildUnitGraph,
  processingNodeId,
  type UnitGraphEndpoint,
} from '../../../../services/unit_graph';
import type { Unit } from '../../../../services/unit_repository';
import {
  ANIMATED_EDGE_TYPE,
  PROCESSING_NODE_TYPE,
  type ClassicCanvasEdge,
  type ProcessingNode,
} from './types';

const CONFIGURED_SOURCE_PREFIX = 'configured-source-';
const CONFIGURED_DESTINATION_PREFIX = 'configured-destination-';

export const configuredSourceNodeId = (sourceId: string): string =>
  `${CONFIGURED_SOURCE_PREFIX}${sourceId}`;

export const configuredDestinationNodeId = (destinationId: string): string =>
  `${CONFIGURED_DESTINATION_PREFIX}${destinationId}`;

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

export interface UnitCanvasGraph {
  processingNodes: ProcessingNode[];
  edges: ClassicCanvasEdge[];
}

/** Processing nodes and edges for the unit's pipelines, between the configured sources and destinations. */
export const buildUnitCanvasGraph = (
  unit: Unit,
  sourceIds: readonly string[],
  destinationIds: readonly string[]
): UnitCanvasGraph => {
  const graph = buildUnitGraph(unit, new Set(sourceIds), new Set(destinationIds));
  const processingNodes = graph.processingNodes.map(
    ({ ref, processorIds, name, editable }): ProcessingNode => {
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
        data: { ref, title, processorCount: processorIds.length, editable },
      };
    }
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
  return { processingNodes, edges };
};
