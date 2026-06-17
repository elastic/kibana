/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RuleBuilderDefinition } from './types';
import type { ThresholdFormValues } from './threshold/form_types';
import {
  DEFAULT_THRESHOLD_FORM_VALUES,
  generateId,
  isStatFieldValid,
  isStatLabelValid,
  reconcileAlertConditionMetrics,
} from './threshold/form_types';
import { RuleBuilderAlertConditionStep } from './threshold/alert_condition_step';
import { BuilderRecoveryForm } from './threshold/recovery_condition_step';
import { parseThresholdEsql } from './threshold/parse_esql';
import { THRESHOLD_STEP_TITLE } from './threshold/translations';

const defineBuilder = <TState>(def: RuleBuilderDefinition<TState>): RuleBuilderDefinition =>
  def as RuleBuilderDefinition;

const isThresholdFormValid = (values: ThresholdFormValues): boolean => {
  if (!values.indexPattern.trim()) return false;

  const hasValidStat = values.stats.some((s) => isStatLabelValid(s) && isStatFieldValid(s));
  if (!hasValidStat) return false;

  const hasValidCondition = values.alertConditions.some(
    (c) => c.metric.trim() && c.threshold.length > 0
  );
  if (!hasValidCondition) return false;

  if (values.recovery) {
    const hasValidRecovery = values.recovery.conditions.some(
      (c) => c.metric.trim() && c.threshold.length > 0
    );
    if (!hasValidRecovery) return false;
  }

  return true;
};

const getValidatedThresholdValues = (values: ThresholdFormValues): ThresholdFormValues => ({
  ...values,
  alertConditions: reconcileAlertConditionMetrics(
    values.alertConditions,
    values.stats,
    values.evaluations
  ),
});

const thresholdDefinition = defineBuilder<ThresholdFormValues>({
  type: 'threshold',
  stepTitle: THRESHOLD_STEP_TITLE,
  createDefaultState: () => ({
    ...DEFAULT_THRESHOLD_FORM_VALUES,
    stats: DEFAULT_THRESHOLD_FORM_VALUES.stats.map((s) => ({ ...s, id: generateId() })),
    evaluations: [],
    alertConditions: DEFAULT_THRESHOLD_FORM_VALUES.alertConditions.map((c) => ({
      ...c,
      id: generateId(),
    })),
    groupByFields: [],
  }),
  renderStep: (props) =>
    React.createElement(RuleBuilderAlertConditionStep, {
      state: props.state,
      dispatch: props.dispatch,
      services: props.services,
    }),
  renderRecoveryStep: (props) =>
    React.createElement(BuilderRecoveryForm, {
      state: props.state,
      dispatch: props.dispatch,
    }),
  validate: (_state, builderState) =>
    builderState ? isThresholdFormValid(getValidatedThresholdValues(builderState)) : false,
  parseState: parseThresholdEsql,
});

export const RULE_BUILDER_REGISTRY: Record<string, RuleBuilderDefinition> = {
  threshold: thresholdDefinition,
};
