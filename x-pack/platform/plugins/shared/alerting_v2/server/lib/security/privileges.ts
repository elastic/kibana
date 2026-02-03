/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { AppCategory } from '@kbn/core/types';
import { APP_ID } from '../constants';

const ALERTS_FEATURE_ID = 'alerting_v2_alerts';
const RULES_FEATURE_ID = 'alerting_v2_rules';
const CATEGORY_ID = 'alerting';

export const ALERTING_V2_API_PRIVILEGES = {
  rules: {
    read: 'read-alerting-v2-rules',
    write: 'write-alerting-v2-rules',
  },
  alerts: {
    read: 'read-alerting-v2-alerts',
    write: 'write-alerting-v2-alerts',
  },
} as const;

const getPrivileges = () => ({
  all: {
    app: [APP_ID],
    savedObject: {
      all: [],
      read: [],
    },
    ui: [],
    api: [
      ALERTING_V2_API_PRIVILEGES.rules.read,
      ALERTING_V2_API_PRIVILEGES.rules.write,
      ALERTING_V2_API_PRIVILEGES.alerts.read,
      ALERTING_V2_API_PRIVILEGES.alerts.write,
    ],
  },
  read: {
    app: [APP_ID],
    savedObject: {
      all: [],
      read: [],
    },
    ui: [],
    api: [ALERTING_V2_API_PRIVILEGES.rules.read, ALERTING_V2_API_PRIVILEGES.alerts.read],
  },
});

const category: AppCategory = {
  id: CATEGORY_ID,
  label: 'Alerting',
  order: 1000,
  euiIconType: 'watchesApp',
};

const alertsFeature = {
  id: ALERTS_FEATURE_ID,
  name: 'Alerts',
  category,
  app: [APP_ID],
  privileges: getPrivileges(),
};

const rulesFeature = {
  id: RULES_FEATURE_ID,
  name: 'Rules',
  category,
  app: [APP_ID],
  privileges: getPrivileges(),
};

export const registerFeaturePrivileges = (features: FeaturesPluginSetup) => {
  features.registerKibanaFeature(alertsFeature);
  features.registerKibanaFeature(rulesFeature);
};
