/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { mapColumn } from '../../functions/common/mapColumn';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../../types';
import { CANVAS, DATATABLE } from '../../../i18n';

export const help: FunctionHelp<FunctionFactory<typeof mapColumn>> = {
  help: i18n.translate('xpack.canvas.functions.mapColumnHelpText', {
    defaultMessage:
      'Adds a column calculated as the result of other columns. ' +
      'Changes are made only when you provide arguments.' +
      'See also {mapColumnFn} and {staticColumnFn}.',
    values: {
      mapColumnFn: '`mapColumn`',
      staticColumnFn: '`staticColumn`',
    },
  }),
  args: {
    name: i18n.translate('xpack.canvas.functions.mapColumn.args.nameHelpText', {
      defaultMessage: 'The name of the resulting column.',
    }),
    expression: i18n.translate('xpack.canvas.functions.mapColumn.args.expressionHelpText', {
      defaultMessage:
        'A {CANVAS} expression that is passed to each row as a single row {DATATABLE}.',
      values: {
        CANVAS,
        DATATABLE,
      },
    }),
  },
};
