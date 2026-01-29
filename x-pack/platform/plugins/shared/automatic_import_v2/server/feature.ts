/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { i18n } from '@kbn/i18n';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import {
  INTEGRATION_SAVED_OBJECT_TYPE,
  DATA_STREAM_SAVED_OBJECT_TYPE,
} from './services/saved_objects';

export const AUTOMATIC_IMPORT_API_PRIVILEGES = {
  READ: 'read_automatic_import',
  MANAGE: 'manage_automatic_import',
};

export const AUTOMATIC_IMPORT_FEATURE: KibanaFeatureConfig = {
  id: 'automatic_import',
  name: i18n.translate('xpack.automatic_import.featureRegistry.automaticImportFeatureName', {
    defaultMessage: 'Automatic Import',
  }),
  category: DEFAULT_APP_CATEGORIES.management,
  app: [],
  privileges: {
    all: {
      app: [],
      api: [AUTOMATIC_IMPORT_API_PRIVILEGES.READ, AUTOMATIC_IMPORT_API_PRIVILEGES.MANAGE],
      catalogue: [],
      savedObject: {
        all: [INTEGRATION_SAVED_OBJECT_TYPE, DATA_STREAM_SAVED_OBJECT_TYPE],
        read: [],
      },
      ui: ['view', 'approve', 'delete', 'create', 'edit', 'stop'],
    },
    read: {
      app: [],
      api: [AUTOMATIC_IMPORT_API_PRIVILEGES.READ],
      catalogue: [],
      ui: ['view'],
      savedObject: {
        all: [],
        read: [INTEGRATION_SAVED_OBJECT_TYPE, DATA_STREAM_SAVED_OBJECT_TYPE],
      },
    },
  },
};
