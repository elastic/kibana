/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esFilters } from '../../../../../../../src/plugins/data/server';
import { IRuleStatusAttributes } from './rules/types';

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
  createdAt: string;
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
  timelineId: string | undefined | null;
  timelineTitle: string | undefined | null;
  threats: ThreatParams[] | undefined | null;
  type: 'query' | 'saved_query';
  version: number;
  updatedAt: string;
}

export type RuleTypeParams = Omit<RuleAlertParams, 'name' | 'enabled' | 'interval' | 'tags'>;

export type RuleAlertParamsRest = Omit<
  RuleAlertParams,
  | 'ruleId'
  | 'falsePositives'
  | 'maxSignals'
  | 'savedId'
  | 'riskScore'
  | 'timelineId'
  | 'timelineTitle'
  | 'outputIndex'
  | 'updatedAt'
  | 'createdAt'
> &
  Omit<
    IRuleStatusAttributes,
    | 'status'
    | 'alertId'
    | 'statusDate'
    | 'lastFailureAt'
    | 'lastSuccessAt'
    | 'lastSuccessMessage'
    | 'lastFailureMessage'
  > & {
    rule_id: RuleAlertParams['ruleId'];
    false_positives: RuleAlertParams['falsePositives'];
    saved_id: RuleAlertParams['savedId'];
    timeline_id: RuleAlertParams['timelineId'];
    timeline_title: RuleAlertParams['timelineTitle'];
    max_signals: RuleAlertParams['maxSignals'];
    risk_score: RuleAlertParams['riskScore'];
    output_index: RuleAlertParams['outputIndex'];
    created_at: RuleAlertParams['createdAt'];
    updated_at: RuleAlertParams['updatedAt'];
    status?: IRuleStatusAttributes['status'] | undefined;
    status_date?: IRuleStatusAttributes['statusDate'] | undefined;
    last_failure_at?: IRuleStatusAttributes['lastFailureAt'] | undefined;
    last_success_at?: IRuleStatusAttributes['lastSuccessAt'] | undefined;
    last_failure_message?: IRuleStatusAttributes['lastFailureMessage'] | undefined;
    last_success_message?: IRuleStatusAttributes['lastSuccessMessage'] | undefined;
  };

export type OutputRuleAlertRest = RuleAlertParamsRest & {
  id: string;
  created_by: string | undefined | null;
  updated_by: string | undefined | null;
};

export type ImportRuleAlertRest = Omit<OutputRuleAlertRest, 'rule_id' | 'id'> & {
  id: string | undefined | null;
  rule_id: string;
};

export type CallWithRequest<T, U, V> = (endpoint: string, params: T, options?: U) => Promise<V>;
