/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

export interface TrainedModelsDeploymentEbtProps {
  model_id: string;
  max_number_of_allocations?: number;
  min_number_of_allocations?: number;
  threads_per_allocation: number;
  number_of_allocations?: number;
  optimized: 'optimizedForIngest' | 'optimizedForSearch';
  adaptive_resources: boolean;
  vcpu_usage: 'low' | 'medium' | 'high';
}

export enum TrainedModelsTelemetryEventTypes {
  DEPLOYMENT_CREATED = 'Trained Models Deployment Created',
}

export interface TrainedModelsTelemetryEvent {
  eventType: TrainedModelsTelemetryEventTypes.DEPLOYMENT_CREATED;
  schema: RootSchema<TrainedModelsDeploymentEbtProps>;
}

export interface ITelemetryClient {
  trackTrainedModelsDeploymentCreated: (eventProps: TrainedModelsDeploymentEbtProps) => void;
}
