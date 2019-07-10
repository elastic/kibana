/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { urlparam } from '../../functions/browser/urlparam';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof urlparam>> = {
  help: i18n.translate('xpack.canvas.functions.urlparamHelpText', {
    defaultMessage:
      'Retreives a {url} parameter to use in an expression. ' +
      'The `{urlparamFn}` function always returns a `string`. ' +
      'For example, you can retrieve the value `{value}` from the parameter `{myVar}` from the {url} {example}).',
    values: {
      urlparamFn: 'urlparam',
      url: 'URL',
      value: '"20"',
      myVar: 'myVar',
      example: 'https://localhost:5601/app/canvas?myVar=20',
    },
  }),
  args: {
    param: i18n.translate('xpack.canvas.functions.urlparam.args.paramHelpText', {
      defaultMessage: 'The {url} hash parameter to retrieve.',
      values: {
        url: 'URL',
      },
    }),
    default: i18n.translate('xpack.canvas.functions.urlparam.args.defaultHelpText', {
      defaultMessage: 'The string returned when the {url} parameter is unspecified.',
      values: {
        url: 'URL',
      },
    }),
  },
};
