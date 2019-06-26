/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { all } from '../../functions/common/all';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof all>> = {
  help: i18n.translate('xpack.canvas.functions.allHelpText', {
    defaultMessage: 'Return true if all of the conditions are true',
  }),
  args: {
    condition: i18n.translate('xpack.canvas.functions.all.args.conditionHelpText', {
      defaultMessage: 'One or more conditions to check',
    }),
  },
};
