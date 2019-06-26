/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { esdocs } from '../../functions/server/esdocs';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof esdocs>> = {
  help: i18n.translate('xpack.canvas.functions.esdocsHelpText', {
    defaultMessage:
      'Query {es} for raw documents. Specify the fields you want to receive, ' +
      'especially if you are asking for a lot of rows',
    values: {
      es: 'elasticsearch',
    },
  }),
  args: {
    index: i18n.translate('xpack.canvas.functions.esdocs.args.indexHelpText', {
      defaultMessage: 'An index or index pattern. For example, "{example}".',
      values: {
        example: 'logstash-*',
      },
    }),
    query: i18n.translate('xpack.canvas.functions.esdocs.args.queryHelpText', {
      defaultMessage: 'A {lucene} query string',
      values: {
        lucene: 'Lucene',
      },
    }),
    sort: i18n.translate('xpack.canvas.functions.esdocs.args.sortHelpText', {
      defaultMessage:
        'Sort directions as "{directions}". For example, "{example1}" or "{example2}"',
      values: {
        directions: ['field', 'direction'].join(', '),
        example1: ['@timestamp', 'desc'].join(', '),
        example2: ['bytes', 'asc'].join(', '),
      },
    }),
    fields: i18n.translate('xpack.canvas.functions.esdocs.args.fieldsHelpText', {
      defaultMessage: 'A comma-separated list of fields. Fewer fields will perform better',
    }),
    count: i18n.translate('xpack.canvas.functions.esdocs.args.countHelpText', {
      defaultMessage: 'The number of docs to pull back. Smaller numbers perform better',
    }),
  },
};
