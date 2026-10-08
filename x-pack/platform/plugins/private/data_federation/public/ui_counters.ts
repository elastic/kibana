/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { METRIC_TYPE } from '@kbn/analytics';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';

export const UI_COUNTER_APP_NAME = 'data_federation';

export const UI_COUNTER_EVENTS = {
  datasourceCreate: 'datasource_create',
  datasourceUpdate: 'datasource_update',
  datasourceDelete: 'datasource_delete',
  datasetCreate: 'dataset_create',
  datasetUpdate: 'dataset_update',
  datasetDelete: 'dataset_delete',
} as const;

export type UiCounterEvent = (typeof UI_COUNTER_EVENTS)[keyof typeof UI_COUNTER_EVENTS];

export type ReportUiCounter = (event: UiCounterEvent, count?: number) => void;

/** Creates a reporter that records data federation UI counters as `count` metrics. */
export const createReportUiCounter =
  (usageCollection?: UsageCollectionStart): ReportUiCounter =>
  (event, count) => {
    usageCollection?.reportUiCounter(UI_COUNTER_APP_NAME, METRIC_TYPE.COUNT, event, count);
  };
