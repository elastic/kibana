/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { gt } from '../../../canvas_plugin_src/functions/common/gt';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { CONTEXT } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof gt>> = {
  help: i18n.translate('xpack.canvas.functions.gtHelpText', {
    defaultMessage: 'Returns whether the {CONTEXT} is greater than the argument.',
    values: {
      CONTEXT,
    },
  }),
  args: {
    value: i18n.translate('xpack.canvas.functions.gt.args.valueHelpText', {
      defaultMessage: 'The value compared to the {CONTEXT}.',
      values: {
        CONTEXT,
      },
    }),
  },
};
