/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

export const catalog = {
  type: 'donut',
  name: 'Donut',
  purpose:
    'Let a reader see how one total divides among a few parts, and which part takes the most of it.',
  useWhen: [
    'The values are parts of one whole, six or fewer, and their share is the point.',
    'The parts sum to a total that means something, such as all storage, all alerts, or all spend.',
  ],
  avoidWhen: [
    'Values change over time, or differ across categories or a numeric measure, and should be read off an axis; use xyChart.',
    'The parts nest inside one another, or are many and approximate share is enough; use treemap.',
    'The values do not sum to a whole, such as averages, rates, or percentiles.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
