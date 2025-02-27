/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import {
  MAINTENANCE_WINDOW_FEATURE_ID,
  MAINTENANCE_WINDOW_API_PRIVILEGES,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
} from '../common';

export const maintenanceWindowFeature: KibanaFeatureConfig = {
  id: MAINTENANCE_WINDOW_FEATURE_ID,
  name: i18n.translate('xpack.alerting.feature.maintenanceWindowFeatureName', {
    defaultMessage: 'Maintenance Windows',
  }),
  category: DEFAULT_APP_CATEGORIES.management,
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: [],
  management: {
    insightsAndAlerting: ['maintenanceWindows'],
  },
  privileges: {
    all: {
      app: [],
      api: [
        MAINTENANCE_WINDOW_API_PRIVILEGES.READ_MAINTENANCE_WINDOW,
        MAINTENANCE_WINDOW_API_PRIVILEGES.WRITE_MAINTENANCE_WINDOW,
      ],
      management: {
        insightsAndAlerting: ['maintenanceWindows'],
      },
      savedObject: {
        all: [MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE],
        read: [],
      },
      ui: ['show', 'save'],
    },
    read: {
      app: [],
      api: [MAINTENANCE_WINDOW_API_PRIVILEGES.READ_MAINTENANCE_WINDOW],
      management: {
        insightsAndAlerting: ['maintenanceWindows'],
      },
      savedObject: {
        all: [],
        read: [MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE],
      },
      ui: ['show'],
    },
  },
};
