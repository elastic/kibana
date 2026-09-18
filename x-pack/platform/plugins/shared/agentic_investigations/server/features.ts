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
import { IMPACT_UI_CAPABILITY_MANAGE, IMPACT_UI_CAPABILITY_SHOW } from '../common/impact/constants';
import {
  PROPOSALS_UI_CAPABILITY_DECIDE,
  PROPOSALS_UI_CAPABILITY_SHOW,
} from '../common/proposals/constants';
import { IMPACT_API_PRIVILEGE_MANAGE, IMPACT_API_PRIVILEGE_READ } from './impact/constants';
import {
  PROPOSALS_API_PRIVILEGE_MANAGE,
  PROPOSALS_API_PRIVILEGE_READ,
} from './proposals/constants';

export const registerFeatures = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: AGENTIC_INVESTIGATIONS_PLUGIN_ID,
    // Named for proposals because action proposals move to their own plugin
    // in a follow-up; Impact is grantable on its own via the sub-feature below.
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
        name: i18n.translate('xpack.agenticInvestigations.impactSubFeatureName', {
          defaultMessage: 'Impact',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                id: 'impact_all',
                name: i18n.translate('xpack.agenticInvestigations.impactSubFeatureAll', {
                  defaultMessage: 'All',
                }),
                includeIn: 'all',
                api: [IMPACT_API_PRIVILEGE_READ, IMPACT_API_PRIVILEGE_MANAGE],
                savedObject: { all: [], read: [] },
                ui: [IMPACT_UI_CAPABILITY_SHOW, IMPACT_UI_CAPABILITY_MANAGE],
              },
              {
                id: 'impact_read',
                name: i18n.translate('xpack.agenticInvestigations.impactSubFeatureRead', {
                  defaultMessage: 'Read',
                }),
                includeIn: 'read',
                api: [IMPACT_API_PRIVILEGE_READ],
                savedObject: { all: [], read: [] },
                ui: [IMPACT_UI_CAPABILITY_SHOW],
              },
            ],
          },
        ],
      },
    ],
  });
};
