/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormatColumnExpressionFunction } from './types';

export interface FormatColumnArgs {
  format: string;
  columnId: string;
  decimals?: number;
  suffix?: string;
  compact?: boolean;
  pattern?: string;
  parentFormat?: string;
  fromUnit?: string;
  toUnit?: string;
}

export const formatColumn: FormatColumnExpressionFunction = {
  name: 'lens_format_column',
  type: 'datatable',
  help: '',
  args: {
    format: {
      types: ['string'],
      help: '',
      required: true,
    },
    columnId: {
      types: ['string'],
      help: '',
      required: true,
    },
    decimals: {
      types: ['number'],
      help: '',
    },
    suffix: {
      types: ['string'],
      help: '',
    },
    parentFormat: {
      types: ['string'],
      help: '',
    },
    compact: {
      types: ['boolean'],
      help: '',
    },
    pattern: {
      types: ['string'],
      help: '',
    },
    fromUnit: {
      types: ['string'],
      help: '',
    },
    toUnit: {
      types: ['string'],
      help: '',
    },
  },
  inputTypes: ['datatable'],
  async fn(...args) {
    /** Build optimization: prevent adding extra code into initial bundle **/
    const { formatColumnFn } = await import('./format_column_fn');
    return formatColumnFn(...args);
  },
};
