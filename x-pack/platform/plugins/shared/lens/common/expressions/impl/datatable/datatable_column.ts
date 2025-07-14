/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';

export type DatatableColumnFn = ExpressionFunctionDefinition<
  typeof LENS_DATATABLE_COLUMN,
  null,
  DatatableColumnArgs,
  DatatableColumnResult
>;

export const datatableColumn: DatatableColumnFn = {
  name: LENS_DATATABLE_COLUMN,
  aliases: [],
  type: LENS_DATATABLE_COLUMN,
  help: '',
  inputTypes: ['null'],
  args: {
    columnId: { types: ['string'], help: '' },
    alignment: { types: ['string'], help: '' },
    sortingHint: { types: ['string'], help: '' },
    hidden: { types: ['boolean'], help: '' },
    oneClickFilter: { types: ['boolean'], help: '' },
    width: { types: ['number'], help: '' },
    isTransposed: { types: ['boolean'], help: '' },
    transposable: { types: ['boolean'], help: '' },
    colorMode: { types: ['string'], help: '' },
    palette: {
      types: ['palette'],
      help: '',
    },
    colorMapping: {
      types: ['string'],
      help: '',
    },
    summaryRow: { types: ['string'], help: '' },
    summaryLabel: { types: ['string'], help: '' },
  },
  fn: function fn(input, args) {
    return {
      type: LENS_DATATABLE_COLUMN,
      ...args,
    };
  },
};
