/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

export const catalog = {
  type: 'heatmap',
  name: 'Heatmap',
  purpose:
    'Let a reader find where values run high or low across two dimensions at a glance, such as which host in which hour, by color intensity rather than by reading numbers.',
  useWhen: [
    'Values sit on a grid of two dimensions and their intensity is the point.',
    'One row of buckets, such as a cycle of hours or weekdays, where hot spots matter more than exact values.',
    'A symmetric relation between items, read as a matrix.',
    'Values either side of a neutral point, such as a change from baseline; use a `diverging` scale.',
    'Values against status thresholds; use `bands` with tones.',
  ],
  avoidWhen: [
    'Values change over time, or differ across categories or a numeric measure, and should be read off an axis; use xyChart.',
    'The values are parts of one whole, six or fewer, and their share is the point; use donut.',
    'One value against a target or range is the point; use gauge.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
