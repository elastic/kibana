/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
} from '@kbn/alerting-plugin/common';

const translate = (key: string, defaultMessage: string) =>
  i18n.translate(`xpack.triggersActionsUI.sections.rulesHealth.${key}`, { defaultMessage });

export const HEALTH_PAGE_TITLE = translate('pageTitle', 'Health');

export const TOTAL_RULES_LABEL = translate('totalRulesLabel', 'Rules');
export const FAILED_RULES_LABEL = translate('failedRulesLabel', 'Failed');
export const WARNING_RULES_LABEL = translate('warningRulesLabel', 'Warning');
export const HEALTHY_RULES_LABEL = translate('healthyRulesLabel', 'Healthy');
export const MISSING_API_KEY_LABEL = translate('missingApiKeyLabel', 'Missing API key');
export const API_KEY_ERROR_LABEL = translate('apiKeyErrorLabel', 'API key rejected');

export const FAILURES_BY_REASON_TITLE = translate('failuresByReasonTitle', 'Failures by reason');
export const WARNINGS_BY_REASON_TITLE = translate('warningsByReasonTitle', 'Warnings by reason');
export const TOP_ERROR_MESSAGES_TITLE = translate('topErrorMessagesTitle', 'Top error messages');
export const NO_FAILURES_MESSAGE = translate('noFailuresMessage', 'No rules are failing.');
export const NO_WARNINGS_MESSAGE = translate('noWarningsMessage', 'No rules have warnings.');
export const NO_ERROR_MESSAGES_MESSAGE = translate(
  'noErrorMessagesMessage',
  'No error messages were recorded.'
);

export const RULES_NEEDING_ATTENTION_TITLE = translate(
  'rulesNeedingAttentionTitle',
  'Rules needing attention'
);
export const CLEAR_SELECTION_LABEL = translate('clearSelectionLabel', 'Show all problems');

export const TRENDS_TITLE = translate('trendsTitle', 'Execution trends');
export const EXECUTIONS_BY_OUTCOME_TITLE = translate(
  'executionsByOutcomeTitle',
  'Executions by outcome'
);
export const AVG_DURATION_TITLE = translate('avgDurationTitle', 'Average execution duration');
export const TOP_FAILING_RULES_TITLE = translate('topFailingRulesTitle', 'Most failing rules');
export const SLOWEST_RULES_TITLE = translate('slowestRulesTitle', 'Slowest rules');
export const NO_EXECUTIONS_MESSAGE = translate(
  'noExecutionsMessage',
  'No rule executions were recorded in this time range.'
);
export const NO_FAILING_RULES_MESSAGE = translate(
  'noFailingRulesMessage',
  'No rule failed in this time range.'
);
export const OUTCOME_SUCCESS_LABEL = translate('outcomeSuccessLabel', 'Succeeded');
export const OUTCOME_FAILURE_LABEL = translate('outcomeFailureLabel', 'Failed');
export const OUTCOME_WARNING_LABEL = translate('outcomeWarningLabel', 'Warning');
export const OUTCOME_UNKNOWN_LABEL = translate('outcomeUnknownLabel', 'Unknown');
export const DURATION_SERIES_LABEL = translate('durationSeriesLabel', 'Average duration');
export const RULE_COLUMN_TITLE = translate('ruleColumnTitle', 'Rule');
export const FAILURES_COLUMN_TITLE = translate('failuresColumnTitle', 'Failures');
export const LAST_FAILURE_COLUMN_TITLE = translate('lastFailureColumnTitle', 'Last failure');
export const EXECUTIONS_COLUMN_TITLE = translate('executionsColumnTitle', 'Executions');
export const AVG_DURATION_COLUMN_TITLE = translate('avgDurationColumnTitle', 'Avg. duration');

export const REASON_COLUMN_TITLE = translate('reasonColumnTitle', 'Reason');
export const MESSAGE_COLUMN_TITLE = translate('messageColumnTitle', 'Message');
export const RULES_COLUMN_TITLE = translate('rulesColumnTitle', 'Rules');

export const getRulesCountLabel = (count: number) =>
  i18n.translate('xpack.triggersActionsUI.sections.rulesHealth.rulesCountLabel', {
    defaultMessage: '{count, plural, one {# rule} other {# rules}}',
    values: { count },
  });

const ERROR_REASON_LABELS: Record<RuleExecutionStatusErrorReasons, string> = {
  [RuleExecutionStatusErrorReasons.Read]: translate('errorReason.read', 'Read error'),
  [RuleExecutionStatusErrorReasons.Decrypt]: translate('errorReason.decrypt', 'Decrypt error'),
  [RuleExecutionStatusErrorReasons.Execute]: translate('errorReason.execute', 'Execution error'),
  [RuleExecutionStatusErrorReasons.Unknown]: translate('errorReason.unknown', 'Unknown error'),
  [RuleExecutionStatusErrorReasons.License]: translate('errorReason.license', 'License error'),
  [RuleExecutionStatusErrorReasons.Timeout]: translate('errorReason.timeout', 'Timed out'),
  [RuleExecutionStatusErrorReasons.Disabled]: translate(
    'errorReason.disabled',
    'Disabled during run'
  ),
  [RuleExecutionStatusErrorReasons.Validate]: translate('errorReason.validate', 'Validation error'),
  [RuleExecutionStatusErrorReasons.Unauthorized]: translate(
    'errorReason.unauthorized',
    'API key rejected'
  ),
  [RuleExecutionStatusErrorReasons.Forbidden]: translate(
    'errorReason.forbidden',
    'Insufficient privileges'
  ),
  [RuleExecutionStatusErrorReasons.NotFound]: translate(
    'errorReason.notFound',
    'Data source not found'
  ),
  [RuleExecutionStatusErrorReasons.Unavailable]: translate(
    'errorReason.unavailable',
    'Elasticsearch unavailable'
  ),
};

const WARNING_REASON_LABELS: Record<RuleExecutionStatusWarningReasons, string> = {
  [RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS]: translate(
    'warningReason.maxExecutableActions',
    'Action limit reached'
  ),
  [RuleExecutionStatusWarningReasons.MAX_ALERTS]: translate(
    'warningReason.maxAlerts',
    'Alert limit reached'
  ),
  [RuleExecutionStatusWarningReasons.MAX_QUEUED_ACTIONS]: translate(
    'warningReason.maxQueuedActions',
    'Queued action limit reached'
  ),
  [RuleExecutionStatusWarningReasons.EXECUTION]: translate(
    'warningReason.ruleExecution',
    'Rule execution warning'
  ),
};

export const getErrorReasonLabel = (reason: string): string =>
  ERROR_REASON_LABELS[reason as RuleExecutionStatusErrorReasons] ?? reason;

export const getWarningReasonLabel = (reason: string): string =>
  WARNING_REASON_LABELS[reason as RuleExecutionStatusWarningReasons] ?? reason;
