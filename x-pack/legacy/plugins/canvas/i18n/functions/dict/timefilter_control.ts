/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { timefilterControl } from '../../../canvas_plugin_src/functions/common/timefilterControl';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof timefilterControl>> = {
  help: i18n.translate('xpack.canvas.functions.timefilterControlHelpText', {
    defaultMessage: 'Configures a time filter control element.',
  }),
  args: {
    column: i18n.translate('xpack.canvas.functions.timefilterControl.args.columnHelpText', {
      defaultMessage: 'The column or field that you want to filter.',
    }),
    compact: i18n.translate('xpack.canvas.functions.timefilterControl.args.compactHelpText', {
      defaultMessage: 'Shows the time filter as a button, which triggers a popover.',
    }),
    filterGroup: i18n.translate('xpack.canvas.functions.dropdownControl.args.filterGroupHelpText', {
      defaultMessage: 'The group name for the filter.',
    }),
  },
};
