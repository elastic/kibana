/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { mapColumn } from '../../functions/common/mapColumn';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof mapColumn>> = {
  help: i18n.translate('xpack.canvas.functions.mapColumnHelpText', {
    defaultMessage: 'Add a column calculated as the result of other columns, or not',
  }),
  args: {
    name: i18n.translate('xpack.canvas.functions.mapColumn.args.nameHelpText', {
      defaultMessage: 'The name of the resulting column',
    }),
    expression: i18n.translate('xpack.canvas.functions.mapColumn.args.expressionHelpText', {
      defaultMessage:
        'A canvas expression which will be passed each row as a single row {datatable}',
      values: {
        datatable: 'datatable',
      },
    }),
  },
};
