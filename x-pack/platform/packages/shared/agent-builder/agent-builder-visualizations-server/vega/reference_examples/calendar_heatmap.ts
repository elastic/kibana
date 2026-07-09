/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const spec: Record<string, unknown> = {
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  title: 'Activity by Week and Weekday',
  autosize: { type: 'fit', contains: 'padding' },
  data: {
    url: {
      '%type%': 'esql',
      '%timefield%': '@timestamp',
      query:
        'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | EVAL week = DATE_FORMAT("YYYY-ww", @timestamp), weekday = DATE_FORMAT("EEE", @timestamp) | STATS count = COUNT(*) BY week, weekday | SORT week ASC',
    },
  },
  mark: 'rect',
  encoding: {
    x: { field: 'week', type: 'ordinal', title: 'Week', axis: { labelAngle: 0, labelLimit: 150 } },
    y: {
      field: 'weekday',
      type: 'ordinal',
      title: null,
      sort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    },
    color: {
      field: 'count',
      type: 'quantitative',
      title: 'Events',
      scale: { scheme: 'greens' },
    },
    tooltip: [
      { field: 'week', type: 'ordinal', title: 'Week' },
      { field: 'weekday', type: 'ordinal', title: 'Weekday' },
      { field: 'count', type: 'quantitative', title: 'Events' },
    ],
  },
};
