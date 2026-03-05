/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { ANONYMIZATION_FEATURE_ID, apiPrivileges, uiPrivileges } from '../common';

export const registerFeatures = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: ANONYMIZATION_FEATURE_ID,
    name: i18n.translate('xpack.anonymization.featureName', {
      defaultMessage: 'AI Anonymization',
    }),
    minimumLicense: 'enterprise',
    order: 1100,
    category: DEFAULT_APP_CATEGORIES.management,
    app: [],
    catalogue: [],
    management: {
      kibana: [ANONYMIZATION_FEATURE_ID],
    },
    privileges: {
      all: {
        api: [apiPrivileges.readAnonymization, apiPrivileges.manageAnonymization],
        management: {
          kibana: [ANONYMIZATION_FEATURE_ID],
        },
        catalogue: [],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [uiPrivileges.show, uiPrivileges.manage],
      },
      read: {
        api: [apiPrivileges.readAnonymization],
        management: {
          kibana: [ANONYMIZATION_FEATURE_ID],
        },
        catalogue: [],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [uiPrivileges.show],
      },
    },
  });
};
