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
  SubFeaturePrivilegeGroupConfig,
  SubFeaturePrivilegeGroupType,
} from '@kbn/features-plugin/common';
import { AlertConsumers, DEGRADED_DOCS_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import { PLUGIN_FEATURE_ID, PLUGIN_ID, PLUGIN_NAME } from '../common';

const degradedDocsAlertingFeatures = {
  ruleTypeId: DEGRADED_DOCS_RULE_TYPE_ID,
  consumers: [AlertConsumers.ALERTS],
};

const canManageRules: SubFeaturePrivilegeGroupConfig = {
  groupType: 'independent' as SubFeaturePrivilegeGroupType,
  privileges: [
    {
      id: 'manage_rules',
      name: i18n.translate('xpack.dataQuality.features.canManageRules', {
        defaultMessage: 'Manage rules',
      }),
      includeIn: 'all',
      alerting: {
        rule: {
          all: [degradedDocsAlertingFeatures],
        },
      },
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['alerting:save'],
    },
  ],
};

const canManageAlerts: SubFeaturePrivilegeGroupConfig = {
  groupType: 'independent' as SubFeaturePrivilegeGroupType,
  privileges: [
    {
      id: 'manage_alerts',
      name: i18n.translate('xpack.dataQuality.features.canManageAlerts', {
        defaultMessage: 'Manage alerts',
      }),
      includeIn: 'all',
      alerting: {
        alert: {
          all: [degradedDocsAlertingFeatures],
        },
      },
      savedObject: {
        all: [],
        read: [],
      },
      ui: [],
    },
  ],
};

export const KIBANA_FEATURE: KibanaFeatureConfig = {
  id: PLUGIN_FEATURE_ID,
  name: PLUGIN_NAME,
  category: DEFAULT_APP_CATEGORIES.management,
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: [PLUGIN_ID],
  alerting: [degradedDocsAlertingFeatures],
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  privileges: {
    all: {
      app: [PLUGIN_ID],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show'],
      alerting: {
        rule: {
          read: [degradedDocsAlertingFeatures],
        },
        alert: {
          all: [degradedDocsAlertingFeatures],
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
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
          read: [degradedDocsAlertingFeatures],
        },
        alert: {
          read: [degradedDocsAlertingFeatures],
        },
      },
    },
  },
  subFeatures: [
    {
      name: i18n.translate('xpack.dataQuality.features.app.manageRules', {
        defaultMessage: 'Manage rules',
      }),
      description: i18n.translate('xpack.dataQuality.features.app.manageRulesDescription', {
        defaultMessage: 'This feature enables users to manage dataset quality rules.',
      }),
      privilegeGroups: [canManageRules],
    },
    {
      name: i18n.translate('xpack.dataQuality.features.app.manageAlerts', {
        defaultMessage: 'Manage alerts',
      }),
      description: i18n.translate('xpack.dataQuality.features.app.manageAlertsDescription', {
        defaultMessage: 'This feature enables users to manage dataset quality alerts.',
      }),
      privilegeGroups: [canManageAlerts],
    },
  ],
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
