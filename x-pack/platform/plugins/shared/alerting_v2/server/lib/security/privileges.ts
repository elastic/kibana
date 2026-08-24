/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import type { AppCategory } from '@kbn/core/types';
import { ALERTING_V2_SECTION_ID } from '@kbn/alerting-v2-constants';
import { APP_ID } from '../constants';
import {
  ALERTING_V2_API_PRIVILEGES,
  ALERTING_V2_DEPRECATED_FEATURE_IDS,
  ALERTING_V2_FEATURES,
  type AlertingV2Feature,
  type AlertingV2FeatureDefinition,
} from '../../../common/feature_privileges';

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

const DEPRECATION_NOTICE_URL = 'https://github.com/elastic/kibana/pull/285000';

const buildDeprecatedKibanaFeature = (
  feature: AlertingV2FeatureDefinition,
  deprecatedId: string
): KibanaFeatureConfig => {
  const current = buildKibanaFeature(feature);
  const { privileges } = current;
  if (!privileges) {
    throw new Error(`Feature "${feature.id}" is missing privileges`);
  }

  return {
    ...current,
    id: deprecatedId,
    name: i18n.translate('xpack.alertingVTwo.features.deprecatedFeatureName', {
      defaultMessage: '{name} (Deprecated)',
      values: { name: feature.name },
    }),
    deprecated: {
      notice: i18n.translate('xpack.alertingVTwo.features.deprecationNotice', {
        defaultMessage:
          'The {deprecatedId} privileges are deprecated. Use {currentId} instead. See {link}.',
        values: {
          deprecatedId,
          currentId: feature.id,
          link: DEPRECATION_NOTICE_URL,
        },
      }),
    },
    privileges: {
      all: {
        ...privileges.all,
        replacedBy: [{ feature: feature.id, privileges: ['all'] }],
      },
      read: {
        ...privileges.read,
        replacedBy: [{ feature: feature.id, privileges: ['read'] }],
      },
    },
  };
};

export const registerFeaturePrivileges = (features: FeaturesPluginSetup) => {
  (Object.keys(ALERTING_V2_FEATURES) as AlertingV2Feature[]).forEach((key) => {
    const feature = ALERTING_V2_FEATURES[key];
    features.registerKibanaFeature(buildKibanaFeature(feature));
    features.registerKibanaFeature(
      buildDeprecatedKibanaFeature(feature, ALERTING_V2_DEPRECATED_FEATURE_IDS[key])
    );
  });
};
