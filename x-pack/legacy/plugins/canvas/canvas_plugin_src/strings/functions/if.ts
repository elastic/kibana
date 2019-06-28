/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ifFn } from '../../functions/common/if';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof ifFn>> = {
  help: i18n.translate('xpack.canvas.functions.ifHelpText', {
    defaultMessage: 'Perform conditional logic',
  }),
  args: {
    condition: i18n.translate('xpack.canvas.functions.if.args.conditionHelpText', {
      defaultMessage:
        'A boolean true or false, usually returned by a subexpression. If this is not ' +
        'supplied then the input context will be used',
    }),
    then: i18n.translate('xpack.canvas.functions.if.args.thenHelpText', {
      defaultMessage: 'The return value if true',
    }),
    else: i18n.translate('xpack.canvas.functions.if.args.elseHelpText', {
      defaultMessage:
        'The return value if false. If else is not specified, and the condition is false ' +
        'then the input context to the function will be returned',
    }),
  },
};
