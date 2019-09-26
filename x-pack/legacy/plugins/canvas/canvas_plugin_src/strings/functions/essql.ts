/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { essql } from '../../functions/server/essql';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../../types';
import { ELASTICSEARCH, SQL, ISO8601, UTC } from '../../../i18n';

export const help: FunctionHelp<FunctionFactory<typeof essql>> = {
  help: i18n.translate('xpack.canvas.functions.essqlHelpText', {
    defaultMessage: 'Queries {ELASTICSEARCH} using {ELASTICSEARCH} {SQL}.',
    values: {
      ELASTICSEARCH,
      SQL,
    },
  }),
  args: {
    query: i18n.translate('xpack.canvas.functions.essql.args.queryHelpText', {
      defaultMessage: 'An {ELASTICSEARCH} {SQL} query.',
      values: {
        ELASTICSEARCH,
        SQL,
      },
    }),
    count: i18n.translate('xpack.canvas.functions.essql.args.countHelpText', {
      defaultMessage:
        'The number of documents to retrieve. For better performance, use a smaller data set.',
    }),
    timezone: i18n.translate('xpack.canvas.functions.essql.args.timezoneHelpText', {
      defaultMessage:
        'The timezone to use for date operations. Valid {ISO8601} formats and {UTC} offsets both work.',
      values: {
        ISO8601,
        UTC,
      },
    }),
  },
};
