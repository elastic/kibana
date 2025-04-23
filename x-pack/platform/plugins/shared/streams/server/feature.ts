/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONTENT_PACKS_FEATURE_ID,
  CONTENT_PACKS_FEATURE_PRIVILEGES,
} from '@kbn/content-packs-schema';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';

export const contentPacksFeature: KibanaFeatureConfig = {
  id: CONTENT_PACKS_FEATURE_ID,
  name: i18n.translate('xpack.streams.contentPacksFeatureName', {
    defaultMessage: 'Content packs',
  }),
  category: DEFAULT_APP_CATEGORIES.management,
  app: [],
  privileges: {
    all: {
      api: [CONTENT_PACKS_FEATURE_PRIVILEGES.manage],
      ui: [CONTENT_PACKS_FEATURE_PRIVILEGES.manage],
      savedObject: {
        all: [],
        read: [],
      },
    },
    read: {
      api: [],
      ui: [],
      savedObject: {
        all: [],
        read: [],
      },
    },
  },
};
