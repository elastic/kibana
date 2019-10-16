/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { doFn } from '../../../canvas_plugin_src/functions/common/do';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { CONTEXT } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof doFn>> = {
  help: i18n.translate('xpack.canvas.functions.doHelpText', {
    defaultMessage:
      'Executes multiple sub-expressions, then returns the original {CONTEXT}. ' +
      'Use for running functions that produce an action or a side effect without changing the original {CONTEXT}.',
    values: {
      CONTEXT,
    },
  }),
  args: {
    fn: i18n.translate('xpack.canvas.functions.do.args.fnHelpText', {
      defaultMessage:
        'The sub-expressions to execute. The return values of these sub-expressions are not available in the root ' +
        'pipeline as this function simply returns the original {CONTEXT}.',
      values: {
        CONTEXT,
      },
    }),
  },
};
