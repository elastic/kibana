/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { joinRows } from '../../functions/common/join_rows';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof joinRows>> = {
  help: i18n.translate('xpack.canvas.functions.joinRowsHelpText', {
    defaultMessage: 'Join values from rows in a datatable into a string',
  }),
  args: {
    column: i18n.translate('xpack.canvas.functions.joinRows.args.columnHelpText', {
      defaultMessage: 'Column to join values from',
    }),
    separator: i18n.translate('xpack.canvas.functions.joinRows.args.separatorHelpText', {
      defaultMessage: 'Separator to use between row values',
    }),
    quote: i18n.translate('xpack.canvas.functions.joinRows.args.quoteHelpText', {
      defaultMessage: 'Quote character around values',
    }),
    distinct: i18n.translate('xpack.canvas.functions.joinRows.args.distinctHelpText', {
      defaultMessage: 'Removes duplicate values if enabled',
    }),
  },
};

export const errors = {
  columnNotFound: (column: string) =>
    new Error(
      i18n.translate('xpack.canvas.functions.joinRows.columnNotFoundErrorMessage', {
        defaultMessage: "Column not found: '{column}'",
        values: {
          column,
        },
      })
    ),
};
