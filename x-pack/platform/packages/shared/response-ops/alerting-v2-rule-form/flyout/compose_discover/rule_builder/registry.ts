/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ThresholdFormValues } from '@kbn/alerting-v2-rule-builders';
import {
  DEFAULT_THRESHOLD_FORM_VALUES,
  generateId,
  getThresholdValidationErrors,
  parseThresholdEsql,
  reconcileAlertConditionMetrics,
  THRESHOLD_BUILDER_TYPE,
} from '@kbn/alerting-v2-rule-builders';
import type { RuleBuilderDefinition } from './types';
import { RuleBuilderAlertConditionStep } from './threshold/alert_condition_step';
import { BuilderRecoveryForm } from './threshold/recovery_condition_step';
import { THRESHOLD_CREATE_FLYOUT_TITLE, THRESHOLD_STEP_TITLE } from './threshold/translations';

const defineBuilder = <TState>(def: RuleBuilderDefinition<TState>): RuleBuilderDefinition =>
  def as RuleBuilderDefinition;

const isThresholdFormValid = (values: ThresholdFormValues): boolean =>
  getThresholdValidationErrors(values).length === 0;

const getValidatedThresholdValues = (values: ThresholdFormValues): ThresholdFormValues => ({
  ...values,
  alertConditions: reconcileAlertConditionMetrics(
    values.alertConditions,
    values.stats,
    values.evaluations
  ),
});

const thresholdDefinition = defineBuilder<ThresholdFormValues>({
  type: THRESHOLD_BUILDER_TYPE,
  stepTitle: THRESHOLD_STEP_TITLE,
  createFlyoutTitle: THRESHOLD_CREATE_FLYOUT_TITLE,
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
    // No builder state means the step cannot be valid yet (unlike ES|QL mode, which can proceed
    // on queryCommitted alone before builder state is initialized).
    builderState ? isThresholdFormValid(getValidatedThresholdValues(builderState)) : false,
  parseState: parseThresholdEsql,
});

export const RULE_BUILDER_REGISTRY: Record<string, RuleBuilderDefinition> = {
  [THRESHOLD_BUILDER_TYPE]: thresholdDefinition,
};
