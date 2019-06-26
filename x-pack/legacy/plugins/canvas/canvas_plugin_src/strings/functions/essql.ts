/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { essql } from '../../functions/server/essql';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof essql>> = {
  help: i18n.translate('xpack.canvas.functions.essqlHelpText', {
    defaultMessage: '{essql}',
    values: {
      essql: 'Elasticsearch SQL',
    },
  }),
  args: {
    query: i18n.translate('xpack.canvas.functions.essql.args.queryHelpText', {
      defaultMessage: '{sql} query',
      values: {
        sql: 'SQL',
      },
    }),
    count: i18n.translate('xpack.canvas.functions.essql.args.countHelpText', {
      defaultMessage: 'The number of docs to pull back. Smaller numbers perform better',
    }),
    timezone: i18n.translate('xpack.canvas.functions.essql.args.timezoneHelpText', {
      defaultMessage:
        'Timezone to use for date operations, valid {iso} formats and {utc} offsets both work',
      values: {
        iso: 'ISO',
        utc: 'UTC',
      },
    }),
  },
};
