/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { formatdate } from '../../functions/common/formatdate';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof formatdate>> = {
  help: i18n.translate('xpack.canvas.functions.formatdateHelpText', {
    defaultMessage:
      'Formats an {iso} date string or a date in milliseconds since epoch using {moment}. See {url}.',
    values: {
      iso: 'ISO8601',
      moment: 'MomentJS',
      url: 'https://momentjs.com/',
    },
  }),
  args: {
    format: i18n.translate('xpack.canvas.functions.formatdate.args.formatHelpText', {
      defaultMessage:
        'The {moment} format of the resulting date string. For example, `"MM/DD/YYYY"`. See {url}',
      values: {
        moment: 'MomentJS',
        url: 'https://momentjs.com/',
      },
    }),
  },
};
