/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { staticColumn } from '../../functions/common/staticColumn';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof staticColumn>> = {
  help: i18n.translate('xpack.canvas.functions.staticColumnHelpText', {
    defaultMessage: 'Add a column with a static value',
  }),
  args: {
    name: i18n.translate('xpack.canvas.functions.staticColumn.args.nameHelpText', {
      defaultMessage: 'The name of the new column column',
    }),
    value: i18n.translate('xpack.canvas.functions.staticColumn.args.valueHelpText', {
      defaultMessage:
        'The value to insert in each column. Tip: use a sub-expression to rollup ' +
        'other columns into a static value',
    }),
  },
};
