/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '../../../../../../../../src/plugins/data/common';
import { RuleType } from '../../../containers/detection_engine/rules/types';
import { FieldValueQueryBar } from './components/query_bar';
import { FormData, FormHook } from '../../../shared_imports';
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
  descriptionColumns?: 'multi' | 'single' | 'singleSplit';
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
  note: string;
}

export interface AboutStepRuleDetails {
  note: string;
  description: string;
}

export interface DefineStepRule extends StepRuleData {
  anomalyThreshold: number;
  index: string[];
  machineLearningJobId: string;
  queryBar: FieldValueQueryBar;
  ruleType: RuleType;
}

export interface ScheduleStepRule extends StepRuleData {
  enabled: boolean;
  interval: string;
  from: string;
  to?: string;
}

export interface DefineStepRuleJson {
  anomaly_threshold?: number;
  index?: string[];
  filters?: Filter[];
  machine_learning_job_id?: string;
  saved_id?: string;
  query?: string;
  language?: string;
  type: RuleType;
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
  note?: string;
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
