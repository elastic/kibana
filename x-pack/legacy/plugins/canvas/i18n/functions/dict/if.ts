/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ifFn } from '../../../canvas_plugin_src/functions/common/if';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { BOOLEAN_TRUE, BOOLEAN_FALSE, CONTEXT } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof ifFn>> = {
  help: i18n.translate('xpack.canvas.functions.ifHelpText', {
    defaultMessage: 'Perform conditional logic',
  }),
  args: {
    condition: i18n.translate('xpack.canvas.functions.if.args.conditionHelpText', {
      defaultMessage:
        'A {BOOLEAN_TRUE} or {BOOLEAN_FALSE} indicating whether a condition is met, ' +
        'usually returned by a sub-expression. When unspecified, the original {CONTEXT} is returned.',
      values: {
        BOOLEAN_TRUE,
        BOOLEAN_FALSE,
        CONTEXT,
      },
    }),
    then: i18n.translate('xpack.canvas.functions.if.args.thenHelpText', {
      defaultMessage:
        'The return value when the condition is {BOOLEAN_TRUE}. ' +
        'When unspecified and the condition is met, the original {CONTEXT} is returned.',
      values: {
        BOOLEAN_TRUE,
        CONTEXT,
      },
    }),
    else: i18n.translate('xpack.canvas.functions.if.args.elseHelpText', {
      defaultMessage:
        'The return value when the condition is {BOOLEAN_FALSE}. ' +
        'When unspecified and the condition is not met, the original {CONTEXT} is returned.',
      values: {
        BOOLEAN_FALSE,
        CONTEXT,
      },
    }),
  },
};
