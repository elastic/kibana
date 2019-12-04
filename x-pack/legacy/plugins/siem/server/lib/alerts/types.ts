/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertsData, AlertsOverTimeData } from '../../graphql/types';
import { FrameworkRequest, RequestBasicOptions } from '../framework';
import { TimelineRequestOptions } from '../events/types';

export interface AlertsGroupData {
  key: string;
  doc_count: number;
  alerts: {
    buckets: Array<{ key: string; doc_count: number }>;
  };
}
export interface AlertsAdapter {
  getAlertsData(req: FrameworkRequest, options: TimelineRequestOptions): Promise<AlertsData>;
  getAlertsHistogramData(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<AlertsOverTimeData>;
}
