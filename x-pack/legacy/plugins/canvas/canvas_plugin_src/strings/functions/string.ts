/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { string } from '../../functions/common/string';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof string>> = {
  help: i18n.translate('xpack.canvas.functions.stringHelpText', {
    defaultMessage:
      'Output a string made of other strings. Mostly useful when combined with ' +
      'sub-expressions that output a string, or something castable to a string',
  }),
  args: {
    value: i18n.translate('xpack.canvas.functions.string.args.valueHelpText', {
      defaultMessage:
        "One or more strings to join together. Don't forget spaces " + 'where needed!',
    }),
  },
};
