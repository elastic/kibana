/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Dagre / React Flow node dimensions (must match custom node outer size). */
export const JOB_MAP_NODE_WIDTH = 200;
export const JOB_MAP_NODE_HEIGHT = 104;

export const JOB_MAP_RANK_SEPARATION = 72;
export const JOB_MAP_NODE_SEPARATION = 48;
export const JOB_MAP_GRAPH_MARGIN = 20;

/** Bottom padding (px) subtracted from the available height when sizing the canvas. */
export const JOB_MAP_CANVAS_BOTTOM_PADDING = 20;

/** Edge stroke width in pixels. */
export const JOB_MAP_EDGE_STROKE_WIDTH = 1;
/** Arrow marker size (width and height) in pixels. */
export const JOB_MAP_EDGE_MARKER_SIZE = 12;

/**
 * Legacy node type for Kibana index patterns.
 * Not included in JOB_MAP_NODE_TYPES in the shared package for back-compat reasons.
 */
export const JOB_MAP_INDEX_PATTERN_TYPE = 'index-pattern' as const;
