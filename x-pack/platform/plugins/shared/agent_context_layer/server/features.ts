/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import {
  AGENT_CONTEXT_LAYER_APP_ID,
  AGENT_CONTEXT_LAYER_FEATURE_ID,
  apiPrivileges,
  uiCapabilities,
} from '../common/features';

export const registerFeatures = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: AGENT_CONTEXT_LAYER_FEATURE_ID,
    name: i18n.translate('xpack.agentContextLayer.feature.name', {
      defaultMessage: 'Agent Context Layer',
    }),
    minimumLicense: 'enterprise',
    order: 1001,
    category: DEFAULT_APP_CATEGORIES.management,
    // The admin UI lives under Stack Management → AI. Listing the app id
    // here (and in each privilege below) is what surfaces the entry in the
    // management sidebar for users granted the relevant privilege.
    app: [AGENT_CONTEXT_LAYER_APP_ID],
    catalogue: [AGENT_CONTEXT_LAYER_APP_ID],
    management: { ai: [AGENT_CONTEXT_LAYER_APP_ID] },
    privileges: {
      all: {
        app: [AGENT_CONTEXT_LAYER_APP_ID],
        api: [apiPrivileges.readAgentContextLayer, apiPrivileges.writeAgentContextLayer],
        catalogue: [AGENT_CONTEXT_LAYER_APP_ID],
        // The base privileges grant API access to read/write SML data; the
        // management page itself is gated by the independent
        // `manage_system_workflows` sub-feature privilege below.
        management: { ai: [] },
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
      read: {
        app: [AGENT_CONTEXT_LAYER_APP_ID],
        api: [apiPrivileges.readAgentContextLayer],
        catalogue: [AGENT_CONTEXT_LAYER_APP_ID],
        management: { ai: [] },
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
    },
    subFeatures: [
      {
        name: i18n.translate('xpack.agentContextLayer.feature.subFeatureName.manageSystem', {
          defaultMessage: 'System workflows',
        }),
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'manage_system_workflows',
                name: i18n.translate(
                  'xpack.agentContextLayer.feature.subFeature.manageSystemWorkflows',
                  {
                    defaultMessage: 'Manage system workflows',
                  }
                ),
                // Not granted by default in `all`; operators must explicitly
                // assign this sub-feature because it implicitly runs
                // workflows as the Kibana service account. Granting this
                // privilege also unlocks the Stack Management → AI entry
                // for the management page.
                includeIn: 'none',
                savedObject: { all: [], read: [] },
                api: [apiPrivileges.manageSystemWorkflows],
                management: { ai: [AGENT_CONTEXT_LAYER_APP_ID] },
                ui: [uiCapabilities.manageSystemWorkflows],
              },
            ],
          },
        ],
      },
    ],
  });
};
