/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { lt } from '../../functions/common/lt';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../../types';
import { CONTEXT } from '../constants';

export const help: FunctionHelp<FunctionFactory<typeof lt>> = {
  help: i18n.translate('xpack.canvas.functions.ltHelpText', {
    defaultMessage: 'Returns whether the {CONTEXT} is less than the argument.',
    values: {
      CONTEXT,
    },
  }),
  args: {
    value: i18n.translate('xpack.canvas.functions.lt.args.valueHelpText', {
      defaultMessage: 'The value compared to the {CONTEXT}.',
      values: {
        CONTEXT,
      },
    }),
  },
};
