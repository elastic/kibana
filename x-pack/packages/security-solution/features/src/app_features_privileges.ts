/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ID } from './constants';
import { AppFeatureKey } from './app_features_keys';

export const AppFeaturesPrivileges = {
  [AppFeatureKey.rulesTest]: {
    all: {
      ui: ['showRules', 'crudRules'],
      api: [`${APP_ID}-showRules`, `${APP_ID}-crudRules`],
    },
    read: {
      ui: ['showRules'],
      api: [`${APP_ID}-showRules`],
    },
  },
  [AppFeatureKey.endpointExceptions]: {
    all: {
      ui: ['showEndpointExceptions', 'crudEndpointExceptions'],
      api: [`${APP_ID}-showEndpointExceptions`, `${APP_ID}-crudEndpointExceptions`],
    },
    read: {
      ui: ['showEndpointExceptions'],
      api: [`${APP_ID}-showEndpointExceptions`],
    },
  },
};
