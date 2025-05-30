/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type {
  ITelemetryClient,
  TrainedModelsDeploymentEbtProps,
  TrainedModelsModelDownloadEbtProps,
  TrainedModelsModelTestedEbtProps,
} from './types';
import { TrainedModelsTelemetryEventTypes } from './types';

export class TelemetryClient implements ITelemetryClient {
  constructor(private analytics: AnalyticsServiceSetup) {}

  public trackTrainedModelsDeploymentCreated = (eventProps: TrainedModelsDeploymentEbtProps) => {
    this.analytics.reportEvent(TrainedModelsTelemetryEventTypes.DEPLOYMENT_CREATED, eventProps);
  };

  public trackTrainedModelsModelDownload = (eventProps: TrainedModelsModelDownloadEbtProps) => {
    this.analytics.reportEvent(TrainedModelsTelemetryEventTypes.MODEL_DOWNLOAD, eventProps);
  };

  public trackTrainedModelsDeploymentUpdated = (eventProps: TrainedModelsDeploymentEbtProps) => {
    this.analytics.reportEvent(TrainedModelsTelemetryEventTypes.DEPLOYMENT_UPDATED, eventProps);
  };
  public trackTrainedModelsModelTested = (eventProps: TrainedModelsModelTestedEbtProps) => {
    this.analytics.reportEvent(TrainedModelsTelemetryEventTypes.MODEL_TESTED, eventProps);
  };
}
