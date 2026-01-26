/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { ApiPrivileges } from '@kbn/core-security-server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import {
  AGENTBUILDER_APP_ID,
  AGENTBUILDER_FEATURE_ID,
  AGENTBUILDER_FEATURE_NAME,
  uiPrivileges,
  apiPrivileges,
} from '../common/features';

export const registerFeatures = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: AGENTBUILDER_FEATURE_ID,
    name: AGENTBUILDER_FEATURE_NAME,
    minimumLicense: 'enterprise',
    order: 1000,
    category: DEFAULT_APP_CATEGORIES.kibana,
    app: ['kibana', AGENTBUILDER_APP_ID],
    catalogue: [AGENTBUILDER_FEATURE_ID],
    privileges: {
      all: {
        app: ['kibana', AGENTBUILDER_APP_ID],
        api: [
          apiPrivileges.readAgentBuilder,
          apiPrivileges.manageAgentBuilder,
          ApiPrivileges.manage('llm_product_doc'),
        ],
        catalogue: [AGENTBUILDER_FEATURE_ID],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [
          uiPrivileges.show,
          uiPrivileges.showManagement,
          uiPrivileges.manageTools,
          uiPrivileges.manageAgents,
        ],
      },
      read: {
        app: ['kibana', AGENTBUILDER_APP_ID],
        api: [apiPrivileges.readAgentBuilder],
        catalogue: [AGENTBUILDER_FEATURE_ID],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [uiPrivileges.show],
      },
    },
  });
};
