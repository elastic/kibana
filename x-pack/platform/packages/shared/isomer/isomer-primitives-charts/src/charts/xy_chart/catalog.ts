/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

export const catalog = {
  type: 'xyChart',
  name: 'XY chart',
  purpose:
    'Let a reader compare values across an ordered axis and between series: trends over time, values per category, and how parts stack into totals.',
  useWhen: [
    'Values change over time, or differ across categories or a numeric measure, and should be read off an axis.',
    'Several series share the x axis and are compared or stacked into a total, including each one’s share of it.',
    'Two measures in different units share x; put the second on `y2`.',
  ],
  avoidWhen: [
    'The values are parts of one whole, six or fewer, and their share is the point; use donut.',
    'The parts nest inside one another, or are many and approximate share is enough; use treemap.',
    'One current value with its recent direction is the point; use metricTrend.',
    'One value against a target or range is the point; use gauge.',
    'Values sit on a grid of two dimensions and their intensity is the point; use heatmap.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
