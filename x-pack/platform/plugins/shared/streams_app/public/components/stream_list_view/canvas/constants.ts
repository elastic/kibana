/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Canvas-wide constants and the connection-validity rules.

import type { Edge } from '@xyflow/react';

export type CanvasNodeType = 'source' | 'destination';

export const DRAG_DATA_TYPE = 'application/streams-canvas-node';

// Fine-grained snap grid. Dragged nodes snap to 16px steps so arranging the
// canvas naturally produces clean, aligned rows and columns. The background
// dot pattern uses the same gap so the snap points are visible.
export const GRID_SIZE = 16;
export const GRID_SNAP: [number, number] = [GRID_SIZE, GRID_SIZE];

// The node-type pairs an edge may connect, as [sourceType, targetType]:
// Data flows left→right: anything that emits data (source, pipeline, routing,
// destination-reroute) may connect into anything that consumes it (pipeline,
// routing, destination). Only sources can't be a TARGET (they have no input),
// and a node can't connect to itself (enforced in isValidConnection). This is
// the full cross-product of those sets, so links can be drawn into pipelines
// and routing nodes too (e.g. pipeline → pipeline, pipeline → routing).
const CONNECTABLE_FROM = ['source', 'pipeline', 'routing', 'destination'];
const CONNECTABLE_TO = ['pipeline', 'routing', 'destination'];
export const ALLOWED_CONNECTIONS: ReadonlyArray<readonly [string, string]> =
  CONNECTABLE_FROM.flatMap((from) => CONNECTABLE_TO.map((to) => [from, to] as const));

// Target node types a connector starting from the given source type may land on.
export function allowedTargetTypesFor(sourceType: string | undefined): string[] {
  if (!sourceType) {
    return [];
  }
  return ALLOWED_CONNECTIONS.filter(([from]) => from === sourceType).map(([, to]) => to);
}

// Source node types that may feed into the given target type (the inverse of
// allowedTargetTypesFor; used when the tail/source end of a connector is dragged).
export function allowedSourceTypesFor(targetType: string | undefined): string[] {
  if (!targetType) {
    return [];
  }
  return ALLOWED_CONNECTIONS.filter(([, to]) => to === targetType).map(([from]) => from);
}

// The id of the routing endpoint node that a dangling routing edge ends at, if any.
export function danglingEndpointIdOf(edge: Pick<Edge, 'data'>): string | undefined {
  return edge.data?.routingEndpointNodeId as string | undefined;
}

export const noop = () => {};
