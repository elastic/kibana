/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { context } from '../../../canvas_plugin_src/functions/common/context';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { CONTEXT } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof context>> = {
  help: i18n.translate('xpack.canvas.functions.contextHelpText', {
    defaultMessage:
      'Returns whatever you pass into it. This can be useful when you need to use ' +
      '{CONTEXT} as argument to a function as a sub-expression.',
    values: {
      CONTEXT,
    },
  }),
  args: {},
};
