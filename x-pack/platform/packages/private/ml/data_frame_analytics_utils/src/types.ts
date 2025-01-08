/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type Boom from '@hapi/boom';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import type { EsErrorBody } from '@kbn/ml-error-utils';
import type { MlUrlConfig } from '@kbn/ml-anomaly-utils';
import type { ANALYSIS_CONFIG_TYPE } from './constants';

/**
 * Interface for DFA API response for deletion status
 */
export interface DeleteDataFrameAnalyticsWithIndexStatus {
  /**
   * Success
   */
  success: boolean;
  /**
   * Optional error
   */
  error?: EsErrorBody | Boom.Boom;
}

/**
 * Index name
 */
export type IndexName = string;

/**
 * Data frame analytics id
 */
export type DataFrameAnalyticsId = string;

/**
 * Interface for outlier analysis job configuation
 */
export interface OutlierAnalysis {
  /**
   * Key spec for interface
   */
  [key: string]: {};

  /**
   * Outlier detection options
   */
  outlier_detection: {
    compute_feature_influence?: boolean;
  };
}

/**
 * Inner interface for regression job configuration options
 */
interface Regression {
  /**
   * Dependent variable
   */
  dependent_variable: string;
  /**
   * Training percent
   */
  training_percent: number;
  /**
   * Optional number of top feature importance values
   */
  num_top_feature_importance_values?: number;
  /**
   * Prediction field name
   */
  prediction_field_name?: string;
}

/**
 * Inner interface for classification job configuration options
 */
interface Classification {
  /**
   * Optional class assignment objective
   */
  class_assignment_objective?: string;
  /**
   * Dependent variable
   */
  dependent_variable: string;
  /**
   * Training percent
   */
  training_percent: number;
  /**
   * Optional number of top classes
   */
  num_top_classes?: number;
  /**
   * Optional number of top feature importance values
   */
  num_top_feature_importance_values?: number;
  /**
   * Optional prediction field name
   */
  prediction_field_name?: string;
}

/**
 * Interface for regression analysis job configuation
 */
export interface RegressionAnalysis {
  /**
   * Key spec for interface
   */
  [key: string]: Regression;

  /**
   * Regression options
   */
  regression: Regression;
}

/**
 * Interface for classification job configuation
 */
export interface ClassificationAnalysis {
  /**
   * Key spec for interface
   */
  [key: string]: Classification;

  /**
   * Outlier detection options
   */
  classification: Classification;
}

/**
 * Alias of estypes.MlDataframeAnalysisContainer
 */
export type AnalysisConfig = estypes.MlDataframeAnalysisContainer;

/**
 * Meta data for a DFA job
 */
export interface DataFrameAnalyticsMeta {
  /**
   * Optional custom urls
   */
  custom_urls?: MlUrlConfig[];
  /**
   * Key spec for interface
   */
  [key: string]: any;
}

/**
 * Interface for a DFA config with fix for estypes provided types
 */
export interface DataFrameAnalyticsConfig
  extends Omit<estypes.MlDataframeAnalyticsSummary, 'analyzed_fields'> {
  /**
   * Optional analyzed fields
   */
  analyzed_fields?: estypes.MlDataframeAnalysisAnalyzedFields;
  /**
   * Optional meta data
   */
  _meta?: DataFrameAnalyticsMeta;
}

/**
 * Interface for a requect object to update a DFA job
 */
export interface UpdateDataFrameAnalyticsConfig {
  /**
   * Optional allow lazy start
   */
  allow_lazy_start?: string;
  /**
   * Optional description
   */
  description?: string;
  /**
   * Optional model memory limit
   */
  model_memory_limit?: string;
  /**
   * Optional max num threads
   */
  max_num_threads?: number;
  /**
   * Optional meta data
   */
  _meta?: DataFrameAnalyticsMeta;
}

/**
 * Type guard for a DFA config
 *
 * @param {unknown} arg The config to identify
 * @returns {arg is DataFrameAnalyticsConfig}
 */
export function isDataFrameAnalyticsConfigs(arg: unknown): arg is DataFrameAnalyticsConfig {
  return isPopulatedObject(arg, ['dest', 'analysis', 'id']) && typeof arg.id === 'string';
}

/**
 * Union type of DFA anlaysis config types
 */
export type DataFrameAnalysisConfigType =
  (typeof ANALYSIS_CONFIG_TYPE)[keyof typeof ANALYSIS_CONFIG_TYPE];

/**
 * Union type of DFA task states
 */
export type DataFrameTaskStateType = estypes.MlDataframeState | 'analyzing' | 'reindexing';

/**
 * Interface for DFA stats
 */
export interface DataFrameAnalyticsStats extends Omit<estypes.MlDataframeAnalytics, 'state'> {
  /**
   * Optional failure reason
   */
  failure_reason?: string;
  /**
   * Task state
   */
  state: DataFrameTaskStateType;
}

/**
 * Alias for estypes.MlExplainDataFrameAnalyticsResponse
 */
export type DfAnalyticsExplainResponse = estypes.MlExplainDataFrameAnalyticsResponse;

/**
 * Interface for predicted class
 */
export interface PredictedClass {
  /**
   * Predicted class
   */
  predicted_class: string;
  /**
   * Count
   */
  count: number;
}

/**
 * Interface for confusion matrix
 */
export interface ConfusionMatrix {
  /**
   * Actual class
   */
  actual_class: string;
  /**
   * Actual class doc count
   */
  actual_class_doc_count: number;
  /**
   * Array of predicted classes
   */
  predicted_classes: PredictedClass[];
  /**
   * Doc count of other predicted classes
   */
  other_predicted_class_doc_count: number;
}

/**
 * Data item for ROC curve
 */
export interface RocCurveItem {
  /**
   * FPR
   */
  fpr: number;
  /**
   * Threshold
   */
  threshold: number;
  /**
   * TPR
   */
  tpr: number;
}

/**
 * Eval Class
 */
interface EvalClass {
  /**
   * Class name
   */
  class_name: string;
  /**
   * Value
   */
  value: number;
}

/**
 * Interface for classification evaluate response
 */
export interface ClassificationEvaluateResponse {
  /**
   * Classification evaluation
   */
  classification: {
    multiclass_confusion_matrix?: {
      confusion_matrix: ConfusionMatrix[];
    };
    recall?: {
      classes: EvalClass[];
      avg_recall: number;
    };
    accuracy?: {
      classes: EvalClass[];
      overall_accuracy: number;
    };
    auc_roc?: {
      curve?: RocCurveItem[];
      value: number;
    };
  };
}

/**
 * Interface for evalute metrics
 */
export interface EvaluateMetrics {
  /**
   * Classification evalute metrics
   */
  classification: {
    accuracy?: object;
    recall?: object;
    multiclass_confusion_matrix?: object;
    auc_roc?: { include_curve: boolean; class_name: string };
  };
  /**
   * Regression evaluate metrics
   */
  regression: {
    r_squared: object;
    mse: object;
    msle: object;
    huber: object;
  };
}

/**
 * Interface for field selection item
 */
export interface FieldSelectionItem
  extends Omit<estypes.MlDataframeAnalyticsFieldSelection, 'mapping_types'> {
  /**
   * Optional mapping types
   * @type {?string[]}
   */
  mapping_types?: string[];
}

/**
 * Interface for a node element for the map view
 */
export interface AnalyticsMapNodeElement {
  /**
   * Inner data of the node element
   */
  data: {
    id: string;
    label: string;
    type: string;
    analysisType?: string;
    isRoot?: boolean;
  };
}

/**
 * Interface for an edge element for the map view
 */
export interface AnalyticsMapEdgeElement {
  /**
   * Inner data of the edge element
   */
  data: {
    id: string;
    source: string;
    target: string;
  };
}

/**
 * Union type of map node and edge elements
 */
export type MapElements = AnalyticsMapNodeElement | AnalyticsMapEdgeElement;

/**
 * Interface for DFA map return type
 */
export interface AnalyticsMapReturnType {
  /**
   * Map elements
   */
  elements: MapElements[];
  /**
   * Transform, job or index details
   */
  details: Record<string, any>;
  /**
   * Error
   */
  error: null | any;
}

/**
 * Alias for estypes.MlDataframeAnalysisFeatureProcessor
 */
export type FeatureProcessor = estypes.MlDataframeAnalysisFeatureProcessor;

/**
 * Interface for a search response's track total hits option
 */
export interface TrackTotalHitsSearchResponse {
  /**
   * Inner structure of the response
   */
  hits: {
    total: {
      value: number;
      relation: string;
    };
    hits: any[];
  };
}
