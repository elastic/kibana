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
  ESCALATIONS_UI_CAPABILITY_MANAGE,
  ESCALATIONS_UI_CAPABILITY_SHOW,
} from '../common/escalations/constants';
import {
  PROPOSALS_API_PRIVILEGE_MANAGE,
  PROPOSALS_API_PRIVILEGE_READ,
} from './proposals/constants';
import {
  ESCALATIONS_API_PRIVILEGE_MANAGE,
  ESCALATIONS_API_PRIVILEGE_READ,
} from './escalations/constants';
import {
  INVESTIGATIONS_API_PRIVILEGE_MANAGE,
  INVESTIGATIONS_API_PRIVILEGE_READ,
} from './investigations/constants';
import {
  INVESTIGATIONS_UI_CAPABILITY_MANAGE,
  INVESTIGATIONS_UI_CAPABILITY_SHOW,
} from '../common/investigations/constants';

export const registerFeatures = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: AGENTIC_INVESTIGATIONS_PLUGIN_ID,
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
    subFeatures: [
      {
        name: i18n.translate('xpack.agenticInvestigations.investigationsSubFeatureName', {
          defaultMessage: 'Investigations',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                id: 'investigations_all',
                name: i18n.translate('xpack.agenticInvestigations.investigationsAllPrivilegeName', {
                  defaultMessage: 'Update and view investigations',
                }),
                includeIn: 'all',
                api: [INVESTIGATIONS_API_PRIVILEGE_READ, INVESTIGATIONS_API_PRIVILEGE_MANAGE],
                savedObject: { all: [], read: [] },
                ui: [INVESTIGATIONS_UI_CAPABILITY_SHOW, INVESTIGATIONS_UI_CAPABILITY_MANAGE],
              },
              {
                id: 'investigations_read',
                name: i18n.translate(
                  'xpack.agenticInvestigations.investigationsReadPrivilegeName',
                  {
                    defaultMessage: 'View investigations',
                  }
                ),
                includeIn: 'read',
                api: [INVESTIGATIONS_API_PRIVILEGE_READ],
                savedObject: { all: [], read: [] },
                ui: [INVESTIGATIONS_UI_CAPABILITY_SHOW],
              },
            ],
          },
        ],
      },
      {
        name: i18n.translate('xpack.agenticInvestigations.escalationsSubFeatureName', {
          defaultMessage: 'Escalations',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                id: 'escalations_all',
                name: i18n.translate('xpack.agenticInvestigations.escalationsAllPrivilegeName', {
                  defaultMessage: 'Create, update, and view escalations',
                }),
                includeIn: 'all',
                api: [ESCALATIONS_API_PRIVILEGE_READ, ESCALATIONS_API_PRIVILEGE_MANAGE],
                savedObject: { all: [], read: [] },
                ui: [ESCALATIONS_UI_CAPABILITY_SHOW, ESCALATIONS_UI_CAPABILITY_MANAGE],
              },
              {
                id: 'escalations_read',
                name: i18n.translate('xpack.agenticInvestigations.escalationsReadPrivilegeName', {
                  defaultMessage: 'View escalations',
                }),
                includeIn: 'read',
                api: [ESCALATIONS_API_PRIVILEGE_READ],
                savedObject: { all: [], read: [] },
                ui: [ESCALATIONS_UI_CAPABILITY_SHOW],
              },
            ],
          },
        ],
      },
    ],
  });
};
