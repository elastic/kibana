/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import {
  ANIMATED_EDGE_TYPE,
  DESTINATION_NODE_TYPE,
  SOURCE_NODE_TYPE,
  type ClassicCanvasGraph,
  type DestinationNodeData,
  type SourceNodeData,
} from './types';

/**
 * Classic streams have no first-class `source` for now, so we infer a generic async
 * `_bulk` (async_bulk) source.
 */
export const BULK_SOURCE_SUBTITLE = '_bulk';

const SOURCE_ICON_TYPE = 'push';

// Static layout: one source -> destination row per stream. Kept intentionally
// simple since this ticket renders a flat list of pairs for now.
const ROW_HEIGHT = 120;
const ROW_Y_OFFSET = 24;
const SOURCE_X = 0;
const DESTINATION_X = 360;

/** A classic stream has processing when it carries at least one Streamlang step. */
export const hasProcessing = (definition: Streams.ClassicStream.Definition): boolean =>
  (definition.ingest.processing.steps?.length ?? 0) > 0;

export const inferSource = (definition: Streams.ClassicStream.Definition): SourceNodeData => ({
  title: definition.name,
  subtitle: BULK_SOURCE_SUBTITLE,
  iconType: SOURCE_ICON_TYPE,
});

const buildDestination = (definition: Streams.ClassicStream.Definition): DestinationNodeData => ({
  title: definition.name,
  hasProcessing: hasProcessing(definition),
});

export const buildClassicStreamsGraph = (
  streams: Streams.ClassicStream.Definition[]
): ClassicCanvasGraph => {
  const nodes: ClassicCanvasGraph['nodes'] = [];
  const edges: ClassicCanvasGraph['edges'] = [];

  // The position calculations will change later on when we start saving the graph layout.
  streams.forEach((definition, index) => {
    const y = ROW_Y_OFFSET + index * ROW_HEIGHT;
    const sourceId = `source-${definition.name}`;
    const destinationId = `destination-${definition.name}`;

    nodes.push({
      id: sourceId,
      type: SOURCE_NODE_TYPE,
      position: { x: SOURCE_X, y },
      data: inferSource(definition),
    });

    nodes.push({
      id: destinationId,
      type: DESTINATION_NODE_TYPE,
      position: { x: DESTINATION_X, y },
      data: buildDestination(definition),
    });

    edges.push({
      id: `${sourceId}->${destinationId}`,
      source: sourceId,
      target: destinationId,
      type: ANIMATED_EDGE_TYPE,
    });
  });

  return { nodes, edges };
};
