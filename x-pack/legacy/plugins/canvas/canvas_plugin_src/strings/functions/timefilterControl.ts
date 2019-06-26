/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { timefilterControl } from '../../functions/common/timefilterControl';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof timefilterControl>> = {
  help: i18n.translate('xpack.canvas.functions.timefilterControlHelpText', {
    defaultMessage: 'Configure a {timefilter} control element',
    values: {
      timefilter: 'timefilter',
    },
  }),
  args: {
    column: i18n.translate('xpack.canvas.functions.timefilterControl.args.columnHelpText', {
      defaultMessage: 'The column or field to attach the filter to',
    }),
    compact: i18n.translate('xpack.canvas.functions.timefilterControl.args.compactHelpText', {
      defaultMessage: 'Show the time filter as a button that triggers a popover',
    }),
    filterGroup: i18n.translate('xpack.canvas.functions.dropdownControl.args.filterGroupHelpText', {
      defaultMessage: 'Group name for the filter',
    }),
  },
};
