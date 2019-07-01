/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { clear } from '../../functions/common/clear';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof clear>> = {
  help: i18n.translate('xpack.canvas.functions.clearHelpText', {
    defaultMessage: 'Clears context and returns null',
  }),
  args: {},
};
