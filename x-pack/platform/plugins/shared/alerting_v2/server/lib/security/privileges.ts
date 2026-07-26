/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import type { AppCategory } from '@kbn/core/types';
import { APP_ID } from '../constants';
import {
  ALERTING_V2_API_PRIVILEGES,
  ALERTING_V2_FEATURES,
  type AlertingV2FeatureDefinition,
} from '../../../common/feature_privileges';
import { ALERTING_V2_SECTION_ID } from '../../../common/management_apps';

export { ALERTING_V2_API_PRIVILEGES };

const category: AppCategory = {
  id: 'alerting',
  label: 'Alerting',
  order: 1000,
  euiIconType: 'watchesApp',
};

const buildKibanaFeature = (feature: AlertingV2FeatureDefinition): KibanaFeatureConfig => {
  const managementApps = [feature.managementApp];
  const app = [APP_ID];

  return {
    id: feature.id,
    name: feature.name,
    category,
    app,
    management: {
      [ALERTING_V2_SECTION_ID]: managementApps,
    },
    privileges: {
      all: {
        app,
        management: {
          [ALERTING_V2_SECTION_ID]: managementApps,
        },
        ...(feature.privileges.all.alerts ? { alerts: { ...feature.privileges.all.alerts } } : {}),
        savedObject: {
          all: [...feature.privileges.all.savedObject.all],
          read: [...feature.privileges.all.savedObject.read],
        },
        api: [...feature.privileges.all.api],
        ui: [...feature.privileges.all.ui],
      },
      read: {
        app,
        management: {
          [ALERTING_V2_SECTION_ID]: managementApps,
        },
        ...(feature.privileges.read.alerts
          ? { alerts: { ...feature.privileges.read.alerts } }
          : {}),
        savedObject: {
          all: [...feature.privileges.read.savedObject.all],
          read: [...feature.privileges.read.savedObject.read],
        },
        api: [...feature.privileges.read.api],
        ui: [...feature.privileges.read.ui],
      },
    },
    ...(feature.subFeatures.length > 0 ? { subFeatures: [...feature.subFeatures] } : {}),
  };
};

export const registerFeaturePrivileges = (features: FeaturesPluginSetup) => {
  Object.values(ALERTING_V2_FEATURES).forEach((feature) => {
    features.registerKibanaFeature(buildKibanaFeature(feature));
  });
};
