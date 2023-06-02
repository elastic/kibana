/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

/**
 * Union type for ES result feature importance class name
 *
 * @export
 * @typedef {FeatureImportanceClassName}
 */
export type FeatureImportanceClassName = string | number | boolean;

/**
 * ES result class feature importance
 *
 * @export
 * @interface ClassFeatureImportance
 * @typedef {ClassFeatureImportance}
 */
export interface ClassFeatureImportance {
  /**
   * The class name
   * @type {FeatureImportanceClassName}
   */
  class_name: FeatureImportanceClassName;
  /**
   * The importance
   * @type {number}
   */
  importance: number;
}

/**
 * ES result feature importance interface
 * TODO We should separate the interface because classes/importance
 * isn't both optional but either/or.
 *
 * @export
 * @interface FeatureImportance
 * @typedef {FeatureImportance}
 */
export interface FeatureImportance {
  /**
   * The feature name
   * @type {string}
   */
  feature_name: string;
  /**
   * Optional classes
   * @type {?ClassFeatureImportance[]}
   */
  classes?: ClassFeatureImportance[];
  /**
   * Optional importance
   * @type {?number}
   */
  importance?: number;
}

/**
 * ES result top class interface
 *
 * @export
 * @interface TopClass
 * @typedef {TopClass}
 */
export interface TopClass {
  /**
   * The class name
   * @type {FeatureImportanceClassName}
   */
  class_name: FeatureImportanceClassName;
  /**
   * The class probability
   * @type {number}
   */
  class_probability: number;
  /**
   * The class score
   * @type {number}
   */
  class_score: number;
}

/**
 * Array of TopClass
 *
 * @export
 * @typedef {TopClasses}
 */
export type TopClasses = TopClass[];

/**
 * ES result for class feature importance summary
 *
 * @export
 * @interface ClassFeatureImportanceSummary
 * @typedef {ClassFeatureImportanceSummary}
 */
export interface ClassFeatureImportanceSummary {
  /**
   * The class name
   * @type {FeatureImportanceClassName}
   */
  class_name: FeatureImportanceClassName;
  /**
   * The importance
   * @type {{
      max: number;
      min: number;
      mean_magnitude: number;
    }}
   */
  importance: {
    max: number;
    min: number;
    mean_magnitude: number;
  };
}
/**
 * ES result classification total feature importance
 *
 * @export
 * @interface ClassificationTotalFeatureImportance
 * @typedef {ClassificationTotalFeatureImportance}
 */
export interface ClassificationTotalFeatureImportance {
  /**
   * The feature name
   * @type {string}
   */
  feature_name: string;
  /**
   * The classes, array of ClassFeatureImportanceSummary
   * @type {ClassFeatureImportanceSummary[]}
   */
  classes: ClassFeatureImportanceSummary[];
}

/**
 * ES result regression feature importance summary
 *
 * @export
 * @interface RegressionFeatureImportanceSummary
 * @typedef {RegressionFeatureImportanceSummary}
 */
export interface RegressionFeatureImportanceSummary {
  /**
   * Max feature importance
   * @type {number}
   */
  max: number;
  /**
   * Min feature importance
   * @type {number}
   */
  min: number;
  /**
   * Mean magnitude
   * @type {number}
   */
  mean_magnitude: number;
}

/**
 * ES result for regression total feature importance
 *
 * @export
 * @interface RegressionTotalFeatureImportance
 * @typedef {RegressionTotalFeatureImportance}
 */
export interface RegressionTotalFeatureImportance {
  /**
   * Feature name
   * @type {string}
   */
  feature_name: string;
  /**
   * Importance
   * @type {RegressionFeatureImportanceSummary}
   */
  importance: RegressionFeatureImportanceSummary;
}
/**
 * Union type of total feature importance types
 *
 * @export
 * @typedef {TotalFeatureImportance}
 */
export type TotalFeatureImportance =
  | ClassificationTotalFeatureImportance
  | RegressionTotalFeatureImportance;

/**
 * Baseline interface for ES result feature importance class
 *
 * @export
 * @interface FeatureImportanceClassBaseline
 * @typedef {FeatureImportanceClassBaseline}
 */
export interface FeatureImportanceClassBaseline {
  /**
   * Class name
   * @type {FeatureImportanceClassName}
   */
  class_name: FeatureImportanceClassName;
  /**
   * Baseline
   * @type {number}
   */
  baseline: number;
}
/**
 * Baseline interface for ES result classification feature importance
 *
 * @export
 * @interface ClassificationFeatureImportanceBaseline
 * @typedef {ClassificationFeatureImportanceBaseline}
 */
export interface ClassificationFeatureImportanceBaseline {
  /**
   * Classes
   * @type {FeatureImportanceClassBaseline[]}
   */
  classes: FeatureImportanceClassBaseline[];
}

/**
 * Baseline interface for ES result regression feature importance
 *
 * @export
 * @interface RegressionFeatureImportanceBaseline
 * @typedef {RegressionFeatureImportanceBaseline}
 */
export interface RegressionFeatureImportanceBaseline {
  /**
   * Baseline
   * @type {number}
   */
  baseline: number;
}

/**
 * Union type of feature importance baseline types
 *
 * @export
 * @typedef {FeatureImportanceBaseline}
 */
export type FeatureImportanceBaseline =
  | ClassificationFeatureImportanceBaseline
  | RegressionFeatureImportanceBaseline;

/**
 * Type guard for total feature importance
 *
 * @export
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
 * @export
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
 * @export
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
 * @export
 * @param {unknown} arg The baseline to identify
 * @returns {arg is RegressionFeatureImportanceBaseline}
 */
export function isRegressionFeatureImportanceBaseline(
  arg: unknown
): arg is RegressionFeatureImportanceBaseline {
  return isPopulatedObject(arg, ['baseline']);
}
