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
      'Include or exclude columns from a data table. If you specify both, this will exclude first',
  }),
  args: {
    include: i18n.translate('xpack.canvas.functions.columns.args.includeHelpText', {
      defaultMessage: 'A comma separated list of column names to keep in the table',
    }),
    exclude: i18n.translate('xpack.canvas.functions.columns.args.excludeHelpText', {
      defaultMessage: 'A comma separated list of column names to remove from the table',
    }),
  },
};
