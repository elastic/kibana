/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationDatasetExample } from '../../../src/evaluate_dataset';
import { HOST_METRICS_INDEX } from '../../../src/fixtures/host_load_metrics';
import { TIME_BUCKET_COLUMN, timeSeriesQuery, withDataSource, xyExample } from './factories';

const LOAD_AVERAGES = [
  { alias: '1-Minute Load', expression: 'AVG(`system.load.1`)' },
  { alias: '5-Minute Load', expression: 'AVG(`system.load.5`)' },
  { alias: '15-Minute Load', expression: 'AVG(`system.load.15`)' },
];

/** Host metrics from the synthtrace Beats load fixture: three load averages as separate lines. */
export const HOST_METRICS_EXAMPLES: VisualizationDatasetExample[] = withDataSource('host_metrics', [
  xyExample({
    question:
      'Show CPU load average metrics over time as a line chart. Include system.load.1 (1-minute), system.load.5 (5-minute), and system.load.15 (15-minute) as separate lines, bucketed by auto time interval.',
    seriesType: 'line',
    query: timeSeriesQuery({ index: HOST_METRICS_INDEX, metrics: LOAD_AVERAGES }),
    x: TIME_BUCKET_COLUMN,
    y: LOAD_AVERAGES.map(({ alias }) => alias),
  }),
]);
