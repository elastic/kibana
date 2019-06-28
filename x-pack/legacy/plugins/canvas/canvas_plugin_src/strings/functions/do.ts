/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { doFn } from '../../functions/common/do';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof doFn>> = {
  help: i18n.translate('xpack.canvas.functions.doHelpText', {
    defaultMessage:
      'Runs multiple sub-expressions. Returns the passed in context. Nice for running ' +
      'actions producing functions.',
  }),
  args: {
    fn: i18n.translate('xpack.canvas.functions.do.args.fnHelpText', {
      defaultMessage:
        'One or more sub-expressions. The value of these is not available in the root ' +
        'pipeline as this function simply returns the passed in context',
    }),
  },
};
