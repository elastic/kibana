/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { RuleFormState } from '../types';
import type { RuleFormStateReducerAction } from './rule_form_state_reducer';

type RuleFormStateWithInteractHandler = RuleFormState & {
  onInteraction: () => void;
};

export const RuleFormStateContext = createContext<RuleFormStateWithInteractHandler>(
  {} as RuleFormStateWithInteractHandler
);

export const RuleFormReducerContext = createContext<React.Dispatch<RuleFormStateReducerAction>>(
  () => {}
);
