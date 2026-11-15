/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { METRIC_TYPE } from '@kbn/analytics';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { DataSourceType } from '../common';
import type { DatasetFormat } from '../common/dataset_types';

export const UI_COUNTER_APP_NAME = 'data_federation';

export const UI_COUNTER_EVENTS = {
  datasourceCreateFormOpened: 'datasource_create_form_opened',
  datasourceCreate: 'datasource_create',
  datasourceUpdate: 'datasource_update',
  datasourceDelete: 'datasource_delete',
  datasetCreate: 'dataset_create',
  datasetUpdate: 'dataset_update',
  datasetDelete: 'dataset_delete',
} as const;

type DatasourceCreateByTypeEvent = `${typeof UI_COUNTER_EVENTS.datasourceCreate}_${DataSourceType}`;
type DatasetCreateByFormatEvent = `${typeof UI_COUNTER_EVENTS.datasetCreate}_${DatasetFormat}`;

export type UiCounterEvent =
  | (typeof UI_COUNTER_EVENTS)[keyof typeof UI_COUNTER_EVENTS]
  | DatasourceCreateByTypeEvent
  | DatasetCreateByFormatEvent;

export type ReportUiCounter = (
  events: UiCounterEvent | readonly UiCounterEvent[],
  count?: number
) => void;

/** Creates a reporter that records data federation UI counters as `count` metrics. */
export const createReportUiCounter =
  (usageCollection?: UsageCollectionStart): ReportUiCounter =>
  (events, count) => {
    usageCollection?.reportUiCounter(
      UI_COUNTER_APP_NAME,
      METRIC_TYPE.COUNT,
      typeof events === 'string' ? events : [...events],
      count
    );
  };

/** Events for a created data source: the overall total plus a per-type breakdown. */
export const getDatasourceCreateEvents = (type: DataSourceType): readonly UiCounterEvent[] => [
  UI_COUNTER_EVENTS.datasourceCreate,
  `${UI_COUNTER_EVENTS.datasourceCreate}_${type}`,
];

/** Events for a created dataset: the overall total plus a per-format breakdown when known. */
export const getDatasetCreateEvents = (format?: DatasetFormat): readonly UiCounterEvent[] =>
  format
    ? [UI_COUNTER_EVENTS.datasetCreate, `${UI_COUNTER_EVENTS.datasetCreate}_${format}`]
    : [UI_COUNTER_EVENTS.datasetCreate];
