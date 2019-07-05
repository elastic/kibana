/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { caseFn } from '../../functions/common/case';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof caseFn>> = {
  help: i18n.translate('xpack.canvas.functions.caseHelpText', {
    defaultMessage:
      'Builds a case (including a condition/result) to pass to the {switch} function.',
    values: {
      switch: 'switch',
    },
  }),
  args: {
    when: i18n.translate('xpack.canvas.functions.case.args.whenHelpText', {
      defaultMessage:
        'The value compared to the {context} to see if they are equal. The `{whenArg}` argument is ignored when the `{ifArg}` argument is also specified.',
      values: {
        context: '_context_',
        ifArg: 'if',
        whenArg: 'when',
      },
    }),
    if: i18n.translate('xpack.canvas.functions.case.args.ifHelpText', {
      defaultMessage:
        'This value indicates whether the condition is met. The `{ifArg}` argument overrides the `{whenArg}` argument when both are provided.',
      values: {
        ifArg: 'if',
        whenArg: 'when',
      },
    }),
    then: i18n.translate('xpack.canvas.functions.case.args.thenHelpText', {
      defaultMessage: 'The value to return if the condition is met',
    }),
  },
};
