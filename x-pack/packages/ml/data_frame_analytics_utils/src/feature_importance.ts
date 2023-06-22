/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

/**
 * Union type for ES result feature importance class name
 */
export type FeatureImportanceClassName = string | number | boolean;

/**
 * ES result class feature importance
 */
export interface ClassFeatureImportance {
  /**
   * The class name
   */
  class_name: FeatureImportanceClassName;
  /**
   * The importance
   */
  importance: number;
}

/**
 * ES result feature importance interface
 * TODO We should separate the interface because classes/importance
 * isn't both optional but either/or.
 */
export interface FeatureImportance {
  /**
   * The feature name
   */
  feature_name: string;
  /**
   * Optional classes
   */
  classes?: ClassFeatureImportance[];
  /**
   * Optional importance
   */
  importance?: number;
}

/**
 * ES result top class interface
 */
export interface TopClass {
  /**
   * The class name
   */
  class_name: FeatureImportanceClassName;
  /**
   * The class probability
   */
  class_probability: number;
  /**
   * The class score
   */
  class_score: number;
}

/**
 * Array of TopClass
 */
export type TopClasses = TopClass[];

/**
 * ES result for class feature importance summary
 */
export interface ClassFeatureImportanceSummary {
  /**
   * The class name
   */
  class_name: FeatureImportanceClassName;
  /**
   * The importance
   */
  importance: {
    max: number;
    min: number;
    mean_magnitude: number;
  };
}
/**
 * ES result classification total feature importance
 */
export interface ClassificationTotalFeatureImportance {
  /**
   * The feature name
   */
  feature_name: string;
  /**
   * The classes, array of ClassFeatureImportanceSummary
   */
  classes: ClassFeatureImportanceSummary[];
}

/**
 * ES result regression feature importance summary
 */
export interface RegressionFeatureImportanceSummary {
  /**
   * Max feature importance
   */
  max: number;
  /**
   * Min feature importance
   */
  min: number;
  /**
   * Mean magnitude
   */
  mean_magnitude: number;
}

/**
 * ES result for regression total feature importance
 */
export interface RegressionTotalFeatureImportance {
  /**
   * Feature name
   */
  feature_name: string;
  /**
   * Importance
   */
  importance: RegressionFeatureImportanceSummary;
}
/**
 * Union type of total feature importance types
 */
export type TotalFeatureImportance =
  | ClassificationTotalFeatureImportance
  | RegressionTotalFeatureImportance;

/**
 * Baseline interface for ES result feature importance class
 */
export interface FeatureImportanceClassBaseline {
  /**
   * Class name
   */
  class_name: FeatureImportanceClassName;
  /**
   * Baseline
   */
  baseline: number;
}
/**
 * Baseline interface for ES result classification feature importance
 */
export interface ClassificationFeatureImportanceBaseline {
  /**
   * Classes
   */
  classes: FeatureImportanceClassBaseline[];
}

/**
 * Baseline interface for ES result regression feature importance
 */
export interface RegressionFeatureImportanceBaseline {
  /**
   * Baseline
   */
  baseline: number;
}

/**
 * Union type of feature importance baseline types
 */
export type FeatureImportanceBaseline =
  | ClassificationFeatureImportanceBaseline
  | RegressionFeatureImportanceBaseline;

/**
 * Type guard for total feature importance
 *
 * @param {unknown} arg The feature importance to identify
 * @returns {arg is ClassificationTotalFeatureImportance}
 */
export function isClassificationTotalFeatureImportance(
  arg: unknown
): arg is ClassificationTotalFeatureImportance {
  return isPopulatedObject(arg, ['classes']) && Array.isArray(arg.classes);
}

/**
 * Type guard for regression total feature importance
 *
 * @param {unknown} arg The feature importance to identify
 * @returns {arg is RegressionTotalFeatureImportance}
 */
export function isRegressionTotalFeatureImportance(
  arg: unknown
): arg is RegressionTotalFeatureImportance {
  return isPopulatedObject(arg, ['importance']);
}

/**
 * Type guard for classification feature importance baseline
 *
 * @param {unknown} arg The baseline to identify
 * @returns {arg is ClassificationFeatureImportanceBaseline}
 */
export function isClassificationFeatureImportanceBaseline(
  arg: unknown
): arg is ClassificationFeatureImportanceBaseline {
  return isPopulatedObject(arg, ['classes']) && Array.isArray(arg.classes);
}

/**
 * Type guard for regression feature importance baseline
 *
 * @param {unknown} arg The baseline to identify
 * @returns {arg is RegressionFeatureImportanceBaseline}
 */
export function isRegressionFeatureImportanceBaseline(
  arg: unknown
): arg is RegressionFeatureImportanceBaseline {
  return isPopulatedObject(arg, ['baseline']);
}
