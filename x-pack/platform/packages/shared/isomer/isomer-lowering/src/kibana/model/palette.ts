/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Tone } from './tone';

// Lens carries continuous palettes (e.g. heatmap color stops, "color by value"
// on metrics) and categorical color mappings (e.g. stable colors per service
// name). Adaptive UI's `Tone` enum is discrete, so the converter records the
// mapping policy here and the binder applies it row-by-row at bind time.

export interface PaletteThreshold {
  /**
   * Numeric value at which this tone takes effect. Thresholds are sorted
   * ascending and matched as `value >= at`.
   */
  at: number;
  tone: Tone;
}

export interface PalettePolicy {
  /**
   * Continuous-to-tone mapping. The binder picks the tone of the highest
   * `at` that is `<= value`, or `defaultTone` if none match.
   */
  thresholds?: PaletteThreshold[];
  /**
   * Default tone applied when no threshold matches.
   */
  defaultTone?: Tone;
  /**
   * Categorical label-to-tone mapping. Used for series labels and slice
   * labels. Falls back to `defaultTone` or a deterministic palette cycle.
   */
  categorical?: Record<string, Tone>;
}
