/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ES_ARCHIVES = {
  LOGSTASH: 'x-pack/platform/test/fixtures/es_archives/logstash_functional',
};

export const DATA_VIEW_ID = {
  LOGSTASH: 'logstash-*',
};

export const LOGSTASH_IN_RANGE_DATES = {
  from: 'Sep 19, 2015 @ 06:31:44.000',
  to: 'Sep 23, 2015 @ 18:31:44.000',
};

const FIXTURES_PATH = 'x-pack/platform/plugins/shared/lens/test/scout/ui/fixtures';

export const KBN_ARCHIVES = {
  ESQL_CONVERSION_DASHBOARD: `${FIXTURES_PATH}/esql_conversion_dashboard.json`,
  TSVB_METRIC: `${FIXTURES_PATH}/tsvb_metric.json`,
  TSVB_GAUGE: `${FIXTURES_PATH}/tsvb_gauge.json`,
  TSVB_TIMESERIES: `${FIXTURES_PATH}/tsvb_timeseries.json`,
  TSVB_TOP_N: `${FIXTURES_PATH}/tsvb_top_n.json`,
  TSVB_TABLE: `${FIXTURES_PATH}/tsvb_table.json`,
  TSVB_DASHBOARD: `${FIXTURES_PATH}/tsvb_dashboard.json`,
};
export const TSVB_DASHBOARDS = {
  METRIC: 'Convert to Lens - TSVB - Metric',
  GAUGE: 'Convert to Lens - TSVB - Gauge',
  TIMESERIES: 'Convert to Lens - TSVB - Timeseries',
  TOP_N: 'Convert to Lens - TSVB - Top N',
  TABLE: 'Convert to Lens - TSVB - Table',
  DASHBOARD_1: 'Convert to Lens - Dashboard - TSVB - 1',
  DASHBOARD_2: 'Convert to Lens - Dashboard - TSVB - 2',
};

export const ESQL_CONVERSION_DASHBOARD_TEST_ID =
  'dashboardListingTitleLink-ES|QL-Conversion-Dashboard';
export const INLINE_METRIC_PANEL_ID = 'fb4626b8-d8ce-42d3-913a-081af94cfb51';
export const SAVED_METRIC_PANEL_ID = '3aef33a1-bcbc-4cd7-b2d9-fa678b2fefa5';
