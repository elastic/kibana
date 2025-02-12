/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110895

export type {
  SubFeature,
  ActionType,
  ValidatedEmail,
  ActionTypeExecutorResult,
  ActionTypeExecutorRawResult,
  ActionsPublicConfigType,
} from './types';
export { InvalidEmailReason, isActionTypeExecutorResult } from './types';
export {
  ALERT_HISTORY_PREFIX,
  AlertHistoryDefaultIndexName,
  AlertHistoryEsIndexConnectorId,
  buildAlertHistoryDocument,
  AlertHistoryDocumentTemplate,
} from './alert_history_schema';
export type {
  AsApiContract,
  RewriteRequestCase,
  RewriteResponseCase,
} from './rewrite_request_case';
export {
  MustacheInEmailRegExp,
  hasMustacheTemplate,
  withoutMustacheTemplate,
} from './mustache_template';
export type { ValidateEmailAddressesOptions } from './validate_email_addresses';
export {
  validateEmailAddressesAsAlwaysValid,
  validateEmailAddresses,
  invalidEmailsAsMessage,
} from './validate_email_addresses';
export {
  AlertingConnectorFeatureId,
  CasesConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
  GenerativeAIForSecurityConnectorFeatureId,
  GenerativeAIForObservabilityConnectorFeatureId,
  GenerativeAIForSearchPlaygroundConnectorFeatureId,
  EndpointSecurityConnectorFeatureId,
  AlertingConnectorFeature,
  CasesConnectorFeature,
  UptimeConnectorFeature,
  SecuritySolutionFeature,
  GenerativeAIForSecurityFeature,
  GenerativeAIForObservabilityFeature,
  GenerativeAIForSearchPlaygroundFeature,
  EndpointSecurityConnectorFeature,
  areValidFeatures,
  getConnectorFeatureName,
  getConnectorCompatibility,
} from './connector_feature_config';
export type {
  IExecutionLog,
  IExecutionLogResult,
  GetGlobalExecutionLogParams,
  GetGlobalExecutionKPIParams,
  IExecutionKPIResult,
  ExecutionLogSortFields,
} from './execution_log_types';
export { EMPTY_EXECUTION_KPI_RESULT, executionLogSortableColumns } from './execution_log_types';
export { validateEmptyStrings } from './validate_empty_strings';

export const BASE_ACTION_API_PATH = '/api/actions';
export const INTERNAL_BASE_ACTION_API_PATH = '/internal/actions';
export const ACTIONS_FEATURE_ID = 'actions';

export const DEFAULT_MICROSOFT_EXCHANGE_URL = 'https://login.microsoftonline.com';
export const DEFAULT_MICROSOFT_GRAPH_API_URL = 'https://graph.microsoft.com/v1.0';
export const DEFAULT_MICROSOFT_GRAPH_API_SCOPE = 'https://graph.microsoft.com/.default';
