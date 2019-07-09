/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { eq } from '../../functions/common/eq';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof eq>> = {
  help: i18n.translate('xpack.canvas.functions.eqHelpText', {
    defaultMessage: 'Return if the context is equal to the argument',
  }),
  args: {
    value: i18n.translate('xpack.canvas.functions.eq.args.valueHelpText', {
      defaultMessage: 'The value to compare the context to',
    }),
  },
};
