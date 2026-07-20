/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { CONTEXT_ENGINE_FEATURE_ID, apiPrivileges } from '../common/features';

export const registerFeatures = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: CONTEXT_ENGINE_FEATURE_ID,
    name: i18n.translate('xpack.contextEngine.feature.name', {
      defaultMessage: 'Context Engine',
    }),
    minimumLicense: 'enterprise',
    order: 1002,
    category: DEFAULT_APP_CATEGORIES.kibana,
    app: [],
    catalogue: [],
    privileges: {
      all: {
        app: [],
        api: [apiPrivileges.readContextEngine, apiPrivileges.writeContextEngine],
        catalogue: [],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
      read: {
        app: [],
        api: [apiPrivileges.readContextEngine],
        catalogue: [],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
    },
  });
};
