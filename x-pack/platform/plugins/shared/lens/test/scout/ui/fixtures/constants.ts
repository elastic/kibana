/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const LENS_SCOUT_FIXTURES_DIR = 'x-pack/platform/plugins/shared/lens/test/scout/ui/fixtures';
const OPEN_IN_LENS_KBN_ARCHIVES_DIR = `${LENS_SCOUT_FIXTURES_DIR}/kbn_archives/open_in_lens`;

export const ES_ARCHIVE_PATHS = {
  LOGSTASH: 'x-pack/platform/test/fixtures/es_archives/logstash_functional',
  LONG_WINDOW_LOGSTASH: 'src/platform/test/functional/fixtures/es_archiver/long_window_logstash',
  KIBANA_SAMPLE_DATA_FLIGHTS:
    'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_flights',
} as const;

export const DATA_VIEW_ID = {
  LOGSTASH: 'logstash-*',
  LONG_WINDOW_LOGSTASH: 'long-window-logstash-*',
  FLIGHTS: 'kibana_sample_data_flights',
} as const;

export const LOGSTASH_IN_RANGE_DATES = {
  from: 'Sep 19, 2015 @ 06:31:44.000',
  to: 'Sep 23, 2015 @ 18:31:44.000',
} as const;

export const MULTIPLE_DATA_VIEWS_TIME_RANGE = {
  from: 'Oct 23, 2018 @ 07:00:00.000',
  to: 'Oct 23, 2018 @ 08:00:00.000',
} as const;

// FTR used `*stash*`. Scout parallel `global.setup` also loads long-window-logstash
// (`long-window-logstash-0`), which matches `*stash*` and doubles Discover hits /
// shifts metric & chart values. Use `logstash-2015*` so the ad hoc DV only matches
// the functional logstash archive (same data as FTR).
export const AD_HOC_DATA_VIEW_NAME = 'logstash-2015*' as const;

const PLATFORM_KBN_ARCHIVER_DIR = 'src/platform/test/functional/fixtures/kbn_archiver';

export const KBN_ARCHIVE_PATHS = {
  ESQL_CONVERSION_DASHBOARD: `${LENS_SCOUT_FIXTURES_DIR}/esql_conversion_dashboard.json`,
  LONG_WINDOW_LOGSTASH_INDEX_PATTERN: `${PLATFORM_KBN_ARCHIVER_DIR}/long_window_logstash_index_pattern.json`,
  KIBANA_SAMPLE_DATA_FLIGHTS_INDEX_PATTERN: `${PLATFORM_KBN_ARCHIVER_DIR}/kibana_sample_data_flights_index_pattern.json`,
  OPEN_IN_LENS: {
    TSVB: {
      METRIC: `${OPEN_IN_LENS_KBN_ARCHIVES_DIR}/tsvb/metric.json`,
      GAUGE: `${OPEN_IN_LENS_KBN_ARCHIVES_DIR}/tsvb/gauge.json`,
      TIMESERIES: `${OPEN_IN_LENS_KBN_ARCHIVES_DIR}/tsvb/timeseries.json`,
      TOP_N: `${OPEN_IN_LENS_KBN_ARCHIVES_DIR}/tsvb/top_n.json`,
      TABLE: `${OPEN_IN_LENS_KBN_ARCHIVES_DIR}/tsvb/table.json`,
      DASHBOARD: `${OPEN_IN_LENS_KBN_ARCHIVES_DIR}/tsvb/dashboard.json`,
    },
    AGG_BASED: {
      METRIC: `${OPEN_IN_LENS_KBN_ARCHIVES_DIR}/agg_based/metric.json`,
      PIE: `${OPEN_IN_LENS_KBN_ARCHIVES_DIR}/agg_based/pie.json`,
      XY: `${OPEN_IN_LENS_KBN_ARCHIVES_DIR}/agg_based/xy.json`,
      GAUGE: `${OPEN_IN_LENS_KBN_ARCHIVES_DIR}/agg_based/gauge.json`,
      GOAL: `${OPEN_IN_LENS_KBN_ARCHIVES_DIR}/agg_based/goal.json`,
      TABLE: `${OPEN_IN_LENS_KBN_ARCHIVES_DIR}/agg_based/table.json`,
      HEATMAP: `${OPEN_IN_LENS_KBN_ARCHIVES_DIR}/agg_based/heatmap.json`,
      NAVIGATION: `${OPEN_IN_LENS_KBN_ARCHIVES_DIR}/agg_based/navigation.json`,
    },
  },
} as const;

export const VISUALIZATION_TITLES = {
  OPEN_IN_LENS: {
    AGG_BASED: {
      NAVIGATION_LINE: 'Visualize navigation - Line',
    },
  },
} as const;

export const DASHBOARD_TITLES = {
  OPEN_IN_LENS: {
    TSVB: {
      METRIC: 'Convert to Lens - TSVB - Metric',
      GAUGE: 'Convert to Lens - TSVB - Gauge',
      TIMESERIES: 'Convert to Lens - TSVB - Timeseries',
      TOP_N: 'Convert to Lens - TSVB - Top N',
      TABLE: 'Convert to Lens - TSVB - Table',
      DASHBOARD_1: 'Convert to Lens - Dashboard - TSVB - 1',
      DASHBOARD_2: 'Convert to Lens - Dashboard - TSVB - 2',
    },
    AGG_BASED: {
      METRIC: 'Convert to Lens - Metric',
      PIE: 'Convert to Lens - Pie',
      XY: 'Convert to Lens - XY',
      GAUGE: 'Convert to Lens - Gauge',
      GOAL: 'Convert to Lens - Goal',
      TABLE: 'Convert to Lens - Table',
      HEATMAP: 'Convert to Lens - Heatmap',
    },
  },
} as const;

export const DATA_TEST_SUBJECTS = {
  OPEN_IN_LENS_ACTION: 'embeddablePanelAction-ACTION_EDIT_IN_LENS',
} as const;

export const ESQL_CONVERSION_DASHBOARD_ID = '3cda479c-8797-4492-99f4-2259e1377f85';

export const ESQL_CONVERSION_PANEL_IDS = {
  INLINE_METRIC: 'fb4626b8-d8ce-42d3-913a-081af94cfb51',
  SAVED_METRIC: '3aef33a1-bcbc-4cd7-b2d9-fa678b2fefa5',
} as const;
