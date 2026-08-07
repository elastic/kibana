/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_MEMORY_FEATURE_ID, apiPrivileges, uiPrivileges } from '@kbn/agent-memory-common';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { i18n } from '@kbn/i18n';

export const registerFeatures = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: AGENT_MEMORY_FEATURE_ID,
    name: i18n.translate('xpack.agentMemory.feature.name', {
      defaultMessage: 'Agent memory',
    }),
    minimumLicense: 'enterprise',
    order: 1003,
    category: DEFAULT_APP_CATEGORIES.kibana,
    // Memory has no app of its own — it is surfaced by the Context app.
    app: [],
    catalogue: [],
    privileges: {
      all: {
        app: [],
        api: [apiPrivileges.readMemory, apiPrivileges.writeMemory],
        catalogue: [],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [uiPrivileges.show, uiPrivileges.manage],
      },
      read: {
        app: [],
        api: [apiPrivileges.readMemory],
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
