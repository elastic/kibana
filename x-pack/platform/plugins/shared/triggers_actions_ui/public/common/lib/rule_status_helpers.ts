/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RuleLastRunOutcomes, RuleExecutionStatuses } from '@kbn/alerting-plugin/common';
import { RuleExecutionStatusErrorReasons } from '@kbn/alerting-plugin/common';
import { type EuiThemeComputed } from '@elastic/eui';
import { getIsExperimentalFeatureEnabled } from '../get_experimental_features';
import type { Rule } from '../../types';

export const getOutcomeHealthColor = (status: RuleLastRunOutcomes, euiTheme: EuiThemeComputed) => {
  switch (status) {
    case 'succeeded':
      return euiTheme.colors.success;
    case 'failed':
      return euiTheme.colors.danger;
    case 'warning':
      return euiTheme.colors.warning;
    default:
      return 'subdued';
  }
};

export const getExecutionStatusHealthColor = (
  status: RuleExecutionStatuses,
  euiTheme: EuiThemeComputed
) => {
  switch (status) {
    case 'active':
      return euiTheme.colors.success;
    case 'error':
      return euiTheme.colors.danger;
    case 'ok':
      return euiTheme.colors.primary;
    case 'pending':
      return euiTheme.colors.accent;
    case 'warning':
      return euiTheme.colors.warning;
    default:
      return 'subdued';
  }
};

export const getRuleHealthColor = (rule: Rule, euiTheme: EuiThemeComputed) => {
  const isRuleUsingExecutionStatus = getIsExperimentalFeatureEnabled('ruleUseExecutionStatus');
  if (isRuleUsingExecutionStatus) {
    return getExecutionStatusHealthColor(rule.executionStatus.status, euiTheme);
  }
  return (rule.lastRun && getOutcomeHealthColor(rule.lastRun.outcome, euiTheme)) || 'subdued';
};

export const getIsLicenseError = (rule: Rule) => {
  return (
    rule.lastRun?.warning === RuleExecutionStatusErrorReasons.License ||
    rule.executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License
  );
};

export const getRuleStatusMessage = ({
  rule,
  licenseErrorText,
  lastOutcomeTranslations,
  executionStatusTranslations,
}: {
  rule: Rule;
  licenseErrorText: string;
  lastOutcomeTranslations: Record<string, string>;
  executionStatusTranslations: Record<string, string>;
}) => {
  const isLicenseError = getIsLicenseError(rule);
  const isRuleUsingExecutionStatus = getIsExperimentalFeatureEnabled('ruleUseExecutionStatus');

  if (isLicenseError) {
    return licenseErrorText;
  }
  if (isRuleUsingExecutionStatus) {
    return executionStatusTranslations[rule.executionStatus.status];
  }
  return rule.lastRun && lastOutcomeTranslations[rule.lastRun.outcome];
};
