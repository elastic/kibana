/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { DESTINATION_NODE_TYPE, type DestinationNode, type DestinationNodeData } from './types';

/**
 * Everything specific to the "destination" area of the graph. As new destination
 * kinds arrive (e.g. non-Elasticsearch sinks) they extend this module, while
 * `build_graph.ts` stays a thin orchestrator.
 */

/** A classic stream has processing when it carries at least one Streamlang step. */
export const hasProcessing = (definition: Streams.ClassicStream.Definition): boolean =>
  (definition.ingest.processing.steps?.length ?? 0) > 0;

/** Stable React Flow node id for a stream's destination. */
export const getDestinationNodeId = (definition: Streams.ClassicStream.Definition): string =>
  `destination-${definition.name}`;

export const inferDestination = (
  definition: Streams.ClassicStream.Definition
): DestinationNodeData => ({
  title: definition.name,
  hasProcessing: hasProcessing(definition),
});

/** Accessible name announced when a destination node receives keyboard focus. */
export const getDestinationAriaLabel = (definition: Streams.ClassicStream.Definition): string =>
  hasProcessing(definition)
    ? i18n.translate('xpack.streams.canvas.destinationNode.ariaLabelWithProcessing', {
        defaultMessage: 'Destination: {name}, with processing',
        values: { name: definition.name },
      })
    : i18n.translate('xpack.streams.canvas.destinationNode.ariaLabel', {
        defaultMessage: 'Destination: {name}',
        values: { name: definition.name },
      });

/** Builds the React Flow destination node for a stream (position filled in by layout). */
export const buildDestinationNode = (
  definition: Streams.ClassicStream.Definition
): DestinationNode => ({
  id: getDestinationNodeId(definition),
  type: DESTINATION_NODE_TYPE,
  position: { x: 0, y: 0 },
  ariaLabel: getDestinationAriaLabel(definition),
  data: inferDestination(definition),
});
