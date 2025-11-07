/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/server';

export const CLOUD_CONNECTED_FEATURE_ID = 'cloudConnect';
export const CLOUD_CONNECTED_APP_ID = 'cloud_connect';

export const cloudConnectedFeature: KibanaFeatureConfig = {
  id: CLOUD_CONNECTED_FEATURE_ID,
  name: i18n.translate('xpack.cloudConnect.feature.featureName', {
    defaultMessage: 'Cloud Connect',
  }),
  category: DEFAULT_APP_CATEGORIES.management,
  order: 9035,
  app: [CLOUD_CONNECTED_APP_ID, 'kibana'],
  catalogue: [CLOUD_CONNECTED_FEATURE_ID],
  management: {
    kibana: [CLOUD_CONNECTED_APP_ID],
  },
  privileges: {
    all: {
      app: [CLOUD_CONNECTED_APP_ID, 'kibana'],
      catalogue: [CLOUD_CONNECTED_FEATURE_ID],
      management: {
        kibana: [CLOUD_CONNECTED_APP_ID],
      },
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show', 'configure', 'connect'],
      api: [],
    },
    read: {
      app: [CLOUD_CONNECTED_APP_ID, 'kibana'],
      catalogue: [CLOUD_CONNECTED_FEATURE_ID],
      management: {
        kibana: [CLOUD_CONNECTED_APP_ID],
      },
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show'],
      api: [],
    },
  },
};
