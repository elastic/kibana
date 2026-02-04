/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Default panel sizes based on visualization type
export const DEFAULT_PANEL_HEIGHT = 9;
export const SMALL_PANEL_WIDTH = 12; // Metrics & small charts (4 per row)
export const LARGE_PANEL_WIDTH = 24; // XY & other charts (2 per row)

// Markdown panel dimensions
export const MARKDOWN_PANEL_WIDTH = 48; // Full width
export const MARKDOWN_MIN_HEIGHT = 6;
export const MARKDOWN_MAX_HEIGHT = 9;

// Chart types that use smaller panel widths
export const SMALL_CHART_TYPES = new Set(['metric', 'legacy_metric', 'gauge']);
