/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeScaleExpressionFunction } from './types';
import type { timeScaleFn } from './time_scale_fn';

export const getTimeScale = (
  ...timeScaleFnParameters: Parameters<typeof timeScaleFn>
): TimeScaleExpressionFunction => ({
  name: 'lens_time_scale',
  type: 'datatable',
  help: '',
  args: {
    dateColumnId: {
      types: ['string'],
      help: '',
    },
    inputColumnId: {
      types: ['string'],
      help: '',
      required: true,
    },
    outputColumnId: {
      types: ['string'],
      help: '',
      required: true,
    },
    outputColumnName: {
      types: ['string'],
      help: '',
    },
    targetUnit: {
      types: ['string'],
      options: ['s', 'm', 'h', 'd'],
      help: '',
      required: true,
    },
    reducedTimeRange: {
      types: ['string'],
      help: '',
    },
  },
  inputTypes: ['datatable'],
  async fn(...args) {
    /** Build optimization: prevent adding extra code into initial bundle **/
    const { timeScaleFn } = await import('./time_scale_fn');
    return timeScaleFn(...timeScaleFnParameters)(...args);
  },
});
