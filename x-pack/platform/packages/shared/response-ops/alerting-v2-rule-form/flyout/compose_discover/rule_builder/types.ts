/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { ComposeDiscoverState, ComposeDiscoverAction } from '../types';
import type { RuleFormServices } from '../../../form/contexts/rule_form_context';

export interface RuleBuilderStepProps<TState = unknown> {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  services: RuleFormServices;
  builderState: TState;
  onBuilderStateChange: (state: TState) => void;
}

export interface RuleBuilderDefinition<TState = unknown> {
  type: string;
  stepTitle: string;
  createDefaultState: () => TState;
  renderStep: (props: RuleBuilderStepProps<TState>) => React.ReactNode;
  validate?: (state: ComposeDiscoverState) => boolean;
  parseState?: (query: string) => TState | null;
}
