/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import type { AppCategory } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { ALERTING_V2_SECTION_ID } from '@kbn/alerting-v2-constants';
import { APP_ID } from '../constants';
import {
  ALERTING_V2_API_PRIVILEGES,
  ALERTING_V2_FEATURES,
  getFeatureManagementApps,
  type AlertingV2Feature,
  type AlertingV2FeatureDefinition,
} from '../../../common/feature_privileges';

export { ALERTING_V2_API_PRIVILEGES };

const category: AppCategory = {
  id: 'alerting',
  label: i18n.translate('xpack.alertingV2.privileges.sectionLabel', {
    defaultMessage: 'Alerting V2',
  }),
  order: 1000,
  euiIconType: 'watchesApp',
};

const featureDescriptions: Record<AlertingV2Feature, string> = {
  rules: i18n.translate('xpack.alertingV2.privileges.rulesDescription', {
    defaultMessage: 'Experimental. Controls access to rules in the experimental alerting system.',
  }),
  alerts: i18n.translate('xpack.alertingV2.privileges.alertsDescription', {
    defaultMessage: 'Experimental. Controls access to alerts in the experimental alerting system.',
  }),
  actionPolicies: i18n.translate('xpack.alertingV2.privileges.actionPoliciesDescription', {
    defaultMessage:
      'Experimental. Controls access to action policies in the experimental alerting system.',
  }),
  executionHistory: i18n.translate('xpack.alertingV2.privileges.executionHistoryDescription', {
    defaultMessage:
      'Experimental. Controls access to execution history in the experimental alerting system.',
  }),
};

const buildKibanaFeature = (
  feature: AlertingV2FeatureDefinition,
  description: string
): KibanaFeatureConfig => {
  const managementApps = [...getFeatureManagementApps(feature)];
  const app = [APP_ID];

  return {
    id: feature.id,
    name: feature.name,
    description,
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
        ...(feature.privileges.all.aiIndex
          ? { aiIndex: { ...feature.privileges.all.aiIndex } }
          : {}),
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
        ...(feature.privileges.read.aiIndex
          ? { aiIndex: { ...feature.privileges.read.aiIndex } }
          : {}),
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
  const registeredFeatures = Object.entries(ALERTING_V2_FEATURES) as Array<
    [AlertingV2Feature, AlertingV2FeatureDefinition]
  >;

  for (const [featureKey, feature] of registeredFeatures) {
    features.registerKibanaFeature(buildKibanaFeature(feature, featureDescriptions[featureKey]));
  }
};
