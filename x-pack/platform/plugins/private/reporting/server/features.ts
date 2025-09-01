/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { SCHEDULED_REPORT_SAVED_OBJECT_TYPE } from './saved_objects';

export const API_PRIVILEGES = {
  MANAGE_SCHEDULED_REPORTING: 'manage_scheduled_reports',
};

interface FeatureRegistrationOpts {
  features: FeaturesPluginSetup;
  isServerless: boolean;
}

export function registerFeatures({ isServerless, features }: FeatureRegistrationOpts) {
  // Register a 'shell' features for Reporting. On their own, they don't grant specific privileges.

  // Shell feature for Serverless. If granted, it will automatically provide access to
  // reporting capabilities in other features, such as Discover, Dashboards, and Visualizations.
  if (isServerless) {
    features.registerKibanaFeature({
      id: 'reporting',
      name: i18n.translate('xpack.reporting.features.reportingFeatureName', {
        defaultMessage: 'Reporting',
      }),
      category: DEFAULT_APP_CATEGORIES.management,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      app: [],
      privileges: {
        all: { savedObject: { all: [], read: [] }, ui: [] },
        // No read-only mode currently supported
        read: { disabled: true, savedObject: { all: [], read: [] }, ui: [] },
      },
    });
  } else {
    // Shell feature for self-managed environments, to be leveraged by a reserved privilege defined
    // in ES. This grants access to reporting features in a legacy fashion.
    features.registerKibanaFeature({
      id: 'reportingLegacy',
      name: i18n.translate('xpack.reporting.features.reportingLegacyFeatureName', {
        defaultMessage: 'Reporting Legacy',
      }),
      category: DEFAULT_APP_CATEGORIES.management,
      management: { insightsAndAlerting: ['reporting'] },
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      hidden: true,
      app: [],
      privileges: null,
      reserved: {
        description: i18n.translate(
          'xpack.reporting.features.reportingLegacyFeatureReservedDescription',
          {
            defaultMessage:
              'Reserved for use by the Reporting plugin. This feature is used to grant access to Reporting capabilities in a legacy manner.',
          }
        ),
        privileges: [
          {
            id: 'reporting_user',
            privilege: {
              excludeFromBasePrivileges: true,
              app: [],
              catalogue: [],
              management: { insightsAndAlerting: ['reporting'] },
              savedObject: { all: [], read: [] },
              api: ['generateReport'],
              ui: ['generateReport'],
            },
          },
        ],
      },
    });
  }

  features.enableReportingUiCapabilities();

  features.registerKibanaFeature({
    id: 'manageReporting',
    name: i18n.translate('xpack.reporting.features.manageScheduledReportsFeatureName', {
      defaultMessage: 'Manage Scheduled Reports',
    }),
    description: i18n.translate(
      'xpack.reporting.features.manageScheduledReportsFeatureDescription',
      {
        defaultMessage: 'View and manage scheduled reports for all users in this space.',
      }
    ),
    category: DEFAULT_APP_CATEGORIES.management,
    scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
    app: [],
    privileges: {
      all: {
        api: [API_PRIVILEGES.MANAGE_SCHEDULED_REPORTING],
        savedObject: { all: [SCHEDULED_REPORT_SAVED_OBJECT_TYPE], read: [] },
        ui: ['show'],
      },
      // No read-only mode currently supported
      read: { disabled: true, savedObject: { all: [], read: [] }, ui: [] },
    },
  });
}
