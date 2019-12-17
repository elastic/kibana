/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pickBy } from 'lodash/fp';
import { RuleTypeParams, OutputRuleAlertRest } from '../types';

interface BuildRuleParams {
  ruleParams: RuleTypeParams;
  name: string;
  id: string;
  enabled: boolean;
  createdBy: string;
  updatedBy: string;
  interval: string;
  tags: string[];
}

export const buildRule = ({
  ruleParams,
  name,
  id,
  enabled,
  createdBy,
  updatedBy,
  interval,
  tags,
}: BuildRuleParams): Partial<OutputRuleAlertRest> => {
  return pickBy<OutputRuleAlertRest>((value: unknown) => value != null, {
    id,
    rule_id: ruleParams.ruleId,
    false_positives: ruleParams.falsePositives,
    saved_id: ruleParams.savedId,
    meta: ruleParams.meta,
    max_signals: ruleParams.maxSignals,
    risk_score: ruleParams.riskScore,
    output_index: ruleParams.outputIndex,
    description: ruleParams.description,
    from: ruleParams.from,
    immutable: ruleParams.immutable,
    index: ruleParams.index,
    interval,
    language: ruleParams.language,
    name,
    query: ruleParams.query,
    references: ruleParams.references,
    severity: ruleParams.severity,
    tags,
    type: ruleParams.type,
    to: ruleParams.to,
    enabled,
    filters: ruleParams.filters,
    created_by: createdBy,
    updated_by: updatedBy,
    threats: ruleParams.threats,
    version: ruleParams.version,
  });
};
