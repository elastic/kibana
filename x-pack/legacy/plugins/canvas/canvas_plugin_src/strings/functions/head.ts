/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { head } from '../../functions/common/head';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof head>> = {
  help: i18n.translate('xpack.canvas.functions.headHelpText', {
    defaultMessage: 'Get the first {n} rows from the {datatable}. Also see `{tail}`',
    values: {
      n: 'N',
      datatable: 'datatable',
      tail: 'tail',
    },
  }),
  args: {
    count: i18n.translate('xpack.canvas.functions.head.args.countHelpText', {
      defaultMessage: 'Return this many rows from the beginning of the {datatable}',
      values: {
        datatable: 'datatable',
      },
    }),
  },
};
