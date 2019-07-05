/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { dropdownControl } from '../../functions/common/dropdownControl';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof dropdownControl>> = {
  help: i18n.translate('xpack.canvas.functions.dropdownControlHelpText', {
    defaultMessage: 'Configure a drop down filter control element',
  }),
  args: {
    filterColumn: i18n.translate(
      'xpack.canvas.functions.dropdownControl.args.filterColumnHelpText',
      {
        defaultMessage: 'The column or field to attach the filter to',
      }
    ),
    valueColumn: i18n.translate('xpack.canvas.functions.dropdownControl.args.valueColumnHelpText', {
      defaultMessage:
        'The datatable column from which to extract the unique values for the drop down',
    }),
    filterGroup: i18n.translate('xpack.canvas.functions.dropdownControl.args.filterGroupHelpText', {
      defaultMessage: 'Group name for the filter',
    }),
  },
};
