/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '../../../../../../../../src/plugins/data/common';
import { Rule } from '../../../containers/detection_engine/rules';
import { FieldValueQueryBar } from './components/query_bar';
import { FormData, FormHook } from '../../shared_imports';
import { FieldValueTimeline } from './components/pick_timeline';

export interface EuiBasicTableSortTypes {
  field: string;
  direction: 'asc' | 'desc';
}

export interface EuiBasicTableOnChange {
  page: {
    index: number;
    size: number;
  };
  sort?: EuiBasicTableSortTypes;
}

export interface TableData {
  id: string;
  immutable: boolean;
  rule_id: string;
  rule: {
    href: string;
    name: string;
  };
  risk_score: number;
  severity: string;
  tags: string[];
  activate: boolean;
  isLoading: boolean;
  sourceRule: Rule;
  status?: string | null;
  statusDate?: string | null;
}

export enum RuleStep {
  defineRule = 'define-rule',
  aboutRule = 'about-rule',
  scheduleRule = 'schedule-rule',
}
export type RuleStatusType = 'passive' | 'active' | 'valid';

export interface RuleStepData {
  data: unknown;
  isValid: boolean;
}

export interface RuleStepProps {
  addPadding?: boolean;
  descriptionDirection?: 'row' | 'column';
  setStepData?: (step: RuleStep, data: unknown, isValid: boolean) => void;
  isReadOnlyView: boolean;
  isUpdateView?: boolean;
  isLoading: boolean;
  resizeParentContainer?: (height: number) => void;
  setForm?: (step: RuleStep, form: FormHook<FormData>) => void;
}

interface StepRuleData {
  isNew: boolean;
}
export interface AboutStepRule extends StepRuleData {
  name: string;
  description: string;
  severity: string;
  riskScore: number;
  references: string[];
  falsePositives: string[];
  tags: string[];
  timeline: FieldValueTimeline;
  threat: IMitreEnterpriseAttack[];
}

export interface DefineStepRule extends StepRuleData {
  index: string[];
  queryBar: FieldValueQueryBar;
}

export interface ScheduleStepRule extends StepRuleData {
  enabled: boolean;
  interval: string;
  from: string;
  to?: string;
}

export interface DefineStepRuleJson {
  index: string[];
  filters: Filter[];
  saved_id?: string;
  query: string;
  language: string;
}

export interface AboutStepRuleJson {
  name: string;
  description: string;
  severity: string;
  risk_score: number;
  references: string[];
  false_positives: string[];
  tags: string[];
  timeline_id?: string;
  timeline_title?: string;
  threat: IMitreEnterpriseAttack[];
}

export interface ScheduleStepRuleJson {
  enabled: boolean;
  interval: string;
  from: string;
  to?: string;
  meta?: unknown;
}

export type MyRule = Omit<DefineStepRule & ScheduleStepRule & AboutStepRule, 'isNew'> & {
  immutable: boolean;
};

export type FormatRuleType = 'query' | 'saved_query';

export interface IMitreAttack {
  id: string;
  name: string;
  reference: string;
}
export interface IMitreEnterpriseAttack {
  framework: string;
  tactic: IMitreAttack;
  technique: IMitreAttack[];
}
