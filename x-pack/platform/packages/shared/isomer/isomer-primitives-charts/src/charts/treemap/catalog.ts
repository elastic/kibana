/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

export const catalog = {
  type: 'treemap',
  name: 'Treemap',
  purpose:
    'Let a reader see how a total breaks down into parts and the parts into smaller parts, and roughly how much of the whole each one holds.',
  useWhen: [
    'The parts nest inside one another, or are many and approximate share is enough.',
    'Area comparison across many leaves is the point; use `layout: "rectangles"`.',
    'Depth and path from the root are the point; use `layout: "rings"`.',
  ],
  avoidWhen: [
    'The values are parts of one whole, six or fewer, and their share is the point; use donut.',
    'Values change over time, or differ across categories or a numeric measure, and should be read off an axis; use xyChart.',
    'Values sit on a grid of two dimensions and their intensity is the point; use heatmap.',
    'The values do not sum to a whole, such as averages, rates, or percentiles.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
