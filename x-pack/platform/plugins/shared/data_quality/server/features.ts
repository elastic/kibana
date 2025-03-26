/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import {
  KibanaFeatureConfig,
  KibanaFeatureScope,
  ElasticsearchFeatureConfig,
} from '@kbn/features-plugin/common';
import { DATASET_QUALITY_RULE_TYPE_ID, STACK_ALERTS_FEATURE_ID } from '@kbn/rule-data-utils';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { PLUGIN_FEATURE_ID, PLUGIN_ID, PLUGIN_NAME } from '../common';

export const KIBANA_FEATURE: KibanaFeatureConfig = {
  id: PLUGIN_FEATURE_ID,
  name: PLUGIN_NAME,
  category: DEFAULT_APP_CATEGORIES.management,
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: [PLUGIN_ID],
  alerting: [
    {
      ruleTypeId: DATASET_QUALITY_RULE_TYPE_ID,
      consumers: [STACK_ALERTS_FEATURE_ID, ALERTING_FEATURE_ID],
    },
  ],
  privileges: {
    all: {
      app: [PLUGIN_ID],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show'],
      // TODO: Review RBAC for the rule type
      alerting: {
        rule: {
          read: [
            {
              ruleTypeId: DATASET_QUALITY_RULE_TYPE_ID,
              consumers: [STACK_ALERTS_FEATURE_ID, ALERTING_FEATURE_ID],
            },
          ],
        },
        alert: {
          read: [
            {
              ruleTypeId: DATASET_QUALITY_RULE_TYPE_ID,
              consumers: [STACK_ALERTS_FEATURE_ID, ALERTING_FEATURE_ID],
            },
          ],
        },
      },
    },
    read: {
      disabled: true,
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show'],
      alerting: {
        rule: {
          read: [
            {
              ruleTypeId: DATASET_QUALITY_RULE_TYPE_ID,
              consumers: [STACK_ALERTS_FEATURE_ID, ALERTING_FEATURE_ID],
            },
          ],
        },
        alert: {
          read: [
            {
              ruleTypeId: DATASET_QUALITY_RULE_TYPE_ID,
              consumers: [STACK_ALERTS_FEATURE_ID, ALERTING_FEATURE_ID],
            },
          ],
        },
      },
    },
  },
};

export const ELASTICSEARCH_FEATURE: ElasticsearchFeatureConfig = {
  id: PLUGIN_ID,
  management: {
    data: [PLUGIN_ID],
  },
  privileges: [
    {
      ui: [],
      requiredClusterPrivileges: [],
      requiredIndexPrivileges: {
        ['logs-*-*']: ['read'],
      },
    },
    {
      ui: [],
      requiredClusterPrivileges: [],
      requiredIndexPrivileges: {
        ['traces-*-*']: ['read'],
      },
    },
    {
      ui: [],
      requiredClusterPrivileges: [],
      requiredIndexPrivileges: {
        ['metrics-*-*']: ['read'],
      },
    },
    {
      ui: [],
      requiredClusterPrivileges: [],
      requiredIndexPrivileges: {
        ['synthetics-*-*']: ['read'],
      },
    },
  ],
};
