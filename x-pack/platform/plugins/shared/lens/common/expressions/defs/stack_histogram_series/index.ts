/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { StackHistogramSeriesFnArgs } from '../../impl/stack_histogram_series/stack_histogram_series_fn';

export type StackHistogramSeriesExpressionFunction = ExpressionFunctionDefinition<
  'lens_stack_histogram_series',
  Datatable,
  StackHistogramSeriesFnArgs,
  Datatable | Promise<Datatable>
>;

export const stackHistogramSeries: StackHistogramSeriesExpressionFunction = {
  name: 'lens_stack_histogram_series',
  type: 'datatable',
  help: 'Adds an overlay series and its remainder to a live date histogram',
  inputTypes: ['datatable'],
  args: {
    timeColumn: { types: ['string'], help: '', required: true },
    totalColumn: { types: ['string'], help: '', required: true },
    overlayColumn: { types: ['string'], help: '', required: true },
    remainderColumn: { types: ['string'], help: '', required: true },
    label: { types: ['string'], help: '', required: true },
    from: { types: ['string'], help: '', required: true },
    to: { types: ['string'], help: '', required: true },
    values: { types: ['string'], help: '', required: true },
    isSampled: { types: ['boolean'], help: '', required: true },
    sampleProbability: { types: ['number'], help: '' },
  },
  async fn(input, args) {
    const { stackHistogramSeriesFn } = await import('../../impl/async_fns');
    return stackHistogramSeriesFn(input, args);
  },
};
