/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { ApiPrivileges } from '@kbn/core-security-server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import {
  AGENTBUILDER_APP_ID,
  AGENTBUILDER_FEATURE_ID,
  AGENTBUILDER_FEATURE_NAME,
  uiPrivileges,
  apiPrivileges,
  subFeaturePrivilegeIds,
} from '../common/features';
import { AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE } from './saved_objects';

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
          apiPrivileges.writeAgentBuilder,
          ApiPrivileges.manage('llm_product_doc'),
        ],
        catalogue: [AGENTBUILDER_FEATURE_ID],
        // Every Agent Builder user needs to read the space-settings singleton
        // so the UI can resolve the space's assigned default agent (if any)
        // before it decides which agent to land on. Writes are gated on the
        // `manageAgents` sub-feature below.
        savedObject: {
          all: [],
          read: [AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE],
        },
        ui: [uiPrivileges.show, uiPrivileges.write],
      },
      read: {
        app: ['kibana', AGENTBUILDER_APP_ID],
        api: [apiPrivileges.readAgentBuilder],
        catalogue: [AGENTBUILDER_FEATURE_ID],
        savedObject: {
          all: [],
          read: [AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE],
        },
        ui: [uiPrivileges.show],
      },
    },
    subFeatures: [
      {
        name: i18n.translate('xpack.agentBuilder.featureRegistry.subFeatures.management', {
          defaultMessage: 'Management',
        }),
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: subFeaturePrivilegeIds.manageAgents,
                name: i18n.translate(
                  'xpack.agentBuilder.featureRegistry.subFeatures.manageAgents.privilege',
                  { defaultMessage: 'Create and edit agents' }
                ),
                includeIn: 'all',
                api: [apiPrivileges.manageAgents],
                // Writing the per-space default-agent assignment is an
                // administrative action, so it is bundled with the agent
                // management privilege rather than the base read privilege.
                savedObject: {
                  all: [AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE],
                  read: [],
                },
                ui: [uiPrivileges.manageAgents],
              },
              {
                id: subFeaturePrivilegeIds.manageTools,
                name: i18n.translate(
                  'xpack.agentBuilder.featureRegistry.subFeatures.manageTools.privilege',
                  { defaultMessage: 'Create and edit custom tools' }
                ),
                includeIn: 'all',
                api: [apiPrivileges.manageTools],
                savedObject: { all: [], read: [] },
                ui: [uiPrivileges.manageTools],
              },
              {
                id: subFeaturePrivilegeIds.manageSkills,
                name: i18n.translate(
                  'xpack.agentBuilder.featureRegistry.subFeatures.manageSkills.privilege',
                  { defaultMessage: 'Create and edit skills' }
                ),
                includeIn: 'all',
                api: [apiPrivileges.manageSkills],
                savedObject: { all: [], read: [] },
                ui: [uiPrivileges.manageSkills],
              },
            ],
          },
        ],
      },
    ],
  });
};
