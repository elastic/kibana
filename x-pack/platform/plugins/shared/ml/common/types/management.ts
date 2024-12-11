/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SummaryJobState } from './anomaly_detection_jobs/summary_job';

export interface AnomalyDetectionManagementItems {
  id: string;
  description: string;
  jobState: SummaryJobState;
  datafeedState: string;
  spaces: string[];
}

export interface AnalyticsManagementItems {
  id: string;
  description: string;
  source_index: string[];
  dest_index: string;
  job_type: string;
  state: estypes.MlDataframeState | '';
  spaces: string[];
}

export interface TrainedModelsManagementItems {
  id: string;
  description: string;
  state: estypes.MlDeploymentState | '';
  type: Array<string | undefined>;
  spaces: string[];
}

export type ManagementItems =
  | AnalyticsManagementItems
  | AnomalyDetectionManagementItems
  | TrainedModelsManagementItems;

export type ManagementListResponse =
  | AnalyticsManagementItems[]
  | AnomalyDetectionManagementItems[]
  | TrainedModelsManagementItems[];
