/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Custom enum for DFA config types
 *
 * @type {{ readonly OUTLIER_DETECTION: "outlier_detection"; readonly REGRESSION: "regression"; readonly CLASSIFICATION: "classification"; }}
 */
export const ANALYSIS_CONFIG_TYPE = {
  OUTLIER_DETECTION: 'outlier_detection',
  REGRESSION: 'regression',
  CLASSIFICATION: 'classification',
} as const;

/**
 * Custom enum for DFA task states
 *
 * @type {{ readonly ANALYZING: "analyzing"; readonly FAILED: "failed"; readonly REINDEXING: "reindexing"; readonly STARTED: "started"; readonly STARTING: "starting"; readonly STOPPED: "stopped"; }}
 */
export const DATA_FRAME_TASK_STATE = {
  ANALYZING: 'analyzing',
  FAILED: 'failed',
  REINDEXING: 'reindexing',
  STARTED: 'started',
  STARTING: 'starting',
  STOPPED: 'stopped',
} as const;

/**
 * Default results field
 *
 * @type {"ml"}
 */
export const DEFAULT_RESULTS_FIELD = 'ml';

/**
 * Custom enum for job map node types for the DFA map view
 *
 * @type {{ readonly ANALYTICS: "analytics"; readonly TRANSFORM: "transform"; readonly INDEX: "index"; readonly TRAINED_MODEL: "trainedModel"; }}
 */
export const JOB_MAP_NODE_TYPES = {
  ANALYTICS: 'analytics',
  TRANSFORM: 'transform',
  INDEX: 'index',
  TRAINED_MODEL: 'trainedModel',
} as const;

/**
 * Union type of JOB_MAP_NODE_TYPES
 *
 * @export
 * @typedef {JobMapNodeTypes}
 */
export type JobMapNodeTypes = typeof JOB_MAP_NODE_TYPES[keyof typeof JOB_MAP_NODE_TYPES];

/**
 * Custom enum for the metadata to be stored about which tool was used to create an index
 *
 * @type {{ readonly FILE_DATA_VISUALIZER: "file-data-visualizer"; readonly DATA_FRAME_ANALYTICS: "data-frame-analytics"; }}
 */
export const INDEX_CREATED_BY = {
  FILE_DATA_VISUALIZER: 'file-data-visualizer',
  DATA_FRAME_ANALYTICS: 'data-frame-analytics',
} as const;

/**
 * Feature importance constant
 *
 * @type {"feature_importance"}
 */
export const FEATURE_IMPORTANCE = 'feature_importance';

/**
 * Feature influence constant
 *
 * @type {"feature_influence"}
 */
export const FEATURE_INFLUENCE = 'feature_influence';

/**
 * Top classes constant
 *
 * @type {"top_classes"}
 */
export const TOP_CLASSES = 'top_classes';

/**
 * Outlier score constant
 *
 * @type {"outlier_score"}
 */
export const OUTLIER_SCORE = 'outlier_score';

/**
 * Enum for a DFA configuration's advanced fields
 *
 * @export
 * @enum {number}
 */
export enum ANALYSIS_ADVANCED_FIELDS {
  ALPHA = 'alpha',
  ETA = 'eta',
  ETA_GROWTH_RATE_PER_TREE = 'eta_growth_rate_per_tree',
  DOWNSAMPLE_FACTOR = 'downsample_factor',
  FEATURE_BAG_FRACTION = 'feature_bag_fraction',
  FEATURE_INFLUENCE_THRESHOLD = 'feature_influence_threshold',
  GAMMA = 'gamma',
  LAMBDA = 'lambda',
  MAX_TREES = 'max_trees',
  MAX_OPTIMIZATION_ROUNDS_PER_HYPERPARAMETER = 'max_optimization_rounds_per_hyperparameter',
  METHOD = 'method',
  N_NEIGHBORS = 'n_neighbors',
  NUM_TOP_CLASSES = 'num_top_classes',
  NUM_TOP_FEATURE_IMPORTANCE_VALUES = 'num_top_feature_importance_values',
  OUTLIER_FRACTION = 'outlier_fraction',
  RANDOMIZE_SEED = 'randomize_seed',
  SOFT_TREE_DEPTH_LIMIT = 'soft_tree_depth_limit',
  SOFT_TREE_DEPTH_TOLERANCE = 'soft_tree_depth_tolerance',
}

/**
 * Enum for a DFA configuration's outlier analysis method
 *
 * @export
 * @enum {number}
 */
export enum OUTLIER_ANALYSIS_METHOD {
  LOF = 'lof',
  LDOF = 'ldof',
  DISTANCE_KTH_NN = 'distance_kth_nn',
  DISTANCE_KNN = 'distance_knn',
}

/**
 * Minimum value for feature importance
 *
 * @type {0}
 */
export const NUM_TOP_FEATURE_IMPORTANCE_VALUES_MIN = 0;

/**
 * Minimum training percent
 *
 * @type {1}
 */
export const TRAINING_PERCENT_MIN = 1;

/**
 * Maximum training percent
 *
 * @type {100}
 */
export const TRAINING_PERCENT_MAX = 100;

/**
 * Enum for index status
 *
 * @export
 * @enum {number}
 */
export enum INDEX_STATUS {
  UNUSED,
  LOADING,
  LOADED,
  ERROR,
}
