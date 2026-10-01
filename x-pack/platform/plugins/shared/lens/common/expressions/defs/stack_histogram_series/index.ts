/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import type {
  StackHistogramSeriesFnArgs,
  stackHistogramSeriesFn,
} from '../../impl/stack_histogram_series/stack_histogram_series_fn';

export type StackHistogramSeriesExpressionFunction = ExpressionFunctionDefinition<
  'lens_stack_histogram_series',
  Datatable,
  StackHistogramSeriesFnArgs,
  Promise<Datatable>
>;

export const getStackHistogramSeries = (
  ...stackHistogramSeriesFnParameters: Parameters<typeof stackHistogramSeriesFn>
): StackHistogramSeriesExpressionFunction => ({
  name: 'lens_stack_histogram_series',
  type: 'datatable',
  help: i18n.translate('xpack.lens.functions.stackHistogramSeries.help', {
    defaultMessage:
      'Partitions a date histogram total into a selected subset and the remaining values.',
  }),
  inputTypes: ['datatable'],
  args: {
    timeColumn: {
      types: ['string'],
      help: i18n.translate('xpack.lens.functions.stackHistogramSeries.timeColumn.help', {
        defaultMessage: 'The input date histogram column ID.',
      }),
      required: true,
    },
    totalColumn: {
      types: ['string'],
      help: i18n.translate('xpack.lens.functions.stackHistogramSeries.totalColumn.help', {
        defaultMessage: 'The input total count column ID.',
      }),
      required: true,
    },
    overlayColumn: {
      types: ['string'],
      help: i18n.translate('xpack.lens.functions.stackHistogramSeries.overlayColumn.help', {
        defaultMessage: 'The output column ID for the selected subset.',
      }),
      required: true,
    },
    remainderColumn: {
      types: ['string'],
      help: i18n.translate('xpack.lens.functions.stackHistogramSeries.remainderColumn.help', {
        defaultMessage: 'The output column ID for the remaining values.',
      }),
      required: true,
    },
    label: {
      types: ['string'],
      help: i18n.translate('xpack.lens.functions.stackHistogramSeries.label.help', {
        defaultMessage: 'The display label for the selected subset.',
      }),
      required: true,
    },
    from: {
      types: ['string'],
      help: i18n.translate('xpack.lens.functions.stackHistogramSeries.from.help', {
        defaultMessage: 'The start of the time range represented by the subset values.',
      }),
      required: true,
    },
    to: {
      types: ['string'],
      help: i18n.translate('xpack.lens.functions.stackHistogramSeries.to.help', {
        defaultMessage: 'The end of the time range represented by the subset values.',
      }),
      required: true,
    },
    values: {
      types: ['string'],
      help: i18n.translate('xpack.lens.functions.stackHistogramSeries.values.help', {
        defaultMessage: 'The JSON-encoded array of selected subset values.',
      }),
      required: true,
    },
    isSampled: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.functions.stackHistogramSeries.isSampled.help', {
        defaultMessage: 'Indicates whether the subset values came from a sampled query.',
      }),
      required: true,
    },
    sampleProbability: {
      types: ['number'],
      help: i18n.translate('xpack.lens.functions.stackHistogramSeries.sampleProbability.help', {
        defaultMessage: 'The sampling probability used to scale the subset values.',
      }),
    },
  },
  async fn(...args) {
    const { stackHistogramSeriesFn } = await import('../../impl/async_fns');
    return stackHistogramSeriesFn(...stackHistogramSeriesFnParameters)(...args);
  },
});
