/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const VECTOR_PROJECTION_EMBEDDABLE_TYPE = 'vector_projection';
export const ADD_VECTOR_PROJECTION_ACTION_ID = 'ACTION_ADD_VECTOR_PROJECTION';
export const VECTOR_PROJECTION_DATA_VIEW_REF_NAME = 'vectorProjectionDataView';

export const DEFAULT_SAMPLE_SIZE = 2000;
/** Upper bound for sampled documents; matches the default `index.max_result_window`. */
export const MAX_SAMPLE_SIZE = 10000;
export const DEFAULT_N_NEIGHBORS = 15;
export const DEFAULT_MIN_DIST = 0.1;

export const CLUSTER_DETAIL_LEVELS = ['low', 'medium', 'high', 'very_high'] as const;
export type ClusterDetail = (typeof CLUSTER_DETAIL_LEVELS)[number];
export const DEFAULT_CLUSTER_DETAIL: ClusterDetail = 'medium';
/** Scale factor for the auto-estimated DBSCAN epsilon; smaller values split more clusters. */
export const CLUSTER_DETAIL_EPSILON_MULTIPLIER: Readonly<Record<ClusterDetail, number>> = {
  low: 1.2,
  medium: 1.0,
  high: 0.7,
  very_high: 0.5,
};

/** Visible point radius in CSS pixels. */
export const DEFAULT_POINT_SIZE = 3;
export const MIN_POINT_SIZE = 0.5;
export const MAX_POINT_SIZE = 10;
/** Strength of the depth fog in 3D projections, from 0 (off) to 1. */
export const DEFAULT_FOG_STRENGTH = 0.7;
export const DEFAULT_AUTO_ROTATE = true;
export const DEFAULT_SHOW_LABELS = true;

export const BACKGROUND_OPTIONS = ['light', 'dark'] as const;
export type BackgroundOption = (typeof BACKGROUND_OPTIONS)[number];
export const DEFAULT_BACKGROUND: BackgroundOption = 'dark';
/** Matches the default background of the `@kbn/umap-webgpu` renderer. */
export const DARK_BACKGROUND_COLOR = '#1E293B';
/** Fixed seed so a panel shows the same sample on every reload. */
export const RANDOM_SAMPLE_SEED = 42;
/** Label values beyond this many distinct categories are grouped as "Other". */
export const MAX_LEGEND_CATEGORIES = 20;
