/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const spec: Record<string, unknown> = {
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  autosize: { type: 'fit', contains: 'padding' },
  data: {
    url: {
      '%type%': 'esql',
      '%timefield%': '@timestamp',
      query:
        'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | EVAL hour = DATE_EXTRACT("HOUR_OF_DAY", @timestamp), day = DATE_FORMAT("EEE", @timestamp) | STATS count = COUNT(*) BY hour, day | SORT hour ASC',
    },
  },
  mark: 'rect',
  encoding: {
    x: { field: 'hour', type: 'ordinal', title: 'Hour of Day', axis: { labelAngle: 0 } },
    y: { field: 'day', type: 'ordinal', title: 'Day' },
    color: {
      field: 'count',
      type: 'quantitative',
      title: 'Events',
      scale: { scheme: 'blues' },
    },
    tooltip: [
      { field: 'day', type: 'ordinal', title: 'Day' },
      { field: 'hour', type: 'ordinal', title: 'Hour' },
      { field: 'count', type: 'quantitative', title: 'Events' },
    ],
  },
};
