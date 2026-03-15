/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { DownsampleExpressionFunction } from './types';

export interface DownsampleArgs {
  targetPoints: number;
}

export type { DownsampleExpressionFunction };

/**
 * Client-side LTTB (Largest Triangle Three Buckets) downsampling.
 *
 * Reduces datatable rows to `targetPoints` while preserving the visual shape
 * of time series data. Automatically detects the date column as x-axis and
 * numeric columns as metrics, applying multi-metric LTTB so no significant
 * point for any metric is lost.
 *
 * If the datatable has no date column or fewer rows than `targetPoints`,
 * returns the input unchanged.
 */
export const downsample: DownsampleExpressionFunction = {
  name: 'lens_downsample',
  type: 'datatable',

  inputTypes: ['datatable'],

  help: i18n.translate('xpack.lens.functions.downsample.help', {
    defaultMessage:
      'Reduces datatable rows using LTTB downsampling while preserving the visual shape of time series.',
  }),

  args: {
    targetPoints: {
      help: i18n.translate('xpack.lens.functions.downsample.args.targetPointsHelpText', {
        defaultMessage: 'Maximum number of data points to keep',
      }),
      types: ['number'],
      required: true,
    },
  },

  async fn(...args) {
    const { downsampleFn } = await import('../../impl/async_fns');
    return downsampleFn(...args);
  },
};
