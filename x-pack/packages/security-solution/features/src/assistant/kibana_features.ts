/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { type BaseKibanaFeatureConfig } from '../types';
import { APP_ID, ASSISTANT_FEATURE_ID } from '../constants';

export const getAssistantBaseKibanaFeature = (): BaseKibanaFeatureConfig => ({
  id: ASSISTANT_FEATURE_ID,
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.linkSecuritySolutionAssistantTitle',
    {
      defaultMessage: 'Elastic AI Assistant',
    }
  ),
  order: 1100,
  category: DEFAULT_APP_CATEGORIES.security,
  app: [ASSISTANT_FEATURE_ID, 'kibana'],
  catalogue: [APP_ID],
  minimumLicense: 'enterprise',
  privileges: {
    all: {
      api: [],
      app: [ASSISTANT_FEATURE_ID, 'kibana'],
      catalogue: [APP_ID],
      savedObject: {
        all: [],
        read: [],
      },
      ui: [],
    },
    read: {
      // No read-only mode currently supported
      disabled: true,
      savedObject: {
        all: [],
        read: [],
      },
      ui: [],
    },
  },
});
