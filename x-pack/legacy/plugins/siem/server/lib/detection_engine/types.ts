/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esFilters } from '../../../../../../../src/plugins/data/server';

export type PartialFilter = Partial<esFilters.Filter>;

export interface IMitreAttack {
  id: string;
  name: string;
  reference: string;
}

export interface ThreatParams {
  framework: string;
  tactic: IMitreAttack;
  techniques: IMitreAttack[];
}

export interface RuleAlertParams {
  description: string;
  enabled: boolean;
  falsePositives: string[];
  filters: PartialFilter[] | undefined | null;
  from: string;
  immutable: boolean;
  index: string[];
  interval: string;
  ruleId: string | undefined | null;
  language: string | undefined | null;
  maxSignals: number;
  riskScore: number;
  outputIndex: string;
  name: string;
  query: string | undefined | null;
  references: string[];
  savedId: string | undefined | null;
  meta: Record<string, {}> | undefined | null;
  severity: string;
  tags: string[];
  to: string;
  threats: ThreatParams[] | undefined | null;
  type: 'query' | 'saved_query';
  version: number;
}

export type RuleTypeParams = Omit<RuleAlertParams, 'name' | 'enabled' | 'interval' | 'tags'>;

export type RuleAlertParamsRest = Omit<
  RuleAlertParams,
  'ruleId' | 'falsePositives' | 'maxSignals' | 'savedId' | 'riskScore' | 'outputIndex'
> & {
  rule_id: RuleAlertParams['ruleId'];
  false_positives: RuleAlertParams['falsePositives'];
  saved_id: RuleAlertParams['savedId'];
  max_signals: RuleAlertParams['maxSignals'];
  risk_score: RuleAlertParams['riskScore'];
  output_index: RuleAlertParams['outputIndex'];
};

export type OutputRuleAlertRest = RuleAlertParamsRest & {
  id: string;
  created_by: string | undefined | null;
  updated_by: string | undefined | null;
};

export type CallWithRequest<T, U, V> = (endpoint: string, params: T, options?: U) => Promise<V>;
