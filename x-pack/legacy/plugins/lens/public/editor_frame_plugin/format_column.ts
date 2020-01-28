/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunction, KibanaDatatable } from 'src/plugins/expressions/public';

interface FormatColumn {
  format: string;
  columnId: string;
  maxDecimals?: number;
}

const supportedFormats: Record<string, { decimalsToPattern: (decimals?: number) => string }> = {
  number: {
    decimalsToPattern: (decimals = 3) => {
      if (decimals === 0) {
        return `0,0`;
      }
      return `0,0.[${'0'.repeat(decimals)}]`;
    },
  },
  percent: {
    decimalsToPattern: (decimals = 3) => {
      if (decimals === 0) {
        return `0,0%`;
      }
      return `0,0.[${'0'.repeat(decimals)}]%`;
    },
  },
  bytes: {
    decimalsToPattern: (decimals = 3) => {
      if (decimals === 0) {
        return `0,0b`;
      }
      return `0,0.[${'0'.repeat(decimals)}]b`;
    },
  },
};

export const formatColumn: ExpressionFunction<
  'lens_format_column',
  KibanaDatatable,
  FormatColumn,
  KibanaDatatable
> = {
  name: 'lens_format_column',
  type: 'kibana_datatable',
  help: i18n.translate('xpack.lens.functions.mergeTables.help', {
    defaultMessage: 'A helper to merge any number of kibana tables into a single table',
  }),
  args: {
    format: {
      types: ['string'],
      help: '',
    },
    columnId: {
      types: ['string'],
      help: '',
    },
    maxDecimals: {
      types: ['number'],
      help: '',
    },
  },
  context: {
    types: ['kibana_datatable'],
  },
  fn(ctx, { format, columnId, maxDecimals }: FormatColumn) {
    return {
      ...ctx,
      columns: ctx.columns.map(col => {
        if (col.id === columnId) {
          if (supportedFormats[format]) {
            return {
              ...col,
              formatHint: {
                id: format,
                params: { pattern: supportedFormats[format].decimalsToPattern(maxDecimals) },
              },
            };
          } else {
            return {
              ...col,
              formatHint: { id: format, params: {} },
            };
          }
        }
        return col;
      }),
    };
  },
};
