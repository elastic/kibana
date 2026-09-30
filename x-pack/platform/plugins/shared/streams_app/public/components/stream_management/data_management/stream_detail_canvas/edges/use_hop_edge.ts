/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useStore, type EdgeProps, type ReactFlowState } from '@xyflow/react';
import { useMemo } from 'react';
import {
  branchColumnXOn,
  buildPolyline,
  computeHops,
  getHandlePos,
  polylineToPath,
} from './edge_geometry';
import { DEFAULT_HOP_EDGE_OPTIONS, type IndexedEdges, type HopEdgeOptions } from './types';

const edgesSelector = (s: ReactFlowState) => s.edges;
const nodesSelector = (s: ReactFlowState) => s.nodeLookup;

export const useHopEdge = (
  { id, sourceX, sourceY, targetX, targetY, data }: EdgeProps,
  options: HopEdgeOptions = {}
) => {
  const defaults = { ...DEFAULT_HOP_EDGE_OPTIONS, ...options };
  const allEdges = useStore(edgesSelector);
  const nodeLookup = useStore(nodesSelector);

  const path = useMemo(() => {
    const d = (data ?? {}) as HopEdgeOptions;
    const hopRadius = d.hopRadius ?? defaults.hopRadius;
    const fanStart = d.fanStart ?? defaults.fanStart;
    const fanStep = d.fanStep ?? defaults.fanStep;
    const epsilon = d.epsilon ?? defaults.epsilon;

    const meIdx = allEdges.findIndex((e) => e.id === id);
    const meEdge = allEdges[meIdx];
    const myBranch = meEdge
      ? branchColumnXOn(meEdge, allEdges, sourceX, targetX, fanStart, fanStep)
      : (sourceX + targetX) / 2;
    const me = buildPolyline(sourceX, sourceY, targetX, targetY, myBranch);

    // Precompute other polylines + their array indices
    const othersData = allEdges
      .map((edge, idx) => ({ edge, idx }))
      .filter(({ edge }) => edge.id !== id)
      .map(({ edge, idx }) => {
        const sourcePoint = getHandlePos(nodeLookup, edge.source, edge.sourceHandle, 'source');
        const targetPoint = getHandlePos(nodeLookup, edge.target, edge.targetHandle, 'target');
        if (!sourcePoint || !targetPoint) return null;
        const oBranch = branchColumnXOn(
          edge,
          allEdges,
          sourcePoint.x,
          targetPoint.x,
          fanStart,
          fanStep
        );
        return {
          idx,
          poly: buildPolyline(sourcePoint.x, sourcePoint.y, targetPoint.x, targetPoint.y, oBranch),
        };
      })
      .filter((x): x is IndexedEdges => x !== null);

    const hops = computeHops(me, meIdx, othersData, epsilon);
    return polylineToPath(me, hops, hopRadius);
  }, [
    data,
    defaults.hopRadius,
    defaults.fanStart,
    defaults.fanStep,
    defaults.epsilon,
    allEdges,
    sourceX,
    targetX,
    sourceY,
    targetY,
    id,
    nodeLookup,
  ]);

  return path;
};
