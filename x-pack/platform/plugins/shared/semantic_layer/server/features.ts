/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { SEMANTIC_LAYER_FEATURE_ID, apiPrivileges } from '../common/features';

export const registerFeatures = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: SEMANTIC_LAYER_FEATURE_ID,
    name: 'Semantic Layer',
    minimumLicense: 'enterprise',
    order: 1001,
    category: DEFAULT_APP_CATEGORIES.kibana,
    app: [],
    catalogue: [],
    privileges: {
      all: {
        app: [],
        api: [apiPrivileges.readSemanticLayer],
        catalogue: [],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
      read: {
        app: [],
        api: [apiPrivileges.readSemanticLayer],
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
