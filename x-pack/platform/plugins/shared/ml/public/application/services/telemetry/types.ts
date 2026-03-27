/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';
import type { TrainedModelType } from '@kbn/ml-trained-models-utils';

export interface TrainedModelsDeploymentEbtProps {
  model_id: string;
  optimized: 'optimizedForIngest' | 'optimizedForSearch';
  adaptive_resources: boolean;
  vcpu_usage: 'low' | 'medium' | 'high';
  result: 'success' | 'failure';
  max_number_of_allocations?: number;
  min_number_of_allocations?: number;
  threads_per_allocation: number;
  number_of_allocations?: number;
}

export interface TrainedModelsModelDownloadEbtProps {
  model_id: string;
  result: 'success' | 'failure' | 'cancelled';
}

export interface TrainedModelsModelTestedEbtProps {
  model_id: string;
  model_type?: TrainedModelType;
  task_type?: string;
  result: 'success' | 'failure';
}

export enum TrainedModelsTelemetryEventTypes {
  DEPLOYMENT_CREATED = 'Trained Models Deployment Created',
  MODEL_TESTED = 'Trained Model Tested',
  MODEL_DOWNLOAD = 'Trained Models Model Download',
  DEPLOYMENT_UPDATED = 'Trained Models Deployment Updated',
}

export type TrainedModelsTelemetryEvent =
  | {
      eventType: TrainedModelsTelemetryEventTypes.DEPLOYMENT_CREATED;
      schema: RootSchema<TrainedModelsDeploymentEbtProps>;
    }
  | {
      eventType: TrainedModelsTelemetryEventTypes.MODEL_TESTED;
      schema: RootSchema<TrainedModelsModelTestedEbtProps>;
    }
  | {
      eventType: TrainedModelsTelemetryEventTypes.MODEL_DOWNLOAD;
      schema: RootSchema<TrainedModelsModelDownloadEbtProps>;
    }
  | {
      eventType: TrainedModelsTelemetryEventTypes.DEPLOYMENT_UPDATED;
      schema: RootSchema<TrainedModelsDeploymentEbtProps>;
    };

export interface CustomRuleEditorOpenedEbtProps {
  source:
    | 'explorer_anomalies_table'
    | 'single_metric_viewer_anomalies_table'
    | 'single_metric_viewer_timeseries_chart'
    | 'explorer_single_metric_chart'
    | 'explorer_distribution_chart'
    | 'embeddable_single_metric_anomaly_chart'
    | 'embeddable_distribution_anomaly_chart'
    | 'embeddable_timeseries_chart';
}

export const RULE_EDITOR_OPENED = 'ml.custom_rule_editor_opened';

export interface CustomRuleEditorOpenedEbtEvent {
  eventType: typeof RULE_EDITOR_OPENED;
  schema: RootSchema<CustomRuleEditorOpenedEbtProps>;
}

export interface ITelemetryClient {
  trackTrainedModelsDeploymentCreated: (eventProps: TrainedModelsDeploymentEbtProps) => void;
  trackTrainedModelsModelDownload: (eventProps: TrainedModelsModelDownloadEbtProps) => void;
  trackTrainedModelsDeploymentUpdated: (eventProps: TrainedModelsDeploymentEbtProps) => void;
  trackTrainedModelsModelTested: (eventProps: TrainedModelsModelTestedEbtProps) => void;
  trackCustomRuleEditorOpened: (eventProps: CustomRuleEditorOpenedEbtProps) => void;
}
