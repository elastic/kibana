/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { i18n } from '@kbn/i18n';
import { AGENTIC_INVESTIGATIONS_PLUGIN_ID } from '../common/constants';
import {
  PROPOSALS_UI_CAPABILITY_DECIDE,
  PROPOSALS_UI_CAPABILITY_SHOW,
} from '../common/proposals/constants';
import {
  INCIDENTS_UI_CAPABILITY_MANAGE,
  INCIDENTS_UI_CAPABILITY_SHOW,
} from '../common/incidents/constants';
import {
  PROPOSALS_API_PRIVILEGE_MANAGE,
  PROPOSALS_API_PRIVILEGE_READ,
} from './proposals/constants';
import {
  INCIDENTS_API_PRIVILEGE_MANAGE,
  INCIDENTS_API_PRIVILEGE_READ,
} from './incidents/constants';

export const registerFeatures = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: AGENTIC_INVESTIGATIONS_PLUGIN_ID,
    // Named for proposals alone because action proposals move to their own
    // plugin in a follow-up; until then this feature grants only proposals.
    name: i18n.translate('xpack.agenticInvestigations.featureName', {
      defaultMessage: 'Proposed Actions',
    }),
    minimumLicense: 'enterprise',
    // Sits just after Workflows (3000), whose platform it builds on, and after
    // Agent Builder (1000). The category drives placement in the Roles and
    // Spaces feature pickers; `app` stays empty because this plugin
    // contributes no navigation of its own.
    order: 3100,
    category: DEFAULT_APP_CATEGORIES.kibana,
    app: [],
    privileges: {
      all: {
        app: [],
        api: [PROPOSALS_API_PRIVILEGE_READ, PROPOSALS_API_PRIVILEGE_MANAGE],
        savedObject: { all: [], read: [] },
        ui: [PROPOSALS_UI_CAPABILITY_SHOW, PROPOSALS_UI_CAPABILITY_DECIDE],
      },
      read: {
        app: [],
        api: [PROPOSALS_API_PRIVILEGE_READ],
        savedObject: { all: [], read: [] },
        ui: [PROPOSALS_UI_CAPABILITY_SHOW],
      },
    },
    // Note: adding the first sub-feature means minimal_all and minimal_read stop
    // being equivalent to all and read — until now (README.md:42) stated they were
    // because no sub-feature privileges existed. Update README accordingly.
    subFeatures: [
      {
        name: i18n.translate('xpack.agenticInvestigations.incidentsSubFeatureName', {
          defaultMessage: 'Incidents',
        }),
        privilegeGroups: [
          {
            // `mutually_exclusive`: a user gets exactly one of these. The more permissive
            // privilege (`incidents_all`) must come first. `incidents_all` includes both
            // read and manage API privileges so that an `all` user can list incidents
            // without needing a separate explicit read grant.
            groupType: 'mutually_exclusive',
            privileges: [
              {
                id: 'incidents_all',
                name: i18n.translate('xpack.agenticInvestigations.incidentsAllPrivilegeName', {
                  defaultMessage: 'Create, update, and view incidents',
                }),
                includeIn: 'all',
                api: [INCIDENTS_API_PRIVILEGE_READ, INCIDENTS_API_PRIVILEGE_MANAGE],
                savedObject: { all: [], read: [] },
                ui: [INCIDENTS_UI_CAPABILITY_SHOW, INCIDENTS_UI_CAPABILITY_MANAGE],
              },
              {
                id: 'incidents_read',
                name: i18n.translate('xpack.agenticInvestigations.incidentsReadPrivilegeName', {
                  defaultMessage: 'View incidents',
                }),
                includeIn: 'read',
                api: [INCIDENTS_API_PRIVILEGE_READ],
                savedObject: { all: [], read: [] },
                ui: [INCIDENTS_UI_CAPABILITY_SHOW],
              },
            ],
          },
        ],
      },
    ],
  });
};
