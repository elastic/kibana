/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/server';
import { APP_ID, NOTEBOOK_SAVED_OBJECT_TYPE, PLUGIN_ID, PLUGIN_NAME } from '../common/constants';

export const READ_NOTEBOOK_PRIVILEGE = 'read_notebook';
export const WRITE_NOTEBOOK_PRIVILEGE = 'write_notebook';

export const notebookFeature: KibanaFeatureConfig = {
  id: PLUGIN_ID,
  name: PLUGIN_NAME,
  order: 700,
  category: DEFAULT_APP_CATEGORIES.kibana,
  app: [APP_ID, 'kibana'],
  privileges: {
    all: {
      app: [APP_ID, 'kibana'],
      api: [READ_NOTEBOOK_PRIVILEGE, WRITE_NOTEBOOK_PRIVILEGE],
      savedObject: { all: [NOTEBOOK_SAVED_OBJECT_TYPE], read: [] },
      ui: ['show', 'save'],
    },
    read: {
      app: [APP_ID, 'kibana'],
      api: [READ_NOTEBOOK_PRIVILEGE],
      savedObject: { all: [], read: [NOTEBOOK_SAVED_OBJECT_TYPE] },
      ui: ['show'],
    },
  },
};
