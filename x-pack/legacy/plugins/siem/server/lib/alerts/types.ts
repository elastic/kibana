/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertsOverTimeData } from '../../graphql/types';
import { FrameworkRequest, RequestBasicOptions } from '../framework';

export interface AlertsBucket {
  key: number;
  doc_count: number;
}

export interface AlertsGroupData {
  key: string;
  doc_count: number;
  alerts: {
    buckets: AlertsBucket[];
  };
}
export interface AlertsAdapter {
  getAlertsHistogramData(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<AlertsOverTimeData>;
}
