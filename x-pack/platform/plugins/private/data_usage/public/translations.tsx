/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PLUGIN_NAME = i18n.translate('xpack.dataUsage.name', {
  defaultMessage: 'Data Usage',
});

export const FILTER_NAMES = Object.freeze({
  metricTypes: i18n.translate('xpack.dataUsage.metrics.filter.metricTypes', {
    defaultMessage: 'Metric types',
  }),
  dataStreams: i18n.translate('xpack.dataUsage.metrics.filter.dataStreams', {
    defaultMessage: 'Data streams',
  }),
});

export const CHART_TITLES = Object.freeze({
  ingest_rate: i18n.translate('xpack.dataUsage.charts.ingestedMax', {
    defaultMessage: 'Data Ingested',
  }),
  storage_retained: i18n.translate('xpack.dataUsage.charts.retainedMax', {
    defaultMessage: 'Data Retained in Storage',
  }),
});

export const DATA_USAGE_PAGE = Object.freeze({
  title: i18n.translate('xpack.dataUsage.name', {
    defaultMessage: 'Data Usage',
  }),
  subTitle: i18n.translate('xpack.dataUsage.pageSubtitle', {
    defaultMessage: 'Monitor data ingested and retained by data streams.',
  }),
});

export const UX_LABELS = Object.freeze({
  filterSelectAll: i18n.translate('xpack.dataUsage.metrics.filter.selectAll', {
    defaultMessage: 'Select all',
  }),
  filterClearAll: i18n.translate('xpack.dataUsage.metrics.filter.clearAll', {
    defaultMessage: 'Clear all',
  }),
  filterSearchPlaceholder: (filterName: string) =>
    i18n.translate('xpack.dataUsage.metrics.filter.searchPlaceholder', {
      defaultMessage: 'Search {filterName}',
      values: { filterName },
    }),
  filterEmptyMessage: (filterName: string) =>
    i18n.translate('xpack.dataUsage.metrics.filter.emptyMessage', {
      defaultMessage: 'No {filterName} available',
      values: { filterName },
    }),
  dataQualityPopup: {
    open: i18n.translate('xpack.dataUsage.metrics.dataQuality.open.actions', {
      defaultMessage: 'Open data stream actions',
    }),
    copy: i18n.translate('xpack.dataUsage.metrics.dataQuality.copy.dataStream', {
      defaultMessage: 'Copy data stream name',
    }),
    manage: i18n.translate('xpack.dataUsage.metrics.dataQuality.manage.dataStream', {
      defaultMessage: 'Manage data stream',
    }),
    view: i18n.translate('xpack.dataUsage.metrics.dataQuality.view', {
      defaultMessage: 'View data quality',
    }),
  },
});
