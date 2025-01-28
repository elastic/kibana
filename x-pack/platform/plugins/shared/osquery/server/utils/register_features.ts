/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import {
  packSavedObjectType,
  packAssetSavedObjectType,
  savedQuerySavedObjectType,
} from '../../common/types';
import { PLUGIN_ID } from '../../common';
import type { SetupPlugins } from '../types';

export const registerFeatures = (features: SetupPlugins['features']) => {
  features.registerKibanaFeature({
    id: PLUGIN_ID,
    name: i18n.translate('xpack.osquery.features.osqueryFeatureName', {
      defaultMessage: 'Osquery',
    }),
    category: DEFAULT_APP_CATEGORIES.management,
    scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
    app: [PLUGIN_ID, 'kibana'],
    catalogue: [PLUGIN_ID],
    order: 2300,
    privileges: {
      all: {
        api: [`${PLUGIN_ID}-read`, `${PLUGIN_ID}-write`],
        app: [PLUGIN_ID, 'kibana'],
        catalogue: [PLUGIN_ID],
        savedObject: {
          all: [],
          read: [],
        },
        ui: ['read', 'write'],
      },
      read: {
        api: [`${PLUGIN_ID}-read`],
        app: [PLUGIN_ID, 'kibana'],
        catalogue: [PLUGIN_ID],
        savedObject: {
          all: [],
          read: [],
        },
        ui: ['read'],
      },
    },
    subFeatures: [
      {
        name: i18n.translate('xpack.osquery.features.liveQueriesSubFeatureName', {
          defaultMessage: 'Live queries',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                api: [`${PLUGIN_ID}-writeLiveQueries`, `${PLUGIN_ID}-readLiveQueries`],
                id: 'live_queries_all',
                includeIn: 'all',
                name: 'All',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['writeLiveQueries', 'readLiveQueries'],
              },
              {
                api: [`${PLUGIN_ID}-readLiveQueries`],
                id: 'live_queries_read',
                includeIn: 'read',
                name: 'Read',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['readLiveQueries'],
              },
            ],
          },
          {
            groupType: 'independent',
            privileges: [
              {
                api: [`${PLUGIN_ID}-runSavedQueries`],
                id: 'run_saved_queries',
                name: i18n.translate('xpack.osquery.features.runSavedQueriesPrivilegeName', {
                  defaultMessage: 'Run Saved queries',
                }),
                includeIn: 'all',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['runSavedQueries'],
              },
            ],
          },
        ],
      },
      {
        name: i18n.translate('xpack.osquery.features.savedQueriesSubFeatureName', {
          defaultMessage: 'Saved queries',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                api: [`${PLUGIN_ID}-writeSavedQueries`, `${PLUGIN_ID}-readSavedQueries`],
                id: 'saved_queries_all',
                includeIn: 'all',
                name: 'All',
                savedObject: {
                  all: [savedQuerySavedObjectType],
                  read: ['tag'],
                },
                ui: ['writeSavedQueries', 'readSavedQueries'],
              },
              {
                api: [`${PLUGIN_ID}-readSavedQueries`],
                id: 'saved_queries_read',
                includeIn: 'read',
                name: 'Read',
                savedObject: {
                  all: [],
                  read: [savedQuerySavedObjectType, 'tag'],
                },
                ui: ['readSavedQueries'],
              },
            ],
          },
        ],
      },
      {
        name: i18n.translate('xpack.osquery.features.packsSubFeatureName', {
          defaultMessage: 'Packs',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                api: [`${PLUGIN_ID}-writePacks`, `${PLUGIN_ID}-readPacks`],
                id: 'packs_all',
                includeIn: 'all',
                name: 'All',
                savedObject: {
                  all: [packSavedObjectType, packAssetSavedObjectType],
                  read: ['tag'],
                },
                ui: ['writePacks', 'readPacks'],
              },
              {
                api: [`${PLUGIN_ID}-readPacks`],
                id: 'packs_read',
                includeIn: 'read',
                name: 'Read',
                savedObject: {
                  all: [],
                  read: [packSavedObjectType, 'tag'],
                },
                ui: ['readPacks'],
              },
            ],
          },
        ],
      },
    ],
  });
};
