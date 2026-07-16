/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseFormReturn } from 'react-hook-form';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import type { FormValues } from '../../form/types';
import type { BuilderState } from './rule_builder/types';
import type { ComposeDiscoverState, StepDefinition } from './types';

export const evaluateStepValidation = (
  step: StepDefinition,
  methods: UseFormReturn<FormValues>,
  state: ComposeDiscoverState,
  services?: RuleFormServices,
  builderState?: BuilderState
): boolean | Promise<boolean> => {
  if (step.meetsPrecondition && !step.meetsPrecondition(state)) {
    return false;
  }
  if (step.validate) {
    return step.validate(methods, state, services, builderState);
  }
  if (step.fields?.length) {
    return methods.trigger(step.fields);
  }
  return true;
};

export const validateStep = async (
  step: StepDefinition,
  methods: UseFormReturn<FormValues>,
  state: ComposeDiscoverState,
  services?: RuleFormServices,
  builderState?: BuilderState
): Promise<boolean> => {
  const result = evaluateStepValidation(step, methods, state, services, builderState);
  return typeof result === 'boolean' ? result : await result;
};
