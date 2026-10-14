/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

export const catalog = {
  type: 'metricTrend',
  name: 'Metric with trend',
  purpose:
    'Let a reader take in one current number at a glance and which way it has moved recently.',
  useWhen: ['One current value with its recent direction is the point.'],
  avoidWhen: [
    'Values change over time, or differ across categories or a numeric measure, and should be read off an axis; use xyChart.',
    'One value against a target or range is the point; use gauge.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
