/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as errors from './errors';
export { errors };

export {
  SCREENSHOTTING_APP_ID,
  SCREENSHOTTING_EXPRESSION,
  SCREENSHOTTING_EXPRESSION_INPUT,
} from './expression';

export type { LayoutParams, LayoutType } from './layout';
export type { PerformanceMetrics } from './types';

export const PLUGIN_ID = 'screenshotting';
