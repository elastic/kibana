/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Hand-maintained. Keep alphabetically sorted; `registry.test.ts` fails when it and `CHART_TYPES` drift.

import { donut } from './charts/donut';
import { gauge } from './charts/gauge';
import { heatmap } from './charts/heatmap';
import { metricTrend } from './charts/metric_trend';
import { treemap } from './charts/treemap';
import { xyChart } from './charts/xy_chart';

export const chartDefinitions = [donut, gauge, heatmap, metricTrend, treemap, xyChart] as const;
