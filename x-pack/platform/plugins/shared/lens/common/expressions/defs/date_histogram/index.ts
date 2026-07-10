/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type dateHistogramTextBasedFn } from '../../impl/date_histogram/date_histogram_fn_textbased';
import type { DateHistogramTextBasedExpressionFunction } from './types';

export const getDateHistogramTextBased = (
  ...dateHistogramFnParameters: Parameters<typeof dateHistogramTextBasedFn>
): DateHistogramTextBasedExpressionFunction => ({
  name: 'lens_date_histogram_textbased',
  type: 'datatable',
  help: '',
  args: {},
  inputTypes: ['datatable'],
  async fn(...args) {
    /** Build optimization: prevent adding extra code into initial bundle **/
    const { dateHistogramTextBasedFn } = await import('../../impl/async_fns');
    return dateHistogramTextBasedFn(...dateHistogramFnParameters)(...args);
  },
});
