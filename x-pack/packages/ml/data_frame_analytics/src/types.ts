/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { EsErrorBody } from '@kbn/ml-error-utils';
import type { MlUrlConfig } from '@kbn/ml-anomaly-utils';
import { ANALYSIS_CONFIG_TYPE } from './constants';

/**
 * Interface for DFA API response for deletion status
 *
 * @export
 * @interface DeleteDataFrameAnalyticsWithIndexStatus
 * @typedef {DeleteDataFrameAnalyticsWithIndexStatus}
 */
export interface DeleteDataFrameAnalyticsWithIndexStatus {
  /**
   * Success
   * @type {boolean}
   */
  success: boolean;
  /**
   * Optional error
   * @type {?(EsErrorBody | Boom.Boom)}
   */
  error?: EsErrorBody | Boom.Boom;
}

/**
 * Index name
 * @export
 * @typedef {IndexName}
 */
export type IndexName = string;

/**
 * Data frame analytics id
 * @export
 * @typedef {DataFrameAnalyticsId}
 */
export type DataFrameAnalyticsId = string;

/**
 * Interface for outlier analysis job configuation
 *
 * @export
 * @interface OutlierAnalysis
 * @typedef {OutlierAnalysis}
 */
export interface OutlierAnalysis {
  /**
   * Key spec for interface
   */
  [key: string]: {};

  /**
   * Outlier detection options
   * @type {{
      compute_feature_influence?: boolean;
    }}
   */
  outlier_detection: {
    compute_feature_influence?: boolean;
  };
}

/**
 * Inner interface for regression job configuration options
 *
 * @interface Regression
 * @typedef {Regression}
 */
interface Regression {
  /**
   * Dependent variable
   * @type {string}
   */
  dependent_variable: string;
  /**
   * Training percent
   * @type {number}
   */
  training_percent: number;
  /**
   * Optional number of top feature importance values
   * @type {?number}
   */
  num_top_feature_importance_values?: number;
  /**
   * Prediction field name
   * @type {?string}
   */
  prediction_field_name?: string;
}

/**
 * Inner interface for classification job configuration options
 *
 * @interface Classification
 * @typedef {Classification}
 */
interface Classification {
  /**
   * Optional class assignment objective
   * @type {?string}
   */
  class_assignment_objective?: string;
  /**
   * Dependent variable
   * @type {string}
   */
  dependent_variable: string;
  /**
   * Training percent
   * @type {number}
   */
  training_percent: number;
  /**
   * Optional number of top classes
   * @type {?number}
   */
  num_top_classes?: number;
  /**
   * Optional number of top feature importance values
   * @type {?number}
   */
  num_top_feature_importance_values?: number;
  /**
   * Optional prediction field name
   * @type {?string}
   */
  prediction_field_name?: string;
}

/**
 * Interface for regression analysis job configuation
 *
 * @export
 * @interface RegressionAnalysis
 * @typedef {RegressionAnalysis}
 */
export interface RegressionAnalysis {
  /**
   * Key spec for interface
   */
  [key: string]: Regression;

  /**
   * Regression options
   * @type {Regression}
   */
  regression: Regression;
}

/**
 * Interface for classification job configuation
 *
 * @export
 * @interface ClassificationAnalysis
 * @typedef {ClassificationAnalysis}
 */
export interface ClassificationAnalysis {
  /**
   * Key spec for interface
   */
  [key: string]: Classification;

  /**
   * Outlier detection options
   * @type {Classification}
   */
  classification: Classification;
}

/**
 * Alias of estypes.MlDataframeAnalysisContainer
 *
 * @export
 * @typedef {AnalysisConfig}
 */
export type AnalysisConfig = estypes.MlDataframeAnalysisContainer;

/**
 * Meta data for a DFA job
 *
 * @export
 * @interface DataFrameAnalyticsMeta
 * @typedef {DataFrameAnalyticsMeta}
 */
export interface DataFrameAnalyticsMeta {
  /**
   * Optional custom urls
   * @type {?MlUrlConfig[]}
   */
  custom_urls?: MlUrlConfig[];
  /**
   * Key spec for interface
   */
  [key: string]: any;
}

/**
 * Interface for a DFA config with fix for estypes provided types
 *
 * @export
 * @interface DataFrameAnalyticsConfig
 * @typedef {DataFrameAnalyticsConfig}
 * @extends {Omit<estypes.MlDataframeAnalyticsSummary, 'analyzed_fields'>}
 */
export interface DataFrameAnalyticsConfig
  extends Omit<estypes.MlDataframeAnalyticsSummary, 'analyzed_fields'> {
  /**
   * Optional analyzed fields
   * @type {?estypes.MlDataframeAnalysisAnalyzedFields}
   */
  analyzed_fields?: estypes.MlDataframeAnalysisAnalyzedFields;
  /**
   * Optional meta data
   * @type {?DataFrameAnalyticsMeta}
   */
  _meta?: DataFrameAnalyticsMeta;
}

/**
 * Interface for a requect object to update a DFA job
 *
 * @export
 * @interface UpdateDataFrameAnalyticsConfig
 * @typedef {UpdateDataFrameAnalyticsConfig}
 */
export interface UpdateDataFrameAnalyticsConfig {
  /**
   * Optional allow lazy start
   * @type {?string}
   */
  allow_lazy_start?: string;
  /**
   * Optional description
   * @type {?string}
   */
  description?: string;
  /**
   * Optional model memory limit
   * @type {?string}
   */
  model_memory_limit?: string;
  /**
   * Optional max num threads
   * @type {?number}
   */
  max_num_threads?: number;
  /**
   * Optional meta data
   * @type {?DataFrameAnalyticsMeta}
   */
  _meta?: DataFrameAnalyticsMeta;
}

/**
 * Type guard for a DFA config
 *
 * @export
 * @param {unknown} arg The config to identify
 * @returns {arg is DataFrameAnalyticsConfig}
 */
export function isDataFrameAnalyticsConfigs(arg: unknown): arg is DataFrameAnalyticsConfig {
  return isPopulatedObject(arg, ['dest', 'analysis', 'id']) && typeof arg.id === 'string';
}

/**
 * Union type of DFA anlaysis config types
 *
 * @export
 * @typedef {DataFrameAnalysisConfigType}
 */
export type DataFrameAnalysisConfigType =
  typeof ANALYSIS_CONFIG_TYPE[keyof typeof ANALYSIS_CONFIG_TYPE];

/**
 * Union type of DFA task states
 *
 * @export
 * @typedef {DataFrameTaskStateType}
 */
export type DataFrameTaskStateType = estypes.MlDataframeState | 'analyzing' | 'reindexing';

/**
 * Interface for DFA stats
 *
 * @export
 * @interface DataFrameAnalyticsStats
 * @typedef {DataFrameAnalyticsStats}
 * @extends {Omit<estypes.MlDataframeAnalytics, 'state'>}
 */
export interface DataFrameAnalyticsStats extends Omit<estypes.MlDataframeAnalytics, 'state'> {
  /**
   * Optional failure reason
   * @type {?string}
   */
  failure_reason?: string;
  /**
   * Task state
   * @type {DataFrameTaskStateType}
   */
  state: DataFrameTaskStateType;
}

/**
 * Alias for estypes.MlExplainDataFrameAnalyticsResponse
 *
 * @export
 * @typedef {DfAnalyticsExplainResponse}
 */
export type DfAnalyticsExplainResponse = estypes.MlExplainDataFrameAnalyticsResponse;

/**
 * Interface for predicted class
 *
 * @export
 * @interface PredictedClass
 * @typedef {PredictedClass}
 */
export interface PredictedClass {
  /**
   * Predicted class
   * @type {string}
   */
  predicted_class: string;
  /**
   * Count
   * @type {number}
   */
  count: number;
}

/**
 * Interface for confusion matrix
 *
 * @export
 * @interface ConfusionMatrix
 * @typedef {ConfusionMatrix}
 */
export interface ConfusionMatrix {
  /**
   * Actual class
   * @type {string}
   */
  actual_class: string;
  /**
   * Actual class doc count
   * @type {number}
   */
  actual_class_doc_count: number;
  /**
   * Array of predicted classes
   * @type {PredictedClass[]}
   */
  predicted_classes: PredictedClass[];
  /**
   * Doc count of other predicted classes
   * @type {number}
   */
  other_predicted_class_doc_count: number;
}

/**
 * Data item for ROC curve
 *
 * @export
 * @interface RocCurveItem
 * @typedef {RocCurveItem}
 */
export interface RocCurveItem {
  /**
   * FPR
   * @type {number}
   */
  fpr: number;
  /**
   * Threshold
   * @type {number}
   */
  threshold: number;
  /**
   * TPR
   * @type {number}
   */
  tpr: number;
}

/**
 * Eval Class
 * @interface EvalClass
 * @typedef {EvalClass}
 */
interface EvalClass {
  /**
   * Class name
   * @type {string}
   */
  class_name: string;
  /**
   * Value
   * @type {number}
   */
  value: number;
}

/**
 * Interface for classification evaluate response
 *
 * @export
 * @interface ClassificationEvaluateResponse
 * @typedef {ClassificationEvaluateResponse}
 */
export interface ClassificationEvaluateResponse {
  /**
   * Classificatio evaluation
   * @type {{
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
    }}
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
 *
 * @export
 * @interface EvaluateMetrics
 * @typedef {EvaluateMetrics}
 */
export interface EvaluateMetrics {
  /**
   * Classification evalute metrics
   * @type {{
      accuracy?: object;
      recall?: object;
      multiclass_confusion_matrix?: object;
      auc_roc?: { include_curve: boolean; class_name: string };
    }}
   */
  classification: {
    accuracy?: object;
    recall?: object;
    multiclass_confusion_matrix?: object;
    auc_roc?: { include_curve: boolean; class_name: string };
  };
  /**
   * Regression evaluate metrics
   * @type {{
      r_squared: object;
      mse: object;
      msle: object;
      huber: object;
    }}
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
 *
 * @export
 * @interface FieldSelectionItem
 * @typedef {FieldSelectionItem}
 * @extends {Omit<estypes.MlDataframeAnalyticsFieldSelection, 'mapping_types'>}
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
 *
 * @export
 * @interface AnalyticsMapNodeElement
 * @typedef {AnalyticsMapNodeElement}
 */
export interface AnalyticsMapNodeElement {
  /**
   * Inner data of the node element
   * @type {{
      id: string;
      label: string;
      type: string;
      analysisType?: string;
    }}
   */
  data: {
    id: string;
    label: string;
    type: string;
    analysisType?: string;
  };
}

/**
 * Interface for an edge element for the map view
 *
 * @export
 * @interface AnalyticsMapEdgeElement
 * @typedef {AnalyticsMapEdgeElement}
 */
export interface AnalyticsMapEdgeElement {
  /**
   * Inner data of the edge element
   * @type {{
      id: string;
      source: string;
      target: string;
    }}
   */
  data: {
    id: string;
    source: string;
    target: string;
  };
}

/**
 * Union type of map node and edge elements
 *
 * @export
 * @typedef {MapElements}
 */
export type MapElements = AnalyticsMapNodeElement | AnalyticsMapEdgeElement;

/**
 * Interface for DFA map return type
 *
 * @export
 * @interface AnalyticsMapReturnType
 * @typedef {AnalyticsMapReturnType}
 */
export interface AnalyticsMapReturnType {
  /**
   * Map elements
   * @type {MapElements[]}
   */
  elements: MapElements[];
  /**
   * Transform, job or index details
   * @type {Record<string, any>}
   */
  details: Record<string, any>;
  /**
   * Error
   * @type {(null | any)}
   */
  error: null | any;
}

/**
 * Alias for estypes.MlDataframeAnalysisFeatureProcessor
 *
 * @export
 * @typedef {FeatureProcessor}
 */
export type FeatureProcessor = estypes.MlDataframeAnalysisFeatureProcessor;

/**
 * Interface for a search response's track total hits option
 *
 * @export
 * @interface TrackTotalHitsSearchResponse
 * @typedef {TrackTotalHitsSearchResponse}
 */
export interface TrackTotalHitsSearchResponse {
  /**
   * Inner structure of the response
   * @type {{
      total: {
        value: number;
        relation: string;
      };
      hits: any[];
    }}
   */
  hits: {
    total: {
      value: number;
      relation: string;
    };
    hits: any[];
  };
}
