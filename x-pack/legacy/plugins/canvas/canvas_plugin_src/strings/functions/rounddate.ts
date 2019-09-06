/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { rounddate } from '../../functions/common/rounddate';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../../types';
import { MOMENTJS } from '../../../i18n';

export const help: FunctionHelp<FunctionFactory<typeof rounddate>> = {
  help: i18n.translate('xpack.canvas.functions.rounddateHelpText', {
    defaultMessage:
      'Uses a {MOMENTJS} formatting string to round milliseconds since epoch, and returns milliseconds since epoch.',
    values: {
      MOMENTJS,
    },
  }),
  args: {
    format: i18n.translate('xpack.canvas.functions.rounddate.args.formatHelpText', {
      defaultMessage:
        'The {MOMENTJS} format to use for bucketing. For example, {example} would round each date to months. See {url}.',
      values: {
        example: '`"YYYY-MM"`',
        MOMENTJS,
        url: 'https://momentjs.com/docs/#/displaying/',
      },
    }),
  },
};
