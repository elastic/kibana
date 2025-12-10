/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const STANDARD_INDEX_MODE = 'standard';
export const LOGSDB_INDEX_MODE = 'logsdb';
export const TIME_SERIES_MODE = 'time_series';
export const LOOKUP_INDEX_MODE = 'lookup';

export const IndexMode = {
  standard: STANDARD_INDEX_MODE,
  logsdb: LOGSDB_INDEX_MODE,
  time_series: TIME_SERIES_MODE,
  lookup: LOOKUP_INDEX_MODE,
} as const;

export const indexModeLabels = {
  [STANDARD_INDEX_MODE]: i18n.translate('xpack.idxMgmt.indexModeLabels.standardIndexModeLabel', {
    defaultMessage: 'Standard',
  }),
  [LOGSDB_INDEX_MODE]: i18n.translate('xpack.idxMgmt.indexModeLabels.logsdbIndexModeLabel', {
    defaultMessage: 'LogsDB',
  }),
  [TIME_SERIES_MODE]: i18n.translate('xpack.idxMgmt.indexModeLabels.timeSeriesIndexModeLabel', {
    defaultMessage: 'Time series',
  }),
  [LOOKUP_INDEX_MODE]: i18n.translate('xpack.idxMgmt.indexModeLabels.lookupIndexModeLabel', {
    defaultMessage: 'Lookup',
  }),
};

export const indexModeDescriptions = {
  [STANDARD_INDEX_MODE]: i18n.translate(
    'xpack.idxMgmt.indexModeDescriptions.standardIndexModeDescription',
    {
      defaultMessage:
        'Standard indexing with default settings, for data other than logs or metrics.',
    }
  ),
  [LOGSDB_INDEX_MODE]: i18n.translate(
    'xpack.idxMgmt.indexModeDescriptions.logsdbIndexModeDescription',
    {
      defaultMessage:
        'Optimized for storing logs data, with reduced storage and default settings that help reduce the chance of logs being rejected by Elasticsearch.',
    }
  ),
  [TIME_SERIES_MODE]: i18n.translate(
    'xpack.idxMgmt.indexModeDescriptions.timeSeriesIndexModeDescription',
    {
      defaultMessage: 'Optimized for metrics data with reduced storage.',
    }
  ),
  [LOOKUP_INDEX_MODE]: i18n.translate(
    'xpack.idxMgmt.indexModeDescriptions.lookupIndexModeDescription',
    {
      defaultMessage: 'Optimized for ES|QL join operations.',
    }
  ),
};
