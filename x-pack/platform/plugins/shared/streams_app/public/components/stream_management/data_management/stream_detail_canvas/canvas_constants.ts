/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Background dot grid spacing (px). Column/row gaps are multiples of this so
 * nodes and connectors align to the same visual grid.
 */
export const GRID_SIZE = 16;

export const SNAP_SIZE = 8;

/** Center-to-center horizontal distance between successive layout columns (px). */
export const COLUMN_GAP = 360;

/** Center-to-center vertical distance between successive rows within the canvas (px). */
export const ROW_GAP = 120;

/** Viewport zoom bounds for the canvas. */
export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 2;

/** Padding applied when fitting the graph into the viewport. */
export const FIT_VIEW_PADDING = 0.2;

/** Animation duration (ms) for the fit-to-screen control. */
export const FIT_VIEW_DURATION = 400;

/**
 * Comfortable margin (px, in flow coordinates) kept around the graph bounds when
 * bounding how far the canvas can be panned, so people can move a little past
 * the content but never drift into infinite empty space.
 */
export const PAN_MARGIN = 500;

/** Fixed card widths (px) for each node kind; the single source of truth used
 * by both the node components and the pan-bound estimate below. */
export const SOURCE_NODE_WIDTH = 207;
export const DESTINATION_NODE_WIDTH = 184;

/**
 * Fallback node footprint (px) used when computing the pan bounds before React
 * Flow has measured a node's real DOM size. Derived from the widest card so the
 * estimate never undershoots the real content.
 */
export const NODE_WIDTH_ESTIMATE = Math.max(SOURCE_NODE_WIDTH, DESTINATION_NODE_WIDTH);
export const NODE_HEIGHT_ESTIMATE = 80;

/** Minimap overview dimensions (px), matching the prototype. */
export const MINIMAP_WIDTH = 150;
export const MINIMAP_HEIGHT = 90;

export const MINIMAP_MASK_COLOR = 'rgba(105, 112, 125, 0.14)';
