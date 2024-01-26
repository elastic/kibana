/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SECURITY_UI_APP_ID = 'securitySolutionUI' as const;

export enum SecurityPageName {
  administration = 'administration',
  alerts = 'alerts',
  assets = 'assets',
  blocklist = 'blocklist',
  /*
   * Warning: Computed values are not permitted in an enum with string valued members
   * All Cases page names must match `CasesDeepLinkId` in x-pack/plugins/cases/public/common/navigation/deep_links.ts
   */
  case = 'cases', // must match `CasesDeepLinkId.cases`
  caseConfigure = 'cases_configure', // must match `CasesDeepLinkId.casesConfigure`
  caseCreate = 'cases_create', // must match `CasesDeepLinkId.casesCreate`
  /*
   * Warning: Computed values are not permitted in an enum with string valued members
   * All cloud security posture page names must match `CloudSecurityPosturePageId` in x-pack/plugins/cloud_security_posture/public/common/navigation/types.ts
   */
  cloudSecurityPostureBenchmarks = 'cloud_security_posture-benchmarks',
  cloudSecurityPostureDashboard = 'cloud_security_posture-dashboard',
  cloudSecurityPostureFindings = 'cloud_security_posture-findings',
  cloudSecurityPostureRules = 'cloud_security_posture-rules',
  /*
   * Warning: Computed values are not permitted in an enum with string valued members
   * All cloud defend page names must match `CloudDefendPageId` in x-pack/plugins/cloud_defend/public/common/navigation/types.ts
   */
  cloudDefend = 'cloud_defend',
  cloudDefendPolicies = 'cloud_defend-policies',
  dashboards = 'dashboards',
  dataQuality = 'data_quality',
  detections = 'detections',
  detectionAndResponse = 'detection_response',
  endpoints = 'endpoints',
  eventFilters = 'event_filters',
  exceptions = 'exceptions',
  exploreLanding = 'explore',
  hostIsolationExceptions = 'host_isolation_exceptions',
  hosts = 'hosts',
  hostsAnomalies = 'hosts-anomalies',
  hostsRisk = 'hosts-risk',
  hostsEvents = 'hosts-events',
  investigations = 'investigations',
  kubernetes = 'kubernetes',
  landing = 'get_started',
  mlLanding = 'machine_learning-landing', // serverless only
  network = 'network',
  networkAnomalies = 'network-anomalies',
  networkDns = 'network-dns',
  networkEvents = 'network-events',
  networkHttp = 'network-http',
  networkTls = 'network-tls',
  noPage = '',
  overview = 'overview',
  policies = 'policy',
  responseActionsHistory = 'response_actions_history',
  rules = 'rules',
  rulesAdd = 'rules-add',
  rulesCreate = 'rules-create',
  rulesLanding = 'rules-landing',
  sessions = 'sessions',
  /*
   * Warning: Computed values are not permitted in an enum with string valued members
   * All threat intelligence page names must match `TIPageId` in x-pack/plugins/threat_intelligence/public/common/navigation/types.ts
   */
  threatIntelligence = 'threat_intelligence',
  timelines = 'timelines',
  timelinesTemplates = 'timelines-templates',
  trustedApps = 'trusted_apps',
  uncommonProcesses = 'uncommon_processes',
  users = 'users',
  usersAnomalies = 'users-anomalies',
  usersAuthentications = 'users-authentications',
  usersEvents = 'users-events',
  usersRisk = 'users-risk',
  entityAnalytics = 'entity_analytics',
  entityAnalyticsManagement = 'entity_analytics-management',
  coverageOverview = 'coverage-overview',
}

export enum LinkCategoryType {
  title = 'title',
  collapsibleTitle = 'collapsibleTitle',
  accordion = 'accordion',
  separator = 'separator',
}
