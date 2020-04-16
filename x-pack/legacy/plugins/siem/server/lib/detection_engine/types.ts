/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallAPIOptions } from '../../../../../../../src/core/server';
import { Filter } from '../../../../../../../src/plugins/data/server';
import { IRuleStatusAttributes } from './rules/types';
import { ListsDefaultArraySchema } from './routes/schemas/types/lists_default_array';
import { RuleAlertAction, RuleType } from '../../../common/detection_engine/types';

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

// Notice below we are using lists: ListsDefaultArraySchema[]; which is coming directly from the response output section.
// TODO: Eventually this whole RuleAlertParams will be replaced with io-ts. For now we can slowly strangle it out and reduce duplicate types
// We don't have the input types defined through io-ts just yet but as we being introducing types from there we will more and more remove
// types and share them between input and output schema but have an input Rule Schema and an output Rule Schema.

export interface Meta {
  [key: string]: {} | string | undefined | null;
  kibana_siem_app_url?: string | undefined;
}

export interface RuleAlertParams {
  actions: RuleAlertAction[];
  anomalyThreshold: number | undefined;
  description: string;
  note: string | undefined | null;
  enabled: boolean;
  falsePositives: string[];
  filters: PartialFilter[] | undefined | null;
  from: string;
  immutable: boolean;
  index: string[] | undefined | null;
  interval: string;
  ruleId: string | undefined | null;
  language: string | undefined | null;
  maxSignals: number;
  machineLearningJobId: string | undefined;
  riskScore: number;
  outputIndex: string;
  name: string;
  query: string | undefined | null;
  references: string[];
  savedId?: string | undefined | null;
  meta: Meta | undefined | null;
  severity: string;
  tags: string[];
  to: string;
  timelineId: string | undefined | null;
  timelineTitle: string | undefined | null;
  threat: ThreatParams[] | undefined | null;
  type: RuleType;
  version: number;
  throttle: string | undefined | null;
  lists: ListsDefaultArraySchema | null | undefined;
}

export type RuleTypeParams = Omit<
  RuleAlertParams,
  'name' | 'enabled' | 'interval' | 'tags' | 'actions' | 'throttle'
>;

export type RuleAlertParamsRest = Omit<
  RuleAlertParams,
  | 'anomalyThreshold'
  | 'ruleId'
  | 'falsePositives'
  | 'immutable'
  | 'maxSignals'
  | 'machineLearningJobId'
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
    anomaly_threshold: RuleAlertParams['anomalyThreshold'];
    rule_id: RuleAlertParams['ruleId'];
    false_positives: RuleAlertParams['falsePositives'];
    saved_id?: RuleAlertParams['savedId'];
    timeline_id: RuleAlertParams['timelineId'];
    timeline_title: RuleAlertParams['timelineTitle'];
    max_signals: RuleAlertParams['maxSignals'];
    machine_learning_job_id: RuleAlertParams['machineLearningJobId'];
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

export type RefreshTypes = false | 'wait_for';
