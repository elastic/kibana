/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Hop {
  segIndex: number;
  at: number;
  side: 1 | -1;
}

export interface IndexedEdges {
  idx: number;
  poly: Point[];
}

/**
 * Options for the overlapping/hop edge. All values have sensible defaults;
 */
export interface HopEdgeOptions {
  /** Radius of the hop/bridge arc drawn where wires cross. Default: 6 */
  hopRadius?: number;
  /** Horizontal offset of the first sibling branch when edges fan out. Default: 18 */
  fanStart?: number;
  /** Horizontal spacing between successive sibling branches. Default: 14 */
  fanStep?: number;
  /** Floating-point tolerance for treating segments as axis-aligned/intersecting. Default: 0.5 */
  epsilon?: number;
}

export const DEFAULT_HOP_EDGE_OPTIONS: Required<HopEdgeOptions> = {
  hopRadius: 6,
  fanStart: 18,
  fanStep: 14,
  epsilon: 0.5,
};
