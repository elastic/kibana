/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { exactly } from '../../functions/common/exactly';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof exactly>> = {
  help: i18n.translate('xpack.canvas.functions.exactlyHelpText', {
    defaultMessage: 'Create a filter that matches a given column for a perfectly exact value',
  }),
  args: {
    column: i18n.translate('xpack.canvas.functions.exactly.args.columnHelpText', {
      defaultMessage: 'The column or field to attach the filter to',
    }),
    value: i18n.translate('xpack.canvas.functions.exactly.args.valueHelpText', {
      defaultMessage: 'The value to match exactly, including white space and capitalization',
    }),
    filterGroup: i18n.translate('xpack.canvas.functions.dropdownControl.args.filterGroupHelpText', {
      defaultMessage: 'Group name for the filter',
    }),
  },
};
