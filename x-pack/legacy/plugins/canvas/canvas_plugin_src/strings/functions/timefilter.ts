/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { timefilter } from '../../functions/common/timefilter';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof timefilter>> = {
  help: i18n.translate('xpack.canvas.functions.timefilterHelpText', {
    defaultMessage: 'Create a {timefilter} for querying a source',
    values: {
      timefilter: 'timefilter',
    },
  }),
  args: {
    column: i18n.translate('xpack.canvas.functions.timefilter.args.columnHelpText', {
      defaultMessage: 'The column or field to attach the filter to',
    }),
    from: i18n.translate('xpack.canvas.functions.timefilter.args.fromHelpText', {
      defaultMessage: 'Beginning of the range, in {iso} or {es} {dm} format',
      values: {
        iso: 'ISO8601',
        es: 'Elasticsearch',
        dm: 'datemath',
      },
    }),
    to: i18n.translate('xpack.canvas.functions.timefilter.args.toHelpText', {
      defaultMessage: 'End of the range, in {iso} or {es} {dm} format',
      values: {
        iso: 'ISO8601',
        es: 'Elasticsearch',
        dm: 'datemath',
      },
    }),
    filterGroup: i18n.translate('xpack.canvas.functions.dropdownControl.args.filterGroupHelpText', {
      defaultMessage: 'Group name for the filter',
    }),
  },
};

export const errors = {
  invalidString: (str: string) =>
    new Error(
      i18n.translate('xpack.canvas.functions.timefilter.invalidStringErrorMessage', {
        defaultMessage: "Invalid date/time string: '{str}'",
        values: {
          str,
        },
      })
    ),
};
