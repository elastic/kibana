/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { CUSTOM_APP_FEATURE_ID, CUSTOM_APP_SAVED_OBJECT_TYPE } from '../common/constants';

/**
 * The privileges of saved apps. Reading one is not a privilege to run what it does: a button in an
 * app runs with the privileges of the person who clicks it, which are their own.
 */
export const customAppFeature: KibanaFeatureConfig = {
  id: CUSTOM_APP_FEATURE_ID,
  name: i18n.translate('xpack.customApp.feature.name', { defaultMessage: 'Custom apps' }),
  order: 750,
  category: DEFAULT_APP_CATEGORIES.kibana,
  app: [],
  privileges: {
    all: {
      app: [],
      savedObject: { all: [CUSTOM_APP_SAVED_OBJECT_TYPE], read: [] },
      ui: ['save', 'show'],
    },
    read: {
      app: [],
      savedObject: { all: [], read: [CUSTOM_APP_SAVED_OBJECT_TYPE] },
      ui: ['show'],
    },
  },
};
