/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { escount } from '../../functions/server/escount';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof escount>> = {
  help: i18n.translate('xpack.canvas.functions.escountHelpText', {
    defaultMessage: 'Query {es} for the number of hits matching the specified query.',
    values: {
      es: 'Elasticsearch',
    },
  }),
  args: {
    query: i18n.translate('xpack.canvas.functions.escount.args.queryHelpText', {
      defaultMessage: 'A {lucene} query string.',
      values: {
        lucene: 'Lucene',
      },
    }),
    index: i18n.translate('xpack.canvas.functions.escount.args.indexHelpText', {
      defaultMessage: 'An index or index pattern. For example, "{example}".',
      values: {
        example: 'logstash-*',
      },
    }),
  },
};
