/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { all } from '../../../canvas_plugin_src/functions/common/all';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { BOOLEAN_TRUE } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof all>> = {
  help: i18n.translate('xpack.canvas.functions.allHelpText', {
    defaultMessage: 'Returns {BOOLEAN_TRUE} if all of the conditions are met. See also {anyFn}.',
    values: {
      anyFn: '`any`',
      BOOLEAN_TRUE,
    },
  }),
  args: {
    condition: i18n.translate('xpack.canvas.functions.all.args.conditionHelpText', {
      defaultMessage: 'The conditions to check.',
    }),
  },
};
