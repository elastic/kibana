/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MetricsExplorerAggregation } from '../../../routes/metrics_explorer/types';

export const METRIC_THRESHOLD_ALERT_TYPE_ID = 'infra.metric-alert.threshold';

export enum Comparator {
  GT = '>',
  LT = '<',
  GT_OR_EQ = '>=',
  LT_OR_EQ = '<=',
}

export enum AlertStates {
  OK,
  ALERT,
  WARN,
  NO_DATA,
  SNOOZED,
}

export interface MetricThresholdAlertTypeParams {
  aggregation: MetricsExplorerAggregation;
  metric: string;
  searchField: {
    name: string;
    value: string;
  };
  interval: string;
  indexPattern: string;
  threshold: number;
  comparator: Comparator;
}
