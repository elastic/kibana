/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { _IGNORED } from './es_fields';
import { DataStreamType, QualityIndicators } from './types';

export const DATASET_QUALITY_APP_ID = 'dataset_quality';
export const DATASET_QUALITY_ALL_SIGNALS_ID = 'datasetQuality:all-signals-available';
export const DEFAULT_DATASET_TYPE: DataStreamType = 'logs';
export const DEFAULT_LOGS_DATA_VIEW = 'logs-*-*';

export const DEFAULT_DATASET_QUALITY: QualityIndicators = 'good';
export const POOR_QUALITY_MINIMUM_PERCENTAGE = 3;
export const DEGRADED_QUALITY_MINIMUM_PERCENTAGE = 0;

export const DEFAULT_SORT_FIELD = 'title';
export const DEFAULT_SORT_DIRECTION = 'asc';

export const DEFAULT_QUALITY_ISSUE_SORT_FIELD = 'count';
export const DEFAULT_QUALITY_ISSUE_SORT_DIRECTION = 'desc';

export const DEFAULT_FAILED_DOCS_ERROR_SORT_FIELD = 'type';
export const DEFAULT_FAILED_DOCS_ERROR_SORT_DIRECTION = 'desc';

export const NONE = 'none';

export const DEFAULT_TIME_RANGE = { from: 'now-24h', to: 'now' };
export const DEFAULT_DATEPICKER_REFRESH = { value: 60000, pause: false };

export const DEFAULT_QUALITY_DOC_STATS = {
  count: 0,
  percentage: 0,
};

export const NUMBER_FORMAT = '0,0.[000]';
export const BYTE_NUMBER_FORMAT = '0.0 b';

export const MAX_HOSTS_METRIC_VALUE = 50;

export const MAX_DEGRADED_FIELDS = 1000;

export const MASKED_FIELD_PLACEHOLDER = '<custom field>';
export const UNKOWN_FIELD_PLACEHOLDER = '<unkwon>';

export const KNOWN_TYPES: DataStreamType[] = ['logs', 'metrics', 'traces', 'synthetics'];

export const DEGRADED_DOCS_QUERY = `${_IGNORED}: *`;

export const FAILURE_STORE_SELECTOR = '::failures';
export const DATA_SELECTOR = '::data';

export const FAILURE_STORE_PRIVILEGE = 'read_failure_store';
