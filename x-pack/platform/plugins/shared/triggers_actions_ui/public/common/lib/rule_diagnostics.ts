/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ApiKeyAuthErrorKind } from '@kbn/alerting-plugin/common';
import {
  LEGACY_MISSING_UIAM_API_KEY_TAG,
  MISSING_UIAM_API_KEY_TAG,
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
  getApiKeyAuthErrorKind,
} from '@kbn/alerting-plugin/common';
import type { Rule } from '../../types';

export type RuleDiagnosisActionId =
  | 'editRule'
  | 'updateApiKey'
  | 'enableRule'
  | 'runRule'
  | 'manageLicense'
  | 'viewRuleDetails';

export type RuleDiagnosisSeverity = 'danger' | 'warning';

export interface RuleDiagnosis {
  id: string;
  severity: RuleDiagnosisSeverity;
  title: string;
  description: string;
  /** Raw messages reported by the last run, shown verbatim to the user. */
  messages: string[];
  primaryAction?: RuleDiagnosisActionId;
  secondaryActions: RuleDiagnosisActionId[];
}

type DiagnosisTemplate = Omit<RuleDiagnosis, 'messages'>;

const translate = (key: string, defaultMessage: string) =>
  i18n.translate(`xpack.triggersActionsUI.ruleDiagnostics.${key}`, { defaultMessage });

const ERROR_DIAGNOSES: Record<RuleExecutionStatusErrorReasons, DiagnosisTemplate> = {
  [RuleExecutionStatusErrorReasons.Decrypt]: {
    id: 'decrypt',
    severity: 'danger',
    title: translate('decrypt.title', 'Stored credentials could not be decrypted'),
    description: translate(
      'decrypt.description',
      'The API key saved with this rule can no longer be read. This usually happens after the encryption key changed or the rule was imported from another deployment. Updating the API key stores a fresh credential.'
    ),
    primaryAction: 'updateApiKey',
    secondaryActions: ['viewRuleDetails'],
  },
  [RuleExecutionStatusErrorReasons.License]: {
    id: 'license',
    severity: 'danger',
    title: translate('license.title', 'Rule type is not covered by the current license'),
    description: translate(
      'license.description',
      'The rule will not run until the license includes this rule type.'
    ),
    primaryAction: 'manageLicense',
    secondaryActions: [],
  },
  [RuleExecutionStatusErrorReasons.Validate]: {
    id: 'validate',
    severity: 'danger',
    title: translate('validate.title', 'Rule parameters are no longer valid'),
    description: translate(
      'validate.description',
      'The rule configuration failed validation when it last ran. Open the rule and correct the highlighted parameters.'
    ),
    primaryAction: 'editRule',
    secondaryActions: ['viewRuleDetails'],
  },
  [RuleExecutionStatusErrorReasons.Execute]: {
    id: 'execute',
    severity: 'danger',
    title: translate('execute.title', 'Rule failed while running'),
    description: translate(
      'execute.description',
      'The rule type reported an error during the last run. The message below usually names the missing field, invalid query, or unreachable data behind it.'
    ),
    primaryAction: 'editRule',
    secondaryActions: ['runRule', 'viewRuleDetails'],
  },
  [RuleExecutionStatusErrorReasons.Timeout]: {
    id: 'timeout',
    severity: 'danger',
    title: translate('timeout.title', 'Rule run timed out'),
    description: translate(
      'timeout.description',
      'The last run exceeded the allowed execution time. Narrow the query, reduce the look-back window, or increase the interval.'
    ),
    primaryAction: 'editRule',
    secondaryActions: ['viewRuleDetails'],
  },
  [RuleExecutionStatusErrorReasons.Disabled]: {
    id: 'disabled',
    severity: 'warning',
    title: translate('disabled.title', 'Rule was disabled during its last run'),
    description: translate(
      'disabled.description',
      'The rule was disabled while it was running, so the run did not complete. Enable the rule to resume scheduling.'
    ),
    primaryAction: 'enableRule',
    secondaryActions: [],
  },
  [RuleExecutionStatusErrorReasons.Read]: {
    id: 'read',
    severity: 'danger',
    title: translate('read.title', 'Rule could not be read'),
    description: translate(
      'read.description',
      'The rule document could not be loaded for the last run. This is usually transient; run the rule again and check the run history if it persists.'
    ),
    primaryAction: 'runRule',
    secondaryActions: ['viewRuleDetails'],
  },
  [RuleExecutionStatusErrorReasons.Unknown]: {
    id: 'unknown',
    severity: 'danger',
    title: translate('unknown.title', 'Rule failed for an unknown reason'),
    description: translate(
      'unknown.description',
      'The framework could not classify the failure. Run the rule again and inspect the run history for details.'
    ),
    primaryAction: 'runRule',
    secondaryActions: ['viewRuleDetails'],
  },
  [RuleExecutionStatusErrorReasons.Unauthorized]: {
    id: 'unauthorized',
    severity: 'danger',
    title: translate('unauthorized.title', 'Rule API key was rejected'),
    description: translate(
      'unauthorized.description',
      'Elasticsearch refused to authenticate the API key stored with this rule, so every run fails before the query executes. The key was most likely deleted, revoked or expired. Update the API key to store a fresh credential.'
    ),
    primaryAction: 'updateApiKey',
    secondaryActions: ['runRule', 'viewRuleDetails'],
  },
  [RuleExecutionStatusErrorReasons.Forbidden]: {
    id: 'forbidden',
    severity: 'danger',
    title: translate('forbidden.title', 'Rule API key lacks the required privileges'),
    description: translate(
      'forbidden.description',
      'The API key stored with this rule is valid but is not allowed to perform the operation the rule needs, usually because the owning user\u2019s roles or index access changed. Update the API key while signed in as a user with the required privileges.'
    ),
    primaryAction: 'updateApiKey',
    secondaryActions: ['runRule', 'viewRuleDetails'],
  },
  [RuleExecutionStatusErrorReasons.NotFound]: {
    id: 'notFound',
    severity: 'danger',
    title: translate('notFound.title', 'Rule data source no longer exists'),
    description: translate(
      'notFound.description',
      'An index, data view or other object the rule depends on could not be found. Open the rule and point it at an existing data source.'
    ),
    primaryAction: 'editRule',
    secondaryActions: ['viewRuleDetails'],
  },
  [RuleExecutionStatusErrorReasons.Unavailable]: {
    id: 'unavailable',
    severity: 'danger',
    title: translate('unavailable.title', 'Elasticsearch was unavailable'),
    description: translate(
      'unavailable.description',
      'Elasticsearch could not be reached or refused the request during the last run. There is nothing to fix in the rule itself; it will retry on its next scheduled run. If this persists, check cluster health and capacity.'
    ),
    primaryAction: 'runRule',
    secondaryActions: ['viewRuleDetails'],
  },
};

const WARNING_DIAGNOSES: Record<RuleExecutionStatusWarningReasons, DiagnosisTemplate> = {
  [RuleExecutionStatusWarningReasons.MAX_ALERTS]: {
    id: 'maxAlerts',
    severity: 'warning',
    title: translate('maxAlerts.title', 'Alert limit reached'),
    description: translate(
      'maxAlerts.description',
      'The rule generated more alerts than the configured limit, so some alerts were not reported. Narrow the query or raise the threshold so fewer documents match.'
    ),
    primaryAction: 'editRule',
    secondaryActions: ['viewRuleDetails'],
  },
  [RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS]: {
    id: 'maxExecutableActions',
    severity: 'warning',
    title: translate('maxExecutableActions.title', 'Action limit reached'),
    description: translate(
      'maxExecutableActions.description',
      'The rule tried to run more actions than allowed in a single run, so some notifications were skipped. Reduce the number of actions or use a summary action.'
    ),
    primaryAction: 'editRule',
    secondaryActions: ['viewRuleDetails'],
  },
  [RuleExecutionStatusWarningReasons.MAX_QUEUED_ACTIONS]: {
    id: 'maxQueuedActions',
    severity: 'warning',
    title: translate('maxQueuedActions.title', 'Action queue limit reached'),
    description: translate(
      'maxQueuedActions.description',
      'Too many actions were queued across rules, so some of this rule\u2019s actions were dropped. Reduce action volume or increase the queued action limit.'
    ),
    primaryAction: 'editRule',
    secondaryActions: ['viewRuleDetails'],
  },
  [RuleExecutionStatusWarningReasons.EXECUTION]: {
    id: 'ruleExecution',
    severity: 'warning',
    title: translate('ruleExecution.title', 'Rule reported a warning'),
    description: translate(
      'ruleExecution.description',
      'The rule type completed but flagged a problem during the last run. The message below describes it.'
    ),
    primaryAction: 'editRule',
    secondaryActions: ['viewRuleDetails'],
  },
};

const MISSING_API_KEY_DIAGNOSIS: DiagnosisTemplate = {
  id: 'missingApiKey',
  severity: 'warning',
  title: translate('missingApiKey.title', 'Rule is missing an Elastic Cloud API key'),
  description: translate(
    'missingApiKey.description',
    'An Elastic Cloud API key could not be created for this rule, so it still runs with an Elasticsearch API key tied to the user who last saved it. Update the API key while signed in as an organization member to switch it to an organization-level key.'
  ),
  primaryAction: 'updateApiKey',
  secondaryActions: [],
};

const API_KEY_AUTH_ERROR_DIAGNOSES: Record<ApiKeyAuthErrorKind, DiagnosisTemplate> = {
  missing: {
    id: 'apiKeyMissing',
    severity: 'danger',
    title: translate('apiKeyMissing.title', 'Rule API key no longer exists'),
    description: translate(
      'apiKeyMissing.description',
      'Elasticsearch rejected the API key stored with this rule because it could not be found (error code 0x28D520). The key was most likely deleted or belongs to a user who was removed. Update the API key to store a fresh credential.'
    ),
    primaryAction: 'updateApiKey',
    secondaryActions: ['runRule', 'viewRuleDetails'],
  },
  revoked: {
    id: 'apiKeyRevoked',
    severity: 'danger',
    title: translate('apiKeyRevoked.title', 'Rule API key has been revoked'),
    description: translate(
      'apiKeyRevoked.description',
      'The API key stored with this rule was invalidated, so every run is rejected before the query executes. Update the API key to store a fresh credential.'
    ),
    primaryAction: 'updateApiKey',
    secondaryActions: ['runRule', 'viewRuleDetails'],
  },
  expired: {
    id: 'apiKeyExpired',
    severity: 'danger',
    title: translate('apiKeyExpired.title', 'Rule API key has expired'),
    description: translate(
      'apiKeyExpired.description',
      'The API key stored with this rule passed its expiration date, so every run is rejected before the query executes. Update the API key to store a fresh credential.'
    ),
    primaryAction: 'updateApiKey',
    secondaryActions: ['runRule', 'viewRuleDetails'],
  },
  rejected: {
    id: 'apiKeyRejected',
    severity: 'danger',
    title: translate('apiKeyRejected.title', 'Rule API key was rejected'),
    description: translate(
      'apiKeyRejected.description',
      'Elasticsearch refused to authenticate the API key stored with this rule. Update the API key to store a fresh credential, then run the rule again.'
    ),
    primaryAction: 'updateApiKey',
    secondaryActions: ['runRule', 'viewRuleDetails'],
  },
};

const GENERIC_FAILURE_DIAGNOSIS: DiagnosisTemplate = {
  id: 'failed',
  severity: 'danger',
  title: translate('failed.title', 'Last run failed'),
  description: translate(
    'failed.description',
    'The last run did not succeed. Run the rule again and inspect the run history for details.'
  ),
  primaryAction: 'runRule',
  secondaryActions: ['viewRuleDetails'],
};

const GENERIC_WARNING_DIAGNOSIS: DiagnosisTemplate = {
  id: 'warning',
  severity: 'warning',
  title: translate('warning.title', 'Last run completed with a warning'),
  description: translate(
    'warning.description',
    'The last run completed but reported a warning. Inspect the run history for details.'
  ),
  primaryAction: 'viewRuleDetails',
  secondaryActions: [],
};

const isErrorReason = (reason: string): reason is RuleExecutionStatusErrorReasons =>
  Object.values<string>(RuleExecutionStatusErrorReasons).includes(reason);

const isWarningReason = (reason: string): reason is RuleExecutionStatusWarningReasons =>
  Object.values<string>(RuleExecutionStatusWarningReasons).includes(reason);

const getLastRunReason = (rule: Rule): string | undefined =>
  rule.lastRun?.warning ??
  rule.executionStatus?.error?.reason ??
  rule.executionStatus?.warning?.reason ??
  undefined;

const getLastRunMessages = (rule: Rule): string[] => {
  // `outcomeMsg` is typed as an array, but older rules and some callers still hand us a plain string.
  const outcomeMsg = rule.lastRun?.outcomeMsg as string[] | string | null | undefined;
  const outcomeMsgList = Array.isArray(outcomeMsg) ? outcomeMsg : [outcomeMsg];
  const outcomeMessages = outcomeMsgList.filter(
    (message): message is string => typeof message === 'string' && message.length > 0
  );
  if (outcomeMessages.length > 0) {
    return outcomeMessages;
  }
  const statusMessage =
    rule.executionStatus?.error?.message ?? rule.executionStatus?.warning?.message;
  return statusMessage ? [statusMessage] : [];
};

const getApiKeyAuthErrorDiagnosis = (rule: Rule, messages: string[]): RuleDiagnosis | undefined => {
  if (rule.lastRun?.outcome !== 'failed' && rule.executionStatus?.status !== 'error') {
    return undefined;
  }
  for (const message of messages) {
    const kind = getApiKeyAuthErrorKind(message);
    if (kind) {
      return { ...API_KEY_AUTH_ERROR_DIAGNOSES[kind], messages };
    }
  }
  return undefined;
};

const getLastRunDiagnosis = (rule: Rule): RuleDiagnosis | undefined => {
  const outcome = rule.lastRun?.outcome;
  const reason = getLastRunReason(rule);
  const messages = getLastRunMessages(rule);

  // Rules that last ran on an older Kibana carry authentication failures as a generic `execute`
  // error; detect them from the message so the suggested fix is still to rotate the API key.
  // Newer runs report `unauthorized` directly, where the message only refines the title.
  const apiKeyAuthErrorDiagnosis = getApiKeyAuthErrorDiagnosis(rule, messages);
  if (
    apiKeyAuthErrorDiagnosis &&
    (reason === undefined ||
      reason === RuleExecutionStatusErrorReasons.Execute ||
      reason === RuleExecutionStatusErrorReasons.Unauthorized ||
      reason === RuleExecutionStatusErrorReasons.Unknown)
  ) {
    return apiKeyAuthErrorDiagnosis;
  }

  if (reason && isErrorReason(reason)) {
    const template = ERROR_DIAGNOSES[reason];
    if (reason === RuleExecutionStatusErrorReasons.Disabled && rule.enabled) {
      return { ...template, messages, primaryAction: 'runRule', secondaryActions: [] };
    }
    return { ...template, messages };
  }
  if (reason && isWarningReason(reason)) {
    return { ...WARNING_DIAGNOSES[reason], messages };
  }
  if (outcome === 'failed' || rule.executionStatus?.status === 'error') {
    return { ...GENERIC_FAILURE_DIAGNOSIS, messages };
  }
  if (outcome === 'warning' || rule.executionStatus?.status === 'warning') {
    return { ...GENERIC_WARNING_DIAGNOSIS, messages };
  }
  return undefined;
};

const hasMissingApiKeyTag = (rule: Rule): boolean =>
  (rule.tags ?? []).some(
    (tag) => tag === MISSING_UIAM_API_KEY_TAG || tag === LEGACY_MISSING_UIAM_API_KEY_TAG
  );

/** Returns the problems detected on a rule from its last run and tags, most severe first. */
export const diagnoseRule = (rule: Rule): RuleDiagnosis[] => {
  const diagnoses: RuleDiagnosis[] = [];
  const lastRunDiagnosis = getLastRunDiagnosis(rule);
  if (lastRunDiagnosis) {
    diagnoses.push(lastRunDiagnosis);
  }
  if (hasMissingApiKeyTag(rule)) {
    diagnoses.push({ ...MISSING_API_KEY_DIAGNOSIS, messages: [] });
  }
  return diagnoses;
};

export const isRuleDiagnosable = (rule: Rule): boolean => diagnoseRule(rule).length > 0;
