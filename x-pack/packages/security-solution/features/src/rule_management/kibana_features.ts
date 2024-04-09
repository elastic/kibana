/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import {
  APP_ID,
  RULE_MANAGEMENT_API_READ,
  RULE_MANAGEMENT_API_WRITE,
  RULE_MANAGEMENT_FEATURE_ID,
  RULE_MANAGEMENT_UI_READ,
  RULE_MANAGEMENT_UI_WRITE,
} from '../constants';
import { SECURITY_RULE_TYPES } from '../security/kibana_features';
import { type BaseKibanaFeatureConfig } from '../types';

export const getRuleManagementBaseKibanaFeature = (): BaseKibanaFeatureConfig => ({
  id: RULE_MANAGEMENT_FEATURE_ID,
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.features.ruleManagement',
    {
      defaultMessage: 'Rule Management',
    }
  ),
  order: 1100,
  category: DEFAULT_APP_CATEGORIES.security,
  app: [RULE_MANAGEMENT_FEATURE_ID, 'kibana'],
  alerting: SECURITY_RULE_TYPES,
  catalogue: [APP_ID],
  privileges: {
    all: {
      app: [RULE_MANAGEMENT_FEATURE_ID, 'kibana'],
      catalogue: [APP_ID],
      savedObject: {
        all: [],
        read: [],
      },
      alerting: {
        rule: {
          all: SECURITY_RULE_TYPES,
        },
        alert: {
          all: SECURITY_RULE_TYPES,
        },
      },
      api: [RULE_MANAGEMENT_API_READ, RULE_MANAGEMENT_API_WRITE],
      ui: [RULE_MANAGEMENT_UI_READ, RULE_MANAGEMENT_UI_WRITE],
    },
    read: {
      app: [RULE_MANAGEMENT_FEATURE_ID, 'kibana'],
      catalogue: [APP_ID],
      savedObject: {
        all: [],
        read: [],
      },
      alerting: {
        rule: {
          read: SECURITY_RULE_TYPES,
        },
        alert: {
          all: SECURITY_RULE_TYPES,
        },
      },
      api: [RULE_MANAGEMENT_API_READ],
      ui: [RULE_MANAGEMENT_UI_READ],
    },
  },
});
