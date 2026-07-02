/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { STACK_ALERTS_ONLY_FEATURE_ID } from '@kbn/rule-data-utils';
import { alertingFeatures } from './feature';

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
    insightsAndAlerting: ['triggersActions'],
  },
  alerting: alertingFeatures,
  privileges: {
    all: {
      app: [],
      catalogue: [],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      alerting: {
        alert: { all: alertingFeatures },
        rule: { mute_alerts: alertingFeatures },
      },
      savedObject: { all: [], read: [] },
      api: ['rac'],
      // `write` unlocks the per-alert modify actions (acknowledge, mark as untracked,
      // mute/unmute, edit tags) in the UI. The underlying RAC `alert:all` /
      // `rule:mute_alerts` privileges are not exposed as browser capabilities, so we
      // declare an explicit `write` UI capability that the alerts table reads.
      ui: ['show', 'write'],
    },
    read: {
      app: [],
      catalogue: [],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      alerting: {
        alert: { read: alertingFeatures },
      },
      savedObject: { all: [], read: [] },
      api: ['rac'],
      ui: ['show'],
    },
  },
};
