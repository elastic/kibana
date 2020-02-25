/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallAPIOptions } from '../../../../../../../src/core/server';
import { Filter } from '../../../../../../../src/plugins/data/server';
import { IRuleStatusAttributes } from './rules/types';

export type PartialFilter = Partial<Filter>;

export interface IMitreAttack {
  id: string;
  name: string;
  reference: string;
}

export interface ThreatParams {
  framework: string;
  tactic: IMitreAttack;
  technique: IMitreAttack[];
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
  timelineId: string | undefined | null;
  timelineTitle: string | undefined | null;
  threat: ThreatParams[] | undefined | null;
  type: 'query' | 'saved_query';
  version: number;
}

export type RuleTypeParams = Omit<RuleAlertParams, 'name' | 'enabled' | 'interval' | 'tags'>;

export type RuleAlertParamsRest = Omit<
  RuleAlertParams,
  | 'ruleId'
  | 'falsePositives'
  | 'immutable'
  | 'maxSignals'
  | 'savedId'
  | 'riskScore'
  | 'timelineId'
  | 'timelineTitle'
  | 'outputIndex'
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
    created_at: string;
    updated_at: string;
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
  immutable: boolean;
};

export type ImportRuleAlertRest = Omit<OutputRuleAlertRest, 'rule_id' | 'id'> & {
  id: string | undefined | null;
  rule_id: string;
  immutable: boolean;
};

export type PrepackagedRules = Omit<
  RuleAlertParamsRest,
  | 'status'
  | 'status_date'
  | 'last_failure_at'
  | 'last_success_at'
  | 'last_failure_message'
  | 'last_success_message'
  | 'updated_at'
  | 'created_at'
> & { rule_id: string; immutable: boolean };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CallWithRequest<T extends Record<string, any>, V> = (
  endpoint: string,
  params: T,
  options?: CallAPIOptions
) => Promise<V>;
