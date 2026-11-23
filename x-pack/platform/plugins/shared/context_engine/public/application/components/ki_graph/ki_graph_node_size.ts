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

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const normalizeDegree = (degree: number): number => clamp01(degree / KI_GRAPH_NODE_SIZE_DEGREE_MAX);

const normalizeOccurrences = (occurrences: number): number =>
  clamp01(occurrences / KI_GRAPH_NODE_SIZE_OCCURRENCES_MAX);

export const getKiGraphNodeSize = (node: KiGraphNodeData, degree: number): number => {
  const degreeT = normalizeDegree(degree);
  const occurrenceT = node.occurrences === undefined ? 0 : normalizeOccurrences(node.occurrences);
  const t = Math.max(degreeT, occurrenceT);
  const scale = KI_GRAPH_NODE_SIZE_SCALE_MIN + t * KI_GRAPH_NODE_SIZE_SCALE_RANGE;
  const raw = KI_GRAPH_NODE_SIZE_BASE * scale;
  return Math.min(KI_GRAPH_NODE_SIZE_MAX, Math.max(KI_GRAPH_NODE_SIZE_MIN, raw));
};
