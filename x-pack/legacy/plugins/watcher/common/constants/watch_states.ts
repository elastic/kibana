/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const WATCH_STATES: { [key: string]: string } = {
  DISABLED: i18n.translate('xpack.watcher.constants.watchStates.disabledStateText', {
    defaultMessage: 'Disabled',
  }),

  OK: i18n.translate('xpack.watcher.constants.watchStates.okStateText', {
    defaultMessage: 'OK',
  }),

  FIRING: i18n.translate('xpack.watcher.constants.watchStates.firingStateText', {
    defaultMessage: 'Firing',
  }),

  ERROR: i18n.translate('xpack.watcher.constants.watchStates.errorStateText', {
    defaultMessage: 'Error',
  }),

  CONFIG_ERROR: i18n.translate('xpack.watcher.constants.watchStates.configErrorStateText', {
    defaultMessage: 'Config error',
  }),
};
