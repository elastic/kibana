/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { table } from '../../functions/common/table';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof table>> = {
  help: i18n.translate('xpack.canvas.functions.tableHelpText', {
    defaultMessage: 'Configures a table element',
  }),
  args: {
    font: i18n.translate('xpack.canvas.functions.table.args.fontHelpText', {
      defaultMessage:
        'The {css} font properties for the contents of the table. For example, {fontFamily} or {fontWeight}.',
      values: {
        css: 'CSS',
        fontFamily: 'font-family',
        fontWeight: 'font-weight',
      },
    }),
    paginate: i18n.translate('xpack.canvas.functions.table.args.paginateHelpText', {
      defaultMessage: 'Show pagination controls? When `false`, only the first page is displayed.',
    }),
    perPage: i18n.translate('xpack.canvas.functions.table.args.perPageHelpText', {
      defaultMessage: 'The number of rows to display on each page.',
    }),
    showHeader: i18n.translate('xpack.canvas.functions.table.args.showHeaderHelpText', {
      defaultMessage: 'Show or hide the header row with titles for each column',
    }),
  },
};
