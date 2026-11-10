/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricReading } from './corpus';
import { normalizeColor } from './colors';
import type { NormalizedMetric } from './model';

/** Elastic Charts' class for a fragment inside the value text, such as a number's sign or unit. */
const VALUE_PART_CLASS = 'echMetricText__part';

/**
 * Metric tiles as the corpus reads them from the page: each tile's background and its texts in
 * DOM order, with the fragments Elastic Charts nests inside the value left out.
 */
export const normalizeMetricReadings = (readings: MetricReading[]): NormalizedMetric => ({
  kind: 'metric',
  tiles: readings.map(({ backgroundColor, texts }) => ({
    background: normalizeColor(backgroundColor),
    texts: texts
      .filter(({ className }) => !className.split(/\s+/).includes(VALUE_PART_CLASS))
      .map(({ text, color }) => ({ text, color: normalizeColor(color) })),
  })),
});
