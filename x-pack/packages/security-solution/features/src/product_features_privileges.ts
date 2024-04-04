/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ID, RULE_MANAGEMENT_API_READ, RULE_MANAGEMENT_API_WRITE } from './constants';
import { SECURITY_RULE_TYPES } from './security/kibana_features';

export enum ProductFeaturesPrivilegeId {
  endpointExceptions = 'endpoint_exceptions',
  ruleManagement = 'rule_management',
}

/**
 * This is the mapping of the privileges that are registered
 * using a different Kibana feature configuration (sub-feature, main feature privilege, etc)
 * in each offering type (ess, serverless)
 */
export const ProductFeaturesPrivileges = {
  [ProductFeaturesPrivilegeId.endpointExceptions]: {
    all: {
      ui: ['showEndpointExceptions', 'crudEndpointExceptions'],
      api: [`${APP_ID}-showEndpointExceptions`, `${APP_ID}-crudEndpointExceptions`],
    },
    read: {
      ui: ['showEndpointExceptions'],
      api: [`${APP_ID}-showEndpointExceptions`],
    },
  },
  [ProductFeaturesPrivilegeId.ruleManagement]: {
    all: {
      api: [RULE_MANAGEMENT_API_READ, RULE_MANAGEMENT_API_WRITE],
      alerting: {
        rule: {
          all: SECURITY_RULE_TYPES,
        },
        alert: {
          all: SECURITY_RULE_TYPES,
        },
      },
    },
    read: {
      api: [RULE_MANAGEMENT_API_READ],
      alerting: {
        rule: {
          read: SECURITY_RULE_TYPES,
        },
        alert: {
          all: SECURITY_RULE_TYPES,
        },
      },
    },
  },
};
