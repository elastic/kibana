/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// React contexts that let dynamically-created nodes and edges reach the canvas's
// shared actions (opening flyouts, moving an edge's elbow) without threading
// callbacks through every node's/edge's data object.

import { createContext } from 'react';
import { noop } from './constants';
import type { EdgeSegments } from './edges/edge-bridges';

export const DestinationFlyoutContext = createContext<(destinationName: string) => void>(noop);
export const SourceFlyoutContext = createContext<(sourceName: string) => void>(noop);
export const PipelineFlyoutContext = createContext<(edgeId: string) => void>(noop);
// Opens the routing flyout for a routing condition triggered from a connector's
// "Add step" menu. Applying it splices a routing node into that edge (mirroring
// the pipeline-on-edge flow).
export const EdgeRoutingFlyoutContext = createContext<(edgeId: string) => void>(noop);

// Per-edge "bridge" hop points (where this edge's horizontal run crosses another
// edge's vertical run). Computed centrally so each edge can draw arcs over the
// crossings. Keyed by edge id → [{x,y}] in flow coordinates.
export const EdgeHopsContext = createContext<Map<string, Array<{ x: number; y: number }>>>(
  new Map()
);

// Each edge publishes its EXACT render-coordinate segments here (and removes
// them on unmount) so crossings/bridges are computed from the same coordinates
// the edges actually draw with.
export interface EdgeSegmentRegistry {
  publish: (edgeId: string, segments: EdgeSegments) => void;
  remove: (edgeId: string) => void;
}
export const EdgeSegmentsContext = createContext<EdgeSegmentRegistry>({
  publish: noop,
  remove: noop,
});
