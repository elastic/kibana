/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { searchSort } from '../../functions/common/search_sort';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof searchSort>> = {
  help: i18n.translate('xpack.canvas.functions.searchSortHelpText', {
    defaultMessage: `Returns a column and sort direction`,
  }),
  args: {
    column: i18n.translate('xpack.canvas.functions.searchSort.args.columnHelpText', {
      defaultMessage: `The name of the column on which to sort`,
    }),
    direction: i18n.translate('xpack.canvas.functions.searchSort.args.directionHelpText', {
      defaultMessage: `The direction of the sort`,
    }),
  },
};
