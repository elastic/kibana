/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { location } from '../../functions/browser/location';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof location>> = {
  help: i18n.translate('xpack.canvas.functions.locationHelpText', {
    defaultMessage:
      "Use the browser's location functionality to get your current location. " +
      'Usually quite slow, but fairly accurate',
  }),
  args: {},
};
