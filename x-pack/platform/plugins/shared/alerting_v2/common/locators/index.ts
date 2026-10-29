/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  AlertingV2RulesLocatorDefinition,
  AlertingV2RuleLibraryLocatorDefinition,
  AlertingV2EpisodesLocatorDefinition,
  AlertingV2ActionPoliciesLocatorDefinition,
  AlertingV2ExecutionHistoryLocatorDefinition,
  createAlertingV2HostApp,
} from './locators';
export type {
  AlertingV2HostApp,
  AlertingV2RulesLocatorParams,
  AlertingV2RuleLibraryLocatorParams,
  AlertingV2EpisodesLocatorParams,
  AlertingV2ActionPoliciesLocatorParams,
  AlertingV2ExecutionHistoryLocatorParams,
} from './locators';
export type { CreateAlertingV2HostApp } from './locator_host';
export { OBSERVABILITY_ALERTING_HOST } from './observability_alerting_host';
