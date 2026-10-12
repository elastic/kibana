/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUnitConnections } from '../../../../services/unit_connections';
import type { Unit } from '../../../../services/unit_repository';
import { ANIMATED_EDGE_TYPE, type ClassicCanvasEdge } from './types';

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

/** Edges for each source pipeline's own destination list. */
export const buildUnitConnectionEdges = (
  unit: Unit,
  sourceIds: readonly string[],
  destinationIds: readonly string[]
): ClassicCanvasEdge[] =>
  getUnitConnections(unit, new Set(sourceIds), new Set(destinationIds)).map(
    ({ sourceId, destinationId, forwarding }) => ({
      id: `unit-connection-${sourceId}->${destinationId}`,
      source: configuredSourceNodeId(sourceId),
      target: configuredDestinationNodeId(destinationId),
      type: ANIMATED_EDGE_TYPE,
      reconnectable: true,
      className: 'streamsUnitConnection nopan',
      data: { unitConnection: true, forwarding },
    })
  );
