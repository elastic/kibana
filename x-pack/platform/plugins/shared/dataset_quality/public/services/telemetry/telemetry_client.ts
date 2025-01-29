/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import {
  ITelemetryClient,
  DatasetDetailsEbtProps,
  DatasetQualityTelemetryEventTypes,
  DatasetDetailsNavigatedEbtProps,
  DatasetDetailsTrackingState,
  DatasetNavigatedEbtProps,
} from './types';

export class TelemetryClient implements ITelemetryClient {
  private datasetDetailsTrackingId = '';
  private startTime = 0;
  private datasetDetailsState: DatasetDetailsTrackingState = 'initial';

  constructor(private analytics: AnalyticsServiceSetup) {}

  public trackDatasetNavigated = (eventProps: DatasetNavigatedEbtProps) => {
    this.analytics.reportEvent(DatasetQualityTelemetryEventTypes.NAVIGATED, eventProps);
  };

  public startDatasetDetailsTracking() {
    this.datasetDetailsTrackingId = uuidv4();
    this.startTime = Date.now();
    this.datasetDetailsState = 'started';
  }

  public getDatasetDetailsTrackingState() {
    return this.datasetDetailsState;
  }

  public trackDatasetDetailsOpened = (eventProps: DatasetDetailsEbtProps) => {
    const datasetDetailsLoadDuration = Date.now() - this.startTime;

    this.datasetDetailsState = 'opened';
    this.analytics.reportEvent(DatasetQualityTelemetryEventTypes.DETAILS_OPENED, {
      ...eventProps,
      tracking_id: this.datasetDetailsTrackingId,
      duration: datasetDetailsLoadDuration,
    });
  };

  public trackDatasetDetailsNavigated = (eventProps: DatasetDetailsNavigatedEbtProps) => {
    this.datasetDetailsState = 'navigated';
    this.analytics.reportEvent(DatasetQualityTelemetryEventTypes.DETAILS_NAVIGATED, {
      ...eventProps,
      tracking_id: this.datasetDetailsTrackingId,
    });
  };

  public trackDatasetDetailsBreakdownFieldChanged = (eventProps: DatasetDetailsEbtProps) => {
    this.analytics.reportEvent(DatasetQualityTelemetryEventTypes.BREAKDOWN_FIELD_CHANGED, {
      ...eventProps,
      tracking_id: this.datasetDetailsTrackingId,
    });
  };
}
