/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDistillery } from '@elastic/distillate';

import { CHART_THEME } from './tokens';

/** Class name every chart figure carries, and the theme's scope selector. */
export const chartRoot = 'isomerChart';

// Guarded so the pack loads as unbundled browser ESM, where `process` is absent.
const dev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

export const chartDistillery = createDistillery({
  dev,
  prefix: 'chart',
  themeScope: `.${chartRoot}`,
  theme: CHART_THEME,
});
