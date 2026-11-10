/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { i18n } from '@kbn/i18n';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { CONNECTOR_KI_TYPE } from '@kbn/agent-builder-elastic-ai-index-ki-types';
import {
  CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
  OAUTH_STATE_SAVED_OBJECT_TYPE,
  USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
} from './constants/saved_objects';

const ENDPOINT_SECURITY_EXECUTE_PRIVILEGE_API_TAG = 'actions:execute-endpoint-security-connectors';
export const ENDPOINT_SECURITY_EXECUTE_PRIVILEGE = `api:${ENDPOINT_SECURITY_EXECUTE_PRIVILEGE_API_TAG}`;
export const ENDPOINT_SECURITY_SUB_ACTIONS_EXECUTE_PRIVILEGE = `api:actions:execute-endpoint-security-sub-actions`;

export const EXECUTE_CONNECTORS_PRIVILEGE_API_TAG = 'actions:execute-connectors' as const;
export const EXECUTE_CONNECTORS_PRIVILEGE = `api:${EXECUTE_CONNECTORS_PRIVILEGE_API_TAG}` as const;
export const ACTIONS_V2_FEATURE_ID = 'actions_v2' as const;

export const OAUTH_API_TAG = 'actions:oauth';

/**
 * The order of appearance in the feature privilege page
 * under the management section.
 */
const FEATURE_ORDER = 3000;

const MANAGEMENT_SECTION = {
  insightsAndAlerting: [
    'triggersActionsRules',
    'triggersActionsAlerts',
    'triggersActionsConnectors',
  ],
};

const endpointSecuritySubFeature = {
  name: i18n.translate('xpack.actions.featureRegistry.endpointSecuritySubFeatureName', {
    defaultMessage: 'Endpoint Security',
  }),
  description: i18n.translate(
    'xpack.actions.featureRegistry.endpointSecuritySubFeatureDescription',
    {
      defaultMessage: 'Includes: Sentinel One, CrowdStrike, Microsoft Defender for Endpoint',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'independent' as const,
      privileges: [
        {
          api: [ENDPOINT_SECURITY_EXECUTE_PRIVILEGE_API_TAG],
          id: 'endpoint_security_execute',
          name: i18n.translate(
            'xpack.actions.featureRegistry.endpointSecuritySubFeaturePrivilege',
            {
              defaultMessage: 'Execute',
            }
          ),
          includeIn: 'all' as const,
          savedObject: { all: [], read: [] },
          ui: ['endpointSecurityExecute'],
        },
      ],
    },
  ],
};

const executeConnectorsSubFeature = {
  name: i18n.translate('xpack.actions.featureRegistry.executeConnectorsSubFeatureName', {
    defaultMessage: 'Execute connectors',
  }),
  description: i18n.translate(
    'xpack.actions.featureRegistry.executeConnectorsSubFeatureDescription',
    {
      defaultMessage: 'Run connector actions. Not included in Read.',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'independent' as const,
      privileges: [
        {
          api: [EXECUTE_CONNECTORS_PRIVILEGE_API_TAG],
          id: 'execute',
          name: i18n.translate('xpack.actions.featureRegistry.executeConnectorsPrivilegeName', {
            defaultMessage: 'Execute',
          }),
          // Readers must opt in. includeIn: 'read' would fold execute back into read and keep the gap.
          includeIn: 'all' as const,
          savedObject: {
            all: [ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE],
            read: [],
          },
          ui: ['execute'],
        },
      ],
    },
  ],
};

export const ACTIONS_FEATURE_V2: KibanaFeatureConfig = {
  id: ACTIONS_V2_FEATURE_ID,
  name: i18n.translate('xpack.actions.featureRegistry.actionsFeatureName', {
    defaultMessage: 'Actions and Connectors',
  }),
  category: DEFAULT_APP_CATEGORIES.management,
  app: [],
  order: FEATURE_ORDER,
  management: MANAGEMENT_SECTION,
  privileges: {
    all: {
      app: [],
      api: [OAUTH_API_TAG],
      catalogue: [],
      management: MANAGEMENT_SECTION,
      aiIndex: { read: [CONNECTOR_KI_TYPE] },
      savedObject: {
        all: [
          ACTION_SAVED_OBJECT_TYPE,
          CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
          CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
          OAUTH_STATE_SAVED_OBJECT_TYPE,
          USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        ],
        read: [],
      },
      ui: ['show', 'save', 'delete'],
    },
    read: {
      app: [],
      api: [OAUTH_API_TAG],
      catalogue: [],
      management: MANAGEMENT_SECTION,
      aiIndex: { read: [CONNECTOR_KI_TYPE] },
      savedObject: {
        all: [
          CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
          OAUTH_STATE_SAVED_OBJECT_TYPE,
          USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        ],
        read: [ACTION_SAVED_OBJECT_TYPE],
      },
      ui: ['show'],
    },
  },
  subFeatures: [endpointSecuritySubFeature, executeConnectorsSubFeature],
};

export const ACTIONS_FEATURE: KibanaFeatureConfig = {
  id: 'actions',
  name: i18n.translate('xpack.actions.featureRegistry.actionsFeatureName', {
    defaultMessage: 'Actions and Connectors',
  }),
  category: DEFAULT_APP_CATEGORIES.management,
  app: [],
  order: FEATURE_ORDER,
  excludeFromBasePrivileges: true,
  deprecated: {
    notice: i18n.translate('xpack.actions.featureRegistry.actionsFeatureDeprecationNotice', {
      defaultMessage:
        'The Actions and Connectors privilege is deprecated. Use the replacement privilege, which separates connector execution. See {link}.',
      values: {
        link: 'https://github.com/elastic/kibana/pull/303530',
      },
    }),
    replacedBy: [ACTIONS_V2_FEATURE_ID],
  },
  management: MANAGEMENT_SECTION,
  privileges: {
    all: {
      app: [],
      api: [OAUTH_API_TAG, EXECUTE_CONNECTORS_PRIVILEGE_API_TAG],
      catalogue: [],
      management: MANAGEMENT_SECTION,
      aiIndex: { read: [CONNECTOR_KI_TYPE] },
      savedObject: {
        all: [
          ACTION_SAVED_OBJECT_TYPE,
          CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
          ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
          CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
          OAUTH_STATE_SAVED_OBJECT_TYPE,
          USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        ],
        read: [],
      },
      ui: ['show', 'execute', 'save', 'delete'],
      replacedBy: {
        default: [{ feature: ACTIONS_V2_FEATURE_ID, privileges: ['all'] }],
        minimal: [{ feature: ACTIONS_V2_FEATURE_ID, privileges: ['minimal_all', 'execute'] }],
      },
    },
    read: {
      app: [],
      api: [OAUTH_API_TAG, EXECUTE_CONNECTORS_PRIVILEGE_API_TAG],
      catalogue: [],
      management: MANAGEMENT_SECTION,
      aiIndex: { read: [CONNECTOR_KI_TYPE] },
      savedObject: {
        // action execution requires 'read' over `actions`, but 'all' over `action_task_params`
        all: [
          ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
          CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
          OAUTH_STATE_SAVED_OBJECT_TYPE,
          USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        ],
        read: [ACTION_SAVED_OBJECT_TYPE],
      },
      ui: ['show', 'execute'],
      replacedBy: {
        default: [{ feature: ACTIONS_V2_FEATURE_ID, privileges: ['read', 'execute'] }],
        minimal: [{ feature: ACTIONS_V2_FEATURE_ID, privileges: ['minimal_read', 'execute'] }],
      },
    },
  },
  subFeatures: [
    {
      ...endpointSecuritySubFeature,
      privilegeGroups: [
        {
          groupType: 'independent',
          privileges: [
            {
              ...endpointSecuritySubFeature.privilegeGroups[0].privileges[0],
              replacedBy: [
                { feature: ACTIONS_V2_FEATURE_ID, privileges: ['endpoint_security_execute'] },
              ],
            },
          ],
        },
      ],
    },
  ],
};
