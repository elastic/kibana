/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

export const catalog = {
  type: 'gauge',
  name: 'Gauge',
  purpose:
    'Let a reader see at a glance where one value sits in its range, which status band it falls in, and how far it is from its target.',
  useWhen: [
    'One value against a target or range is the point.',
    'One headline value given emphasis: `shape: arc`.',
    'Several values compared, or little room: `shape: bar`.',
  ],
  avoidWhen: [
    'One current value with its recent direction is the point; use metricTrend.',
    'Values change over time, or differ across categories or a numeric measure, and should be read off an axis; use xyChart.',
    'The values are parts of one whole, six or fewer, and their share is the point; use donut.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
