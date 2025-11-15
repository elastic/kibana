/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/server';
import { PLUGIN_NAME } from '../common';

export const CLOUD_CONNECTED_FEATURE_ID = 'cloudConnect';
export const CLOUD_CONNECTED_APP_ID = 'cloud_connect';

export const cloudConnectedFeature: KibanaFeatureConfig = {
  id: CLOUD_CONNECTED_FEATURE_ID,
  name: PLUGIN_NAME,
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
