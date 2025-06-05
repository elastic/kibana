/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import {
  ONECHAT_APP_ID,
  ONECHAT_FEATURE_ID,
  ONECHAT_FEATURE_NAME,
  uiPrivileges,
  apiPrivileges,
} from '../common/features';

export const registerFeatures = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: ONECHAT_FEATURE_ID,
    name: ONECHAT_FEATURE_NAME,
    minimumLicense: 'enterprise',
    order: 1000,
    category: DEFAULT_APP_CATEGORIES.kibana,
    scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
    app: ['kibana', ONECHAT_APP_ID],
    catalogue: [ONECHAT_FEATURE_ID],
    privileges: {
      all: {
        app: ['kibana', ONECHAT_APP_ID],
        api: [apiPrivileges.readOnechat, apiPrivileges.manageOnechat],
        catalogue: [ONECHAT_FEATURE_ID],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [uiPrivileges.show, uiPrivileges.showManagement],
      },
      read: {
        app: ['kibana', ONECHAT_APP_ID],
        api: [apiPrivileges.readOnechat],
        catalogue: [ONECHAT_FEATURE_ID],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [uiPrivileges.show],
      },
    },
  });
};
