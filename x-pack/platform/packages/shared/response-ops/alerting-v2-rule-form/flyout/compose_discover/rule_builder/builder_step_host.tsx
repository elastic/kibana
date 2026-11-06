/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComposeDiscoverAction, ComposeDiscoverState } from '../types';
import type { RuleFormServices } from '../../../form/contexts/rule_form_context';
import { useBuilderState } from './builder_state_context';
import type { BuilderState, BuilderStateProps, RuleBuilderDefinition } from './types';

const useBuilderStateProps = (): BuilderStateProps => {
  const { state, setState, initStateOnMount } = useBuilderState<BuilderState>();
  return { builderState: state, setBuilderState: setState, initBuilderState: initStateOnMount };
};

interface BuilderStepHostProps {
  definition: RuleBuilderDefinition;
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  services: RuleFormServices;
}

export const BuilderStepHost = ({ definition, ...props }: BuilderStepHostProps) => {
  const builderStateProps = useBuilderStateProps();
  return <>{definition.renderStep({ ...props, ...builderStateProps })}</>;
};

interface BuilderRecoveryStepHostProps {
  definition: RuleBuilderDefinition;
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
}

export const BuilderRecoveryStepHost = ({ definition, ...props }: BuilderRecoveryStepHostProps) => {
  const builderStateProps = useBuilderStateProps();
  return <>{definition.renderRecoveryStep?.({ ...props, ...builderStateProps })}</>;
};
