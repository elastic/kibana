/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const WATCH_STATES: { [key: string]: string } = {
  INACTIVE: i18n.translate('xpack.watcher.constants.watchStates.inactiveStateText', {
    defaultMessage: 'Inactive',
  }),

  ACTIVE: i18n.translate('xpack.watcher.constants.watchStates.activeStateText', {
    defaultMessage: 'Active',
  }),

  ERROR: i18n.translate('xpack.watcher.constants.watchStates.errorStateText', {
    defaultMessage: 'Error',
  }),

  CONFIG_ERROR: i18n.translate('xpack.watcher.constants.watchStates.configErrorStateText', {
    defaultMessage: 'Config error',
  }),
};
