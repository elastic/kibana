/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  InferenceInferenceEndpointInfo,
  MlInferenceConfigCreateContainer,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  ModelDefinitionResponse,
  ModelState,
  TrainedModelType,
} from '@kbn/ml-trained-models-utils';
import {
  BUILT_IN_MODEL_TAG,
  ELASTIC_MODEL_TAG,
  TRAINED_MODEL_TYPE,
} from '@kbn/ml-trained-models-utils';
import type {
  DataFrameAnalyticsConfig,
  FeatureImportanceBaseline,
  TotalFeatureImportance,
} from '@kbn/ml-data-frame-analytics-utils';
import type { XOR } from './common';
import type { MlSavedObjectType } from './saved_objects';

export interface IngestStats {
  count: number;
  time_in_millis: number;
  current: number;
  failed: number;
}

export interface TrainedModelModelSizeStats {
  model_size_bytes: number;
  required_native_memory_bytes: number;
}

export interface TrainedModelStat {
  model_id?: string;
  pipeline_count?: number;
  inference_stats?: {
    failure_count: number;
    inference_count: number;
    cache_miss_count: number;
    missing_all_fields_count: number;
    timestamp: number;
  };
  ingest?: {
    total: IngestStats;
    pipelines: Record<
      string,
      IngestStats & {
        processors: Array<
          Record<
            string,
            {
              // TODO use type from ingest_pipelines plugin
              type: string;
              stats: IngestStats;
            }
          >
        >;
      }
    >;
  };
  deployment_stats?: TrainedModelDeploymentStatsResponse;
  model_size_stats?: TrainedModelModelSizeStats;
}

type TreeNode = object;

export type PutTrainedModelConfig = {
  description?: string;
  metadata?: {
    analytics_config: DataFrameAnalyticsConfig;
    input: unknown;
    total_feature_importance?: TotalFeatureImportance[];
    feature_importance_baseline?: FeatureImportanceBaseline;
    model_aliases?: string[];
  } & Record<string, unknown>;
  tags?: string[];
  model_type?: TrainedModelType;
  inference_config?: Record<string, unknown>;
  input: { field_names: string[] };
} & XOR<
  { compressed_definition: string },
  {
    definition: {
      preprocessors: object[];
      trained_model: {
        tree: {
          classification_labels?: string;
          feature_names: string;
          target_type: string;
          tree_structure: TreeNode[];
        };
        tree_node: TreeNode;
        ensemble?: object;
      };
    };
  }
>; // compressed_definition and definition are mutually exclusive

export type TrainedModelConfigResponse = estypes.MlTrainedModelConfig & {
  metadata?: estypes.MlTrainedModelConfig['metadata'] & {
    analytics_config?: DataFrameAnalyticsConfig;
    input: unknown;
    total_feature_importance?: TotalFeatureImportance[];
    feature_importance_baseline?: FeatureImportanceBaseline;
  } & Record<string, unknown>;
};

export interface PipelineDefinition {
  processors?: Array<Record<string, any>>;
  description?: string;
}

export interface ModelPipelines {
  model_id: string;
  pipelines: Record<string, PipelineDefinition>;
}

/**
 * Get inference response from the ES endpoint
 */
export interface InferenceConfigResponse {
  trained_model_configs: TrainedModelConfigResponse[];
}

type NodesDeploymentStats = Array<{
  node: Record<
    string,
    {
      transport_address: string;
      roles: string[];
      name: string;
      attributes: {
        'ml.machine_memory': string;
        'xpack.installed': string;
        'ml.max_open_jobs': string;
        'ml.max_jvm_size': string;
      };
      ephemeral_id: string;
    }
  >;
  inference_count: number;
  routing_state: { routing_state: string };
  average_inference_time_ms: number;
  last_access: number;
  number_of_pending_requests: number;
  start_time: number;
  throughput_last_minute: number;
  threads_per_allocation: number;
  number_of_allocations: number;
}>;

export type TrainedModelDeploymentStatsResponse = estypes.MlTrainedModelDeploymentStats & {
  nodes: NodesDeploymentStats;
  // TODO update types in elasticsearch-specification
  adaptive_allocations?: {
    enabled: boolean;
    min_number_of_allocations?: number;
    max_number_of_allocations?: number;
  };
};

export interface StartTrainedModelDeploymentResponse {
  // TODO update types in elasticsearch-specification
  assignment: estypes.MlStartTrainedModelDeploymentResponse['assignment'] & {
    adaptive_allocations?: {
      enabled: boolean;
      min_number_of_allocations?: number;
      max_number_of_allocations?: number;
    };
  };
}

export interface AllocatedModel {
  key: string;
  deployment_id: string;
  allocation_status: {
    target_allocation_count: number;
    state: string;
    allocation_count: number;
  };
  number_of_allocations: number;
  threads_per_allocation: number;
  /**
   * Not required for rendering in the Model stats
   */
  model_id?: string;
  state: string;
  reason?: string;
  model_size_bytes: number;
  required_native_memory_bytes: number;
  node: {
    /**
     * Not required for rendering in the Nodes overview
     */
    name?: string;
    average_inference_time_ms: number;
    inference_count: number;
    routing_state: {
      routing_state: string;
      reason?: string;
    };
    last_access?: number;
    number_of_pending_requests: number;
    start_time: number;
    throughput_last_minute: number;
    number_of_allocations?: number;
    threads_per_allocation?: number;
    error_count?: number;
  };
  adaptive_allocations?: {
    enabled: boolean;
    min_number_of_allocations?: number;
    max_number_of_allocations?: number;
  };
}

export interface NodeDeploymentStatsResponse {
  id: string;
  name: string;
  attributes: Record<string, string>;
  roles: string[];
  allocated_models: AllocatedModel[];
  memory_overview: {
    machine_memory: {
      /** Total machine memory in bytes */
      total: number;
      jvm: number;
    };
    /** Max amount of memory available for ML */
    ml_max_in_bytes: number;
    /** Open anomaly detection jobs + hardcoded overhead */
    anomaly_detection: {
      /** Total size in bytes */
      total: number;
    };
    /** DFA jobs currently in training + hardcoded overhead */
    dfa_training: {
      total: number;
    };
    /** Allocated trained models */
    trained_models: {
      total: number;
      by_model: Array<{
        model_id: string;
        model_size: number;
      }>;
    };
  };
}

export interface NodesOverviewResponse {
  _nodes: { total: number; failed: number; successful: number };
  nodes: NodeDeploymentStatsResponse[];
}

export interface MemoryUsageInfo {
  id: string;
  type: MlSavedObjectType;
  size: number;
  nodeNames: string[];
}

export interface MemoryStatsResponse {
  _nodes: { total: number; failed: number; successful: number };
  cluster_name: string;
  nodes: Record<
    string,
    {
      jvm: {
        heap_max_in_bytes: number;
        java_inference_in_bytes: number;
        java_inference_max_in_bytes: number;
      };
      mem: {
        adjusted_total_in_bytes: number;
        total_in_bytes: number;
        ml: {
          data_frame_analytics_in_bytes: number;
          native_code_overhead_in_bytes: number;
          max_in_bytes: number;
          anomaly_detectors_in_bytes: number;
          native_inference_in_bytes: number;
        };
      };
      transport_address: string;
      roles: string[];
      name: string;
      attributes: Record<`${'ml.'}${string}`, string>;
      ephemeral_id: string;
    }
  >;
}

// @ts-expect-error TrainedModelDeploymentStatsResponse missing properties from MlTrainedModelDeploymentStats
export interface TrainedModelStatsResponse extends estypes.MlTrainedModelStats {
  deployment_stats?: Omit<TrainedModelDeploymentStatsResponse, 'model_id'>;
  model_size_stats?: TrainedModelModelSizeStats;
}

export interface ModelDownloadState {
  total_parts: number;
  downloaded_parts: number;
}

export type Stats = Omit<TrainedModelStat, 'model_id' | 'deployment_stats'>;

/**
 * Additional properties for all items in the Trained models table
 * */
interface BaseModelItem {
  type?: string[];
  tags: string[];
  /**
   * Whether the model has inference services
   */
  hasInferenceServices?: boolean;
  /**
   * Inference services associated with the model
   */
  inference_apis?: InferenceInferenceEndpointInfo[];
  /**
   * Associated pipelines. Extends response from the ES endpoint.
   */
  pipelines?: Record<string, PipelineDefinition>;
  /**
   * Indices with associated pipelines that have inference processors utilizing the model deployments.
   */
  indices?: string[];
  /**
   * Spaces associated with the model
   */
  spaces?: string[];
}

/** Common properties for existing NLP models and NLP model download configs */
interface BaseNLPModelItem extends BaseModelItem {
  disclaimer?: string;
  recommended?: boolean;
  supported?: boolean;
  state: ModelState | undefined;
  downloadState?: ModelDownloadState;
  techPreview?: boolean;
}

/** Model available for download */
export type ModelDownloadItem = BaseNLPModelItem &
  Omit<ModelDefinitionResponse, 'version' | 'config'> & {
    putModelConfig?: object;
    softwareLicense?: string;
  };
/** Trained NLP model, i.e. pytorch model returned by the trained_models API */
export type NLPModelItem = BaseNLPModelItem &
  TrainedModelItem & {
    stats: Stats & { deployment_stats: TrainedModelDeploymentStatsResponse[] };
    /**
     * Description of the current model state
     */
    stateDescription?: string;
    /**
     * Deployment ids extracted from the deployment stats
     */
    deployment_ids: string[];
  };

export function isBaseNLPModelItem(item: unknown): item is BaseNLPModelItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'type' in item &&
    Array.isArray(item.type) &&
    item.type.includes(TRAINED_MODEL_TYPE.PYTORCH)
  );
}

export function isNLPModelItem(item: unknown): item is NLPModelItem {
  return isExistingModel(item) && item.model_type === TRAINED_MODEL_TYPE.PYTORCH;
}

export const isElasticModel = (item: TrainedModelConfigResponse) =>
  item.tags.includes(ELASTIC_MODEL_TAG);

export type ExistingModelBase = TrainedModelConfigResponse & BaseModelItem;

/** Any model returned by the trained_models API, e.g. lang_ident, elser, dfa model */
export type TrainedModelItem = ExistingModelBase & { stats: Stats };

/** Trained DFA model */
export type DFAModelItem = Omit<TrainedModelItem, 'inference_config'> & {
  origin_job_exists?: boolean;
  inference_config?: Pick<MlInferenceConfigCreateContainer, 'classification' | 'regression'>;
  metadata?: estypes.MlTrainedModelConfig['metadata'] & {
    analytics_config: DataFrameAnalyticsConfig;
    input: unknown;
    total_feature_importance?: TotalFeatureImportance[];
    feature_importance_baseline?: FeatureImportanceBaseline;
  } & Record<string, unknown>;
};

export type TrainedModelWithPipelines = TrainedModelItem & {
  pipelines: Record<string, PipelineDefinition>;
};

export function isExistingModel(item: unknown): item is TrainedModelItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'model_type' in item &&
    'create_time' in item &&
    !!item.create_time
  );
}

export function isDFAModelItem(item: unknown): item is DFAModelItem {
  return isExistingModel(item) && item.model_type === TRAINED_MODEL_TYPE.TREE_ENSEMBLE;
}

export function isModelDownloadItem(item: TrainedModelUIItem): item is ModelDownloadItem {
  return 'putModelConfig' in item && !!item.type?.includes(TRAINED_MODEL_TYPE.PYTORCH);
}

export const isBuiltInModel = (item: TrainedModelConfigResponse | TrainedModelUIItem) =>
  item.tags.includes(BUILT_IN_MODEL_TAG);
/**
 * This type represents a union of different model entities:
 * - Any existing trained model returned by the API, e.g., lang_ident_model_1, DFA models, etc.
 * - Hosted model configurations available for download, e.g., ELSER or E5
 * - NLP models already downloaded into Elasticsearch
 * - DFA models
 */
export type TrainedModelUIItem = TrainedModelItem | ModelDownloadItem | NLPModelItem | DFAModelItem;
