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
  ESCALATIONS_UI_CAPABILITY_MANAGE,
  ESCALATIONS_UI_CAPABILITY_SHOW,
} from '../common/escalations/constants';
import {
  INVESTIGATIONS_UI_CAPABILITY_MANAGE,
  INVESTIGATIONS_UI_CAPABILITY_SHOW,
} from '../common/investigations/constants';
import {
  ESCALATIONS_API_PRIVILEGE_MANAGE,
  ESCALATIONS_API_PRIVILEGE_READ,
} from './escalations/constants';
import { INVESTIGATIONS_API_PRIVILEGE_MANAGE } from './investigations/constants';

export const registerFeatures = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: AGENTIC_INVESTIGATIONS_PLUGIN_ID,
    name: i18n.translate('xpack.agenticInvestigations.featureName', {
      defaultMessage: 'Agentic Investigations',
    }),
    minimumLicense: 'enterprise',
    // Sits just after Proposed Actions (3100), whose records these entities
    // reference, and after Workflows (3000) and Agent Builder (1000). The
    // category drives placement in the Roles and Spaces feature pickers; `app`
    // stays empty because this plugin contributes no navigation of its own.
    order: 3110,
    category: DEFAULT_APP_CATEGORIES.kibana,
    app: [],
    privileges: {
      all: {
        app: [],
        // Impact has no privilege of its own yet. Reads and writes use the
        // investigations sub-feature below, which `includeIn: 'all'` joins here.
        api: [],
        savedObject: { all: [], read: [] },
        ui: [],
      },
      read: {
        app: [],
        api: [],
        savedObject: { all: [], read: [] },
        ui: [],
      },
    },
    subFeatures: [
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
                includeIn: 'none',
                api: [ESCALATIONS_API_PRIVILEGE_READ, ESCALATIONS_API_PRIVILEGE_MANAGE],
                savedObject: { all: [], read: [] },
                ui: [ESCALATIONS_UI_CAPABILITY_SHOW, ESCALATIONS_UI_CAPABILITY_MANAGE],
              },
              {
                id: 'escalations_read',
                name: i18n.translate('xpack.agenticInvestigations.escalationsReadPrivilegeName', {
                  defaultMessage: 'View escalations',
                }),
                includeIn: 'none',
                api: [ESCALATIONS_API_PRIVILEGE_READ],
                savedObject: { all: [], read: [] },
                ui: [ESCALATIONS_UI_CAPABILITY_SHOW],
              },
            ],
          },
        ],
      },
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
                  defaultMessage: 'Manage investigations',
                }),
                includeIn: 'all',
                api: [INVESTIGATIONS_API_PRIVILEGE_MANAGE],
                savedObject: { all: [], read: [] },
                ui: [INVESTIGATIONS_UI_CAPABILITY_SHOW, INVESTIGATIONS_UI_CAPABILITY_MANAGE],
              },
            ],
          },
        ],
      },
    ],
  });
};
