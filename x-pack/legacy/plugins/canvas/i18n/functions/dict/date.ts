/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { date } from '../../../canvas_plugin_src/functions/common/date';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { ISO8601, MOMENTJS, JS } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof date>> = {
  help: i18n.translate('xpack.canvas.functions.dateHelpText', {
    defaultMessage:
      'Returns the current time, or a time parsed from a specified string, as milliseconds since epoch.',
  }),
  args: {
    value: i18n.translate('xpack.canvas.functions.date.args.valueHelpText', {
      defaultMessage:
        'An optional date string that is parsed into milliseconds since epoch. The date string can be either a valid ' +
        '{JS} {date} input or a string to parse using the {formatArg} argument. Must be an {ISO8601} ' +
        'string, or you must provide the format.',
      values: {
        JS,
        date: '`Date`',
        formatArg: '`format`',
        ISO8601,
      },
    }),
    format: i18n.translate('xpack.canvas.functions.date.args.formatHelpText', {
      defaultMessage: 'The {MOMENTJS} format used to parse the specified date string. See {url}.',
      values: {
        MOMENTJS,
        url: 'https://momentjs.com/docs/#/displaying/',
      },
    }),
  },
};

export const errors = {
  invalidDateInput: (dateStr: string | null) =>
    new Error(
      i18n.translate('xpack.canvas.functions.date.invalidDateInputErrorMessage', {
        defaultMessage: 'Invalid date input: {date}',
        values: {
          date: dateStr,
        },
      })
    ),
};
