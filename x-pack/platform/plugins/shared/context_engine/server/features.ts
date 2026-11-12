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
  CONTEXT_ENGINE_APP_ID,
  CONTEXT_ENGINE_FEATURE_ID,
  apiPrivileges,
  uiPrivileges,
} from '../common/features';

export const registerFeatures = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: CONTEXT_ENGINE_FEATURE_ID,
    name: i18n.translate('xpack.contextEngine.feature.name', {
      defaultMessage: 'Context Engine',
    }),
    minimumLicense: 'enterprise',
    order: 1002,
    category: DEFAULT_APP_CATEGORIES.kibana,
    app: [CONTEXT_ENGINE_APP_ID],
    catalogue: [],
    privileges: {
      all: {
        app: [CONTEXT_ENGINE_APP_ID],
        api: [apiPrivileges.readContextEngine, apiPrivileges.writeContextEngine],
        catalogue: [],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [uiPrivileges.show, uiPrivileges.write],
      },
      read: {
        app: [CONTEXT_ENGINE_APP_ID],
        api: [apiPrivileges.readContextEngine],
        catalogue: [],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [uiPrivileges.show],
      },
    },
    subFeatures: [
      {
        name: i18n.translate('xpack.contextEngine.featureRegistry.subFeatures.memory', {
          defaultMessage: 'Memory',
        }),
        description: i18n.translate(
          'xpack.contextEngine.featureRegistry.subFeatures.memoryDescription',
          {
            defaultMessage:
              'Required for every memory API (remember, save event, forget). Lets the holder write and forget the memory of any user in the space. Not included in All. Grant only to trusted applications and API keys.',
          }
        ),
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'manage_memory',
                name: i18n.translate(
                  'xpack.contextEngine.featureRegistry.subFeatures.manageMemory.privilege',
                  { defaultMessage: 'Manage memory' }
                ),
                includeIn: 'none',
                api: [apiPrivileges.manageMemory],
                savedObject: { all: [], read: [] },
                ui: [],
              },
            ],
          },
        ],
      },
    ],
  });
};
