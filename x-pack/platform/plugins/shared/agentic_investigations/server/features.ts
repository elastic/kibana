/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { i18n } from '@kbn/i18n';
import { AGENTIC_INVESTIGATIONS_PLUGIN_ID, ESCALATIONS_FEATURE_ID } from '../common/constants';
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
    id: ESCALATIONS_FEATURE_ID,
    name: i18n.translate('xpack.agenticInvestigations.escalationsFeatureName', {
      defaultMessage: 'Escalations',
    }),
    minimumLicense: 'enterprise',
    order: 3111,
    category: DEFAULT_APP_CATEGORIES.kibana,
    app: [],
    privileges: {
      all: {
        app: [],
        api: [ESCALATIONS_API_PRIVILEGE_READ, ESCALATIONS_API_PRIVILEGE_MANAGE],
        savedObject: { all: [], read: [] },
        ui: [ESCALATIONS_UI_CAPABILITY_SHOW, ESCALATIONS_UI_CAPABILITY_MANAGE],
      },
      read: {
        app: [],
        api: [ESCALATIONS_API_PRIVILEGE_READ],
        savedObject: { all: [], read: [] },
        ui: [ESCALATIONS_UI_CAPABILITY_SHOW],
      },
    },
  });

  features.registerKibanaFeature({
    id: AGENTIC_INVESTIGATIONS_PLUGIN_ID,
    name: i18n.translate('xpack.agenticInvestigations.featureName', {
      defaultMessage: 'Agentic Investigations',
    }),
    minimumLicense: 'enterprise',
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
