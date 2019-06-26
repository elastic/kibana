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
      'Format a valid date string or number of {ms} since epoch using {moment} (see {url})',
    values: {
      ms: 'ms',
      moment: 'momentJS',
      url: 'https://momentjs.com/',
    },
  }),
  args: {
    format: i18n.translate('xpack.canvas.functions.formatdate.args.formatHelpText', {
      defaultMessage: '{moment} Format with which to bucket (See {url})',
      values: {
        moment: 'momentJS',
        url: 'https://momentjs.com/docs/#/displaying/',
      },
    }),
  },
};
