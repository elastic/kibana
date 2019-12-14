/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionsClient } from '../../../../../actions';
import { AlertsClient } from '../../../../../alerting';
import { createRules } from './create_rules';
import { RuleAlertParamsRest } from '../types';

export const installPrepackagedRules = async (
  alertsClient: AlertsClient,
  actionsClient: ActionsClient,
  rules: RuleAlertParamsRest[],
  outputIndex: string
): Promise<void> => {
  await rules.forEach(async rule => {
    const {
      description,
      enabled,
      false_positives: falsePositives,
      from,
      immutable,
      query,
      language,
      saved_id: savedId,
      meta,
      filters,
      rule_id: ruleId,
      index,
      interval,
      max_signals: maxSignals,
      risk_score: riskScore,
      name,
      severity,
      tags,
      to,
      type,
      threats,
      references,
    } = rule;
    createRules({
      alertsClient,
      actionsClient,
      description,
      enabled,
      falsePositives,
      from,
      immutable,
      query,
      language,
      outputIndex,
      savedId,
      meta,
      filters,
      ruleId,
      index,
      interval,
      maxSignals,
      riskScore,
      name,
      severity,
      tags,
      to,
      type,
      threats,
      references,
    });
  });
};
