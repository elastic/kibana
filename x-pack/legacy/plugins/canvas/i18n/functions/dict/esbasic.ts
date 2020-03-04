/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { esbasic } from '../../../canvas_plugin_src/functions/server/esbasic';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { ELASTICSEARCH } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof esbasic>> = {
  help: i18n.translate('xpack.canvas.functions.esbasicHelpText', {
    defaultMessage:
      'Query {ELASTICSEARCH} for raw documents. Specify the fields you want to retrieve, ' +
      'especially if you are asking for a lot of rows.',
    values: {
      ELASTICSEARCH,
    },
  }),
  args: {
    fields: i18n.translate('xpack.canvas.functions.esbasic.args.fieldsHelpText', {
      defaultMessage: 'A comma-separated list of fields. For better performance, use fewer fields.',
    }),
    index: i18n.translate('xpack.canvas.functions.esbasic.args.indexHelpText', {
      defaultMessage: 'An index or index pattern. For example, {example}.',
      values: {
        example: '`"logstash-*"`',
      },
    }),
  },
};
