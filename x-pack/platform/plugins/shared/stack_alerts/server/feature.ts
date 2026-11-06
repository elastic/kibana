/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import {
  STACK_ALERTING_FEATURES,
  STACK_ALERTS_FEATURE_ID,
  STACK_ALERTS_ONLY_FEATURE_ID,
} from '@kbn/rule-data-utils';

export const BUILT_IN_ALERTS_FEATURE: KibanaFeatureConfig = {
  id: STACK_ALERTS_FEATURE_ID,
  name: i18n.translate('xpack.stackAlerts.featureRegistry.actionsFeatureName', {
    defaultMessage: 'Stack Rules',
  }),
  order: 2000,
  app: [],
  category: DEFAULT_APP_CATEGORIES.management,
  management: {
    insightsAndAlerting: ['triggersActionsRules', 'triggersActionsAlerts'],
  },
  alerting: STACK_ALERTING_FEATURES,
  privileges: {
    all: {
      app: [],
      catalogue: [],
      management: {
        insightsAndAlerting: ['triggersActionsRules', 'triggersActionsAlerts'],
      },
      alerting: {
        rule: {
          all: STACK_ALERTING_FEATURES,
          enable: STACK_ALERTING_FEATURES,
          manual_run: STACK_ALERTING_FEATURES,
          manage_rule_settings: STACK_ALERTING_FEATURES,
        },
        alert: {
          all: STACK_ALERTING_FEATURES,
        },
      },
      savedObject: {
        all: [],
        read: [],
      },
      api: ['rac', 'bulkGetUserProfiles'],
      ui: [],
    },
    read: {
      app: [],
      catalogue: [],
      management: {
        insightsAndAlerting: ['triggersActionsRules', 'triggersActionsAlerts'],
      },
      alerting: {
        rule: {
          read: STACK_ALERTING_FEATURES,
        },
        alert: {
          read: STACK_ALERTING_FEATURES,
        },
      },
      savedObject: {
        all: [],
        read: [],
      },
      api: ['rac', 'bulkGetUserProfiles'],
      ui: [],
    },
  },
};

export const STACK_ALERTS_ONLY_FEATURE: KibanaFeatureConfig = {
  id: STACK_ALERTS_ONLY_FEATURE_ID,
  name: i18n.translate('xpack.stackAlerts.featureRegistry.stackAlertsOnlyFeatureName', {
    defaultMessage: 'Stack Alerts',
  }),
  order: 2001,
  category: DEFAULT_APP_CATEGORIES.management,
  app: [],
  catalogue: [],
  management: {
    insightsAndAlerting: ['triggersActionsAlerts'],
  },
  alerting: STACK_ALERTING_FEATURES,
  privileges: {
    all: {
      app: [],
      catalogue: [],
      management: {
        insightsAndAlerting: ['triggersActionsAlerts'],
      },
      alerting: {
        alert: { all: STACK_ALERTING_FEATURES },
        rule: { mute_alerts: STACK_ALERTING_FEATURES },
      },
      savedObject: { all: [], read: [] },
      api: ['rac'],
      ui: ['show', 'write'],
    },
    read: {
      app: [],
      catalogue: [],
      management: {
        insightsAndAlerting: ['triggersActionsAlerts'],
      },
      alerting: {
        alert: { read: STACK_ALERTING_FEATURES },
        rule: { read_muted_alerts: STACK_ALERTING_FEATURES },
      },
      savedObject: { all: [], read: [] },
      api: ['rac'],
      ui: ['show'],
    },
  },
};
