/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { gte } from '../../functions/common/gte';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof gte>> = {
  help: i18n.translate('xpack.canvas.functions.gteHelpText', {
    defaultMessage: 'Returns whether the {context} is greater or equal to the argument.',
    values: {
      context: '_context_',
    },
  }),
  args: {
    value: i18n.translate('xpack.canvas.functions.gte.args.valueHelpText', {
      defaultMessage: 'The value compared to the {context}.',
      values: {
        context: '_context_',
      },
    }),
  },
};
