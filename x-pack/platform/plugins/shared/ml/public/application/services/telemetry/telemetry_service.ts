/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { trainedModelsEbtEvents } from './events';
import { TelemetryClient } from './telemetry_client';
import type { ITelemetryClient } from './types';

interface TelemetryServiceSetupParams {
  analytics: AnalyticsServiceSetup;
}

export class TelemetryService {
  private analytics?: AnalyticsServiceSetup;

  constructor() {}

  public setup({ analytics }: TelemetryServiceSetupParams) {
    this.analytics = analytics;

    analytics.registerEventType(trainedModelsEbtEvents.trainedModelsDeploymentCreatedEventType);
    analytics.registerEventType(trainedModelsEbtEvents.trainedModelsModelDownloadEventType);
    analytics.registerEventType(trainedModelsEbtEvents.trainedModelsDeploymentUpdatedEventType);
    analytics.registerEventType(trainedModelsEbtEvents.trainedModelsModelTestedEventType);
  }

  public start(): ITelemetryClient {
    if (!this.analytics) {
      throw new Error(
        'The TelemetryService.setup() method has not been invoked, be sure to call it during the plugin setup.'
      );
    }

    return new TelemetryClient(this.analytics);
  }
}
