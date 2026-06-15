/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { getNonEmptyField } from './string_utils';

export interface AlertRulePathOverrides {
  /**
   * Additional alert field paths to consult when resolving the rule id, before
   * the default ECS path (`kibana.alert.rule.uuid`). Use this to support
   * legacy/non-ECS shapes such as `signal.rule.id` (Security signals).
   */
  extraIdPaths?: string[];
  /**
   * Additional alert field paths to consult when resolving the rule name,
   * before the default ECS path (`kibana.alert.rule.name`).
   */
  extraNamePaths?: string[];
}

const resolveFromPaths = (
  alertData: unknown,
  paths: string[] | undefined,
  defaultPath: string
): string | null => {
  if (paths) {
    for (const path of paths) {
      const value = getNonEmptyField(get(alertData, path));
      if (value != null) {
        return value;
      }
    }
  }
  return getNonEmptyField(get(alertData, defaultPath));
};

/**
 * Returns the first non-empty rule id from (in order):
 * 1) the attachment's own ruleId metadata,
 * 2) any solution-specific extra alert paths,
 * 3) the ECS `kibana.alert.rule.uuid` path on the fetched alert.
 */
export const getRuleId = (
  attachmentRuleId: string | null | undefined,
  alertData?: unknown,
  options?: AlertRulePathOverrides
): string | null =>
  getNonEmptyField(attachmentRuleId) ??
  resolveFromPaths(alertData, options?.extraIdPaths, ALERT_RULE_UUID);

/**
 * Returns the first non-empty rule name from (in order):
 * 1) the attachment's own ruleName metadata,
 * 2) any solution-specific extra alert paths,
 * 3) the ECS `kibana.alert.rule.name` path on the fetched alert.
 */
export const getRuleName = (
  attachmentRuleName: string | null | undefined,
  alertData?: unknown,
  options?: AlertRulePathOverrides
): string | null =>
  getNonEmptyField(attachmentRuleName) ??
  resolveFromPaths(alertData, options?.extraNamePaths, ALERT_RULE_NAME);

export interface ResolvedRuleInfo {
  ruleId: string | null;
  ruleName: string | null;
}

export interface GetRuleInfoArgs extends AlertRulePathOverrides {
  ruleId: string | null | undefined;
  ruleName: string | null | undefined;
  alertId?: string;
  alertData?: Record<string, unknown>;
}

/**
 * Resolves the rule id and rule name to display for an alert attachment by
 * combining the attachment's own metadata with the alert document fetched at
 * render time. Returns `null` for either field when nothing can be resolved.
 */
export const getRuleInfo = ({
  ruleId,
  ruleName,
  alertId,
  alertData,
  extraIdPaths,
  extraNamePaths,
}: GetRuleInfoArgs): ResolvedRuleInfo => {
  const nonEmptyAlertId = getNonEmptyField(alertId);
  const alertField: unknown = nonEmptyAlertId && alertData ? alertData[nonEmptyAlertId] : undefined;

  return {
    ruleId: getRuleId(ruleId, alertField, { extraIdPaths }),
    ruleName: getRuleName(ruleName, alertField, { extraNamePaths }),
  };
};
