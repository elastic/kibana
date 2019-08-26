/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { savedSearch } from '../../functions/common/saved_search';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof savedSearch>> = {
  help: i18n.translate('xpack.canvas.functions.savedSearchHelpText', {
    defaultMessage: `Returns an embeddable for a saved search object`,
  }),
  args: {
    id: i18n.translate('xpack.canvas.functions.savedSearch.args.idHelpText', {
      defaultMessage: `The id of the saved search object`,
    }),
    columns: i18n.translate('xpack.canvas.functions.savedSearch.args.columnsHelpText', {
      defaultMessage: `The names of the columns to include in the search`,
    }),
    sort: i18n.translate('xpack.canvas.functions.savedSearch.args.sortHelpText', {
      defaultMessage: `The columns and directions to sort by`,
    }),
    title: i18n.translate('xpack.canvas.functions.savedSearch.args.titleHelpText', {
      defaultMessage: `The title for the displayed panel`,
    }),
  },
};
