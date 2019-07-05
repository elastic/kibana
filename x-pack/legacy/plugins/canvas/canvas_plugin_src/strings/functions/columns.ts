/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { columns } from '../../functions/common/columns';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof columns>> = {
  help: i18n.translate('xpack.canvas.functions.columnsHelpText', {
    defaultMessage:
      'Includes or excludes columns from a `{datatable}`. ' +
      'When both arguments are specified, the excluded columns will be removed first.',
    values: {
      datatable: 'datatable',
    },
  }),
  args: {
    include: i18n.translate('xpack.canvas.functions.columns.args.includeHelpText', {
      defaultMessage: 'A comma-separated list of column names to keep in the `{datatable}`.',
      values: {
        datatable: 'datatable',
      },
    }),
    exclude: i18n.translate('xpack.canvas.functions.columns.args.excludeHelpText', {
      defaultMessage: 'A comma-separated list of column names to remove from the `{datatable}`.',
      values: {
        datatable: 'datatable',
      },
    }),
  },
};
