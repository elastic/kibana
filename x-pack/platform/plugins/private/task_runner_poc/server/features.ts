/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { API_PRIVILEGES, PLUGIN_ID, PLUGIN_NAME } from '../common';

/** `read` can list jobs, tasks, and output; `all` can also create and delete jobs. */
export const registerFeature = (features: FeaturesPluginSetup) => {
  features.registerKibanaFeature({
    id: PLUGIN_ID,
    name: PLUGIN_NAME,
    category: DEFAULT_APP_CATEGORIES.management,
    app: [PLUGIN_ID],
    privileges: {
      all: {
        app: [PLUGIN_ID],
        api: [API_PRIVILEGES.read, API_PRIVILEGES.manage],
        savedObject: { all: [], read: [] },
        ui: ['show', 'write'],
      },
      read: {
        app: [PLUGIN_ID],
        api: [API_PRIVILEGES.read],
        savedObject: { all: [], read: [] },
        ui: ['show'],
      },
    },
  });
};
