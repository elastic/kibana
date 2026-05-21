/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RuleBuilderDefinition } from './types';
import type { ThresholdFormValues } from './threshold_form_types';
import { DEFAULT_THRESHOLD_FORM_VALUES, generateId } from './threshold_form_types';
import { RuleBuilderAlertConditionStep } from './rule_builder_alert_condition_step';
import { parseThresholdEsql } from './parse_threshold_esql';

const defineBuilder = <TState>(def: RuleBuilderDefinition<TState>): RuleBuilderDefinition => {
  return def as RuleBuilderDefinition;
};

const thresholdDefinition = defineBuilder<ThresholdFormValues>({
  type: 'threshold',
  stepTitle: 'Alert Condition',
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
      builderState: props.builderState,
      onBuilderStateChange: props.onBuilderStateChange,
    }),
  validate: (state) => state.queryCommitted,
  parseState: parseThresholdEsql,
});

export const RULE_BUILDER_REGISTRY: Record<string, RuleBuilderDefinition> = {
  threshold: thresholdDefinition,
};
