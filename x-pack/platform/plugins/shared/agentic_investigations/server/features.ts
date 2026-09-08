/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { i18n } from '@kbn/i18n';
import {
  AGENTIC_INVESTIGATIONS_PLUGIN_ID,
  AGENTIC_INVESTIGATIONS_PLUGIN_NAME,
} from '../common/constants';
import {
  PROPOSALS_SUB_FEATURE_PRIVILEGE_ALL,
  PROPOSALS_SUB_FEATURE_PRIVILEGE_READ,
  PROPOSALS_UI_CAPABILITY_DECIDE,
  PROPOSALS_UI_CAPABILITY_SHOW,
} from '../common/proposals/constants';
import {
  PROPOSALS_API_PRIVILEGE_MANAGE,
  PROPOSALS_API_PRIVILEGE_READ,
} from './proposals/constants';

/**
 * Proposals capabilities. `includeIn` grants these through the top-level
 * privileges, so a role with `all` or `read` on the feature needs no extra
 * selection; `minimal_all` / `minimal_read` deliberately exclude them.
 */
const proposalsSubFeature: SubFeatureConfig = {
  name: i18n.translate('xpack.agenticInvestigations.features.proposals.name', {
    defaultMessage: 'Proposals',
  }),
  privilegeGroups: [
    {
      // All/Read pairs are mutually exclusive, declared most permissive first.
      groupType: 'mutually_exclusive',
      privileges: [
        {
          id: PROPOSALS_SUB_FEATURE_PRIVILEGE_ALL,
          name: i18n.translate('xpack.agenticInvestigations.features.proposals.all', {
            defaultMessage: 'All',
          }),
          includeIn: 'all',
          api: [PROPOSALS_API_PRIVILEGE_READ, PROPOSALS_API_PRIVILEGE_MANAGE],
          savedObject: { all: [], read: [] },
          ui: [PROPOSALS_UI_CAPABILITY_SHOW, PROPOSALS_UI_CAPABILITY_DECIDE],
        },
        {
          id: PROPOSALS_SUB_FEATURE_PRIVILEGE_READ,
          name: i18n.translate('xpack.agenticInvestigations.features.proposals.read', {
            defaultMessage: 'Read',
          }),
          includeIn: 'read',
          api: [PROPOSALS_API_PRIVILEGE_READ],
          savedObject: { all: [], read: [] },
          ui: [PROPOSALS_UI_CAPABILITY_SHOW],
        },
      ],
    },
  ],
};

export const registerFeatures = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: AGENTIC_INVESTIGATIONS_PLUGIN_ID,
    name: AGENTIC_INVESTIGATIONS_PLUGIN_NAME,
    minimumLicense: 'enterprise',
    // Sits just after Workflows (3000), whose platform it builds on, and after
    // Agent Builder (1000). The category drives placement in the Roles and
    // Spaces feature pickers; `app` stays empty because this plugin
    // contributes no navigation of its own.
    order: 3100,
    category: DEFAULT_APP_CATEGORIES.kibana,
    app: [],
    // Umbrella shell: every capability lives in an entity sub-feature, so
    // adding investigations or incidents does not touch this block.
    privileges: {
      all: { app: [], api: [], savedObject: { all: [], read: [] }, ui: [] },
      read: { app: [], api: [], savedObject: { all: [], read: [] }, ui: [] },
    },
    subFeatures: [proposalsSubFeature],
  });
};
