/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export default function (): any {
  const xs = new Map();

  xs.set('4', [
    './_pie_chart',
    './_point_series_options',
    './_markdown_vis',
    './_shared_item',
    './_lab_mode',
    './_linked_saved_searches',
    './_visualize_listing',
    './_add_to_dashboard.ts',
  ]);
  xs.set('7', [
    // Test replaced vislib chart types
    './_line_chart_split_chart',
    './_point_series_options',
    './_vertical_bar_chart',
    './_vertical_bar_chart_nontimeindex',
    './_line_chart_split_series',
  ]);
  xs.set('9', [
    './_embedding_chart',
    './_area_chart',
    './_data_table',
    './_data_table_nontimeindex',
    './_data_table_notimeindex_filters',
  ]);
  xs.set('10', [
    './_inspector',
    './_experimental_vis',
    './_gauge_chart',
    './_heatmap_chart',
    './input_control_vis',
    './_histogram_request_start',
    './_metric_chart',
  ]);
  xs.set('12', [
    './_tag_cloud',
    './_vertical_bar_chart',
    './_vertical_bar_chart_nontimeindex',
    './_tsvb_chart',
    './_tsvb_time_series',
    './_tsvb_markdown',
    './_tsvb_table',
    './_vega_chart',
  ]);

  return xs;
}
