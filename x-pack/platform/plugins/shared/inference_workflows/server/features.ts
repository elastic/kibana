/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import {
  ANONYMIZATION_SETTINGS_FEATURE_ID,
  anonymizationApiPrivileges,
  anonymizationUiPrivileges,
} from '../common/anonymization_features';

export const registerAnonymizationFeature = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: ANONYMIZATION_SETTINGS_FEATURE_ID,
    name: i18n.translate('xpack.inferenceWorkflows.anonymizationFeatureName', {
      defaultMessage: 'AI Anonymization Settings',
    }),
    minimumLicense: 'enterprise',
    order: 1150,
    category: DEFAULT_APP_CATEGORIES.management,
    app: [],
    catalogue: [],
    management: {
      kibana: ['genAiSettings'],
    },
    privileges: {
      all: {
        api: [anonymizationApiPrivileges.read, anonymizationApiPrivileges.manage],
        management: {
          kibana: ['genAiSettings'],
        },
        catalogue: [],
        savedObject: { all: [], read: [] },
        ui: [anonymizationUiPrivileges.show, anonymizationUiPrivileges.manage],
      },
      read: {
        api: [anonymizationApiPrivileges.read],
        management: {
          kibana: ['genAiSettings'],
        },
        catalogue: [],
        savedObject: { all: [], read: [] },
        ui: [anonymizationUiPrivileges.show],
      },
    },
  });
};
