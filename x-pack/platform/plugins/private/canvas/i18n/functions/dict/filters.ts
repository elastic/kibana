/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { filtersFunctionFactory } from '../../../public/functions/filters';
import type { FunctionHelp } from '../function_help';
import type { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<ReturnType<typeof filtersFunctionFactory>>> = {
  help: i18n.translate('xpack.canvas.functions.filtersHelpText', {
    defaultMessage:
      'Aggregates element filters from the workpad for use elsewhere, usually a data source. {FILTER_FN} is deprecated and will be removed in a future release. Use {REPLACEMENT} instead.',
    values: {
      FILTER_FN: '`filters`',
      REPLACEMENT: '`kibana | selectFilter`',
    },
  }),
  args: {
    group: i18n.translate('xpack.canvas.functions.filters.args.group', {
      defaultMessage: 'The name of the filter group to use.',
    }),
    ungrouped: i18n.translate('xpack.canvas.functions.filters.args.ungrouped', {
      defaultMessage: 'Exclude filters that belong to a filter group?',
    }),
  },
};
