/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ProductFeatureSecurityKey {
  /** Enables Advanced Insights (Entity Risk, GenAI) */
  advancedInsights = 'advanced_insights',
  /**
   * Enables Investigation guide in Timeline
   */
  investigationGuide = 'investigation_guide',
  /**
   * Enables Investigation guide interactions (e.g., osquery, timelines, etc.)
   */
  investigationGuideInteractions = 'investigation_guide_interactions',
  /**
   * Enables access to the Endpoint List and associated views that allows management of hosts
   * running endpoint security
   */
  endpointHostManagement = 'endpoint_host_management',
  /**
   * Enables endpoint policy views that enables user to manage endpoint security policies
   */
  endpointPolicyManagement = 'endpoint_policy_management',
  /**
   * Enables Endpoint Policy protections (like Malware, Ransomware, etc)
   */
  endpointPolicyProtections = 'endpoint_policy_protections',
  /**
   * Enables management of all endpoint related artifacts (ex. Trusted Applications, Event Filters,
   * Host Isolation Exceptions, Blocklist.
   */
  endpointArtifactManagement = 'endpoint_artifact_management',
  /**
   * Enables managing host isolation exceptions for serverless PLIs
   * Allows user to create, read, update HIEs Endpoint Complete PLI
   */
  endpointHostIsolationExceptions = 'endpoint_host_isolation_exceptions',
  /**
   * Enables all of endpoint's supported response actions - like host isolation, file operations,
   * process operations, command execution, etc.
   */
  endpointResponseActions = 'endpoint_response_actions',
  /**
   * Enables Threat Intelligence
   */
  threatIntelligence = 'threat-intelligence',
  /**
   * Enables Osquery Response Actions
   */
  osqueryAutomatedResponseActions = 'osquery_automated_response_actions',

  /**
   * Enables Agent Tamper Protection
   */
  endpointProtectionUpdates = 'endpoint_protection_updates',

  /**
   * Enables Agent Tamper Protection
   */
  endpointAgentTamperProtection = 'endpoint_agent_tamper_protection',

  /**
   * Enables managing endpoint exceptions on rules and alerts
   */
  endpointExceptions = 'endpointExceptions',

  /**
   * enables all rule actions
   */
  externalRuleActions = 'external_rule_actions',

  /**
   * enables Cloud Security Posture - CSPM, KSPM, CNVM
   */
  cloudSecurityPosture = 'cloud_security_posture',

  /**
   * enables the integration assistant
   */
  integrationAssistant = 'integration_assistant',
}

export enum ProductFeatureCasesKey {
  /**
   * Enables Cases Connectors
   */
  casesConnectors = 'cases_connectors',
}

export enum ProductFeatureAssistantKey {
  /**
   * Enables Elastic AI Assistant
   */
  assistant = 'assistant',
}

export enum ProductFeatureAttackDiscoveryKey {
  /**
   * Enables Attack discovery
   */
  attackDiscovery = 'attack_discovery',
}

// Merges the two enums.
export const ProductFeatureKey = {
  ...ProductFeatureSecurityKey,
  ...ProductFeatureCasesKey,
  ...ProductFeatureAssistantKey,
  ...ProductFeatureAttackDiscoveryKey,
};
// We need to merge the value and the type and export both to replicate how enum works.
export type ProductFeatureKeyType =
  | ProductFeatureSecurityKey
  | ProductFeatureCasesKey
  | ProductFeatureAssistantKey
  | ProductFeatureAttackDiscoveryKey;

export const ALL_PRODUCT_FEATURE_KEYS = Object.freeze(Object.values(ProductFeatureKey));

/** Sub-features IDs for Security */
export enum SecuritySubFeatureId {
  endpointList = 'endpointListSubFeature',
  endpointExceptions = 'endpointExceptionsSubFeature',
  trustedApplications = 'trustedApplicationsSubFeature',
  hostIsolationExceptionsBasic = 'hostIsolationExceptionsBasicSubFeature',
  blocklist = 'blocklistSubFeature',
  eventFilters = 'eventFiltersSubFeature',
  policyManagement = 'policyManagementSubFeature',
  responseActionsHistory = 'responseActionsHistorySubFeature',
  hostIsolation = 'hostIsolationSubFeature',
  processOperations = 'processOperationsSubFeature',
  fileOperations = 'fileOperationsSubFeature',
  executeAction = 'executeActionSubFeature',
  scanAction = 'scanActionSubFeature',
}

/** Sub-features IDs for Cases */
export enum CasesSubFeatureId {
  deleteCases = 'deleteCasesSubFeature',
  casesSettings = 'casesSettingsSubFeature',
}

/** Sub-features IDs for Security Assistant */
export enum AssistantSubFeatureId {
  updateAnonymization = 'updateAnonymizationSubFeature',
}
