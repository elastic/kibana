/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiGraphNodeData } from './types';

export const KI_GRAPH_NODE_SIZE_BASE = 22;
export const KI_GRAPH_NODE_SIZE_SCALE_MIN = 0.62;
export const KI_GRAPH_NODE_SIZE_SCALE_RANGE = 0.85;
export const KI_GRAPH_NODE_SIZE_MIN = 16;
export const KI_GRAPH_NODE_SIZE_MAX = 56;
export const KI_GRAPH_NODE_SIZE_DEGREE_MAX = 12;
export const KI_GRAPH_NODE_SIZE_OCCURRENCES_MAX = 40;
export const KI_GRAPH_NODE_TINT_MIN_DEGREE = 4;
export const KI_GRAPH_NODE_TINT_MIN_OCCURRENCES = 8;
export const KI_GRAPH_NODE_ICON_HIDE_BELOW = 16;

export type KiGraphNodeSizeMode = 'connections' | 'occurrences' | 'both' | 'uniform';

export interface KiGraphNodeSizeParams {
  mode: KiGraphNodeSizeMode;
  baseSize: number;
  scaleMin: number;
  scaleRange: number;
  minSize: number;
  maxSize: number;
  degreeMax: number;
  occurrencesMax: number;
}

export const DEFAULT_KI_GRAPH_NODE_SIZE_PARAMS: KiGraphNodeSizeParams = {
  mode: 'both',
  baseSize: KI_GRAPH_NODE_SIZE_BASE,
  scaleMin: KI_GRAPH_NODE_SIZE_SCALE_MIN,
  scaleRange: KI_GRAPH_NODE_SIZE_SCALE_RANGE,
  minSize: KI_GRAPH_NODE_SIZE_MIN,
  maxSize: KI_GRAPH_NODE_SIZE_MAX,
  degreeMax: KI_GRAPH_NODE_SIZE_DEGREE_MAX,
  occurrencesMax: KI_GRAPH_NODE_SIZE_OCCURRENCES_MAX,
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const scaleT = (node: KiGraphNodeData, degree: number, params: KiGraphNodeSizeParams): number => {
  const degreeT = clamp01(degree / params.degreeMax);
  const occurrenceT =
    node.occurrences === undefined ? 0 : clamp01(node.occurrences / params.occurrencesMax);

  if (params.mode === 'uniform') {
    return 0;
  }
  if (params.mode === 'connections') {
    return degreeT;
  }
  if (params.mode === 'occurrences') {
    return occurrenceT;
  }
  return Math.max(degreeT, occurrenceT);
};

export const getKiGraphNodeSize = (
  node: KiGraphNodeData,
  degree: number,
  params: KiGraphNodeSizeParams = DEFAULT_KI_GRAPH_NODE_SIZE_PARAMS
): number => {
  if (params.mode === 'uniform') {
    return Math.min(params.maxSize, Math.max(params.minSize, params.baseSize));
  }
  const t = scaleT(node, degree, params);
  const scale = params.scaleMin + t * params.scaleRange;
  const raw = params.baseSize * scale;
  return Math.min(params.maxSize, Math.max(params.minSize, raw));
};
