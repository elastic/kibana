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
    id: 'The id of the saved search object',
  },
};
