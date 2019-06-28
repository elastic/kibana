/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { switchFn } from '../../functions/common/switch';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof switchFn>> = {
  help: i18n.translate('xpack.canvas.functions.switchHelpText', {
    defaultMessage: 'Perform conditional logic with multiple conditions',
  }),
  args: {
    case: i18n.translate('xpack.canvas.functions.switch.args.caseHelpText', {
      defaultMessage: 'The list of conditions to check',
    }),
    default: i18n.translate('xpack.canvas.functions.switch.args.defaultHelpText', {
      defaultMessage: 'The default case if no cases match',
    }),
  },
};
