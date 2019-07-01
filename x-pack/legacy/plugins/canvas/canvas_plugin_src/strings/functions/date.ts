/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { date } from '../../functions/common/date';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof date>> = {
  help: i18n.translate('xpack.canvas.functions.dateHelpText', {
    defaultMessage:
      'Returns the current time, or a time parsed from a string, as milliseconds since epoch',
  }),
  args: {
    value: i18n.translate('xpack.canvas.functions.date.args.valueHelpText', {
      defaultMessage:
        'An optional date string to parse into milliseconds since epoch. Can be either a valid ' +
        'Javascript Date input or a string to parse using the format argument. Must be an {iso} ' +
        'string or you must provide the format',
      values: {
        iso: 'ISO8601',
      },
    }),
    format: i18n.translate('xpack.canvas.functions.date.args.formatHelpText', {
      defaultMessage: 'The {moment} format for parsing the optional date string (See {url})',
      values: {
        moment: 'momentJS',
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
