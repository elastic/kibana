/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductFeatureSecurityKey, SecuritySubFeatureId } from '../product_features_keys';
import { APP_ID } from '../constants';
import type { DefaultSecurityProductFeaturesConfig } from './types';

/**
 * App features privileges configuration for the Security Solution Kibana Feature app.
 * These are the configs that are shared between both offering types (ess and serverless).
 * They can be extended on each offering plugin to register privileges using different way on each offering type.
 *
 * Privileges can be added in different ways:
 * - `privileges`: the privileges that will be added directly into the main Security feature.
 * - `subFeatureIds`: the ids of the sub-features that will be added into the Security subFeatures entry.
 * - `subFeaturesPrivileges`: the privileges that will be added into the existing Security subFeature with the privilege `id` specified.
 */
export const securityDefaultProductFeaturesConfig: DefaultSecurityProductFeaturesConfig = {
  [ProductFeatureSecurityKey.advancedInsights]: {
    privileges: {
      all: {
        ui: ['entity-analytics'],
        api: [`${APP_ID}-entity-analytics`],
      },
      read: {
        ui: ['entity-analytics'],
        api: [`${APP_ID}-entity-analytics`],
      },
    },
  },
  [ProductFeatureSecurityKey.investigationGuide]: {
    privileges: {
      all: {
        ui: ['investigation-guide'],
      },
      read: {
        ui: ['investigation-guide'],
      },
    },
  },

  [ProductFeatureSecurityKey.threatIntelligence]: {
    privileges: {
      all: {
        ui: ['threat-intelligence'],
        api: [`${APP_ID}-threat-intelligence`],
      },
      read: {
        ui: ['threat-intelligence'],
        api: [`${APP_ID}-threat-intelligence`],
      },
    },
  },

  [ProductFeatureSecurityKey.endpointHostManagement]: {
    subFeatureIds: [SecuritySubFeatureId.endpointList],
  },

  [ProductFeatureSecurityKey.endpointPolicyManagement]: {
    subFeatureIds: [SecuritySubFeatureId.policyManagement],
  },

  // Adds no additional kibana feature controls
  [ProductFeatureSecurityKey.endpointPolicyProtections]: {},

  [ProductFeatureSecurityKey.endpointArtifactManagement]: {
    subFeatureIds: [
      SecuritySubFeatureId.trustedApplications,
      SecuritySubFeatureId.blocklist,
      SecuritySubFeatureId.eventFilters,
    ],
    subFeaturesPrivileges: [
      {
        id: 'host_isolation_exceptions_all',
        api: [`${APP_ID}-accessHostIsolationExceptions`, `${APP_ID}-writeHostIsolationExceptions`],
        ui: ['accessHostIsolationExceptions', 'writeHostIsolationExceptions'],
      },
      {
        id: 'host_isolation_exceptions_read',
        api: [`${APP_ID}-accessHostIsolationExceptions`],
        ui: ['accessHostIsolationExceptions'],
      },
    ],
  },

  [ProductFeatureSecurityKey.endpointResponseActions]: {
    subFeatureIds: [
      SecuritySubFeatureId.hostIsolationExceptions,
      SecuritySubFeatureId.responseActionsHistory,
      SecuritySubFeatureId.hostIsolation,
      SecuritySubFeatureId.processOperations,
      SecuritySubFeatureId.fileOperations,
      SecuritySubFeatureId.executeAction,
    ],
    subFeaturesPrivileges: [
      {
        id: 'host_isolation_all',
        api: [`${APP_ID}-writeHostIsolation`],
        ui: ['writeHostIsolation'],
      },
    ],
  },

  [ProductFeatureSecurityKey.ruleManagement]: {
    subFeatureIds: [SecuritySubFeatureId.ruleManagement],
  },

  // Product features without RBAC
  [ProductFeatureSecurityKey.osqueryAutomatedResponseActions]: {},
  [ProductFeatureSecurityKey.endpointProtectionUpdates]: {},
  [ProductFeatureSecurityKey.endpointAgentTamperProtection]: {},
  [ProductFeatureSecurityKey.externalRuleActions]: {},
};
