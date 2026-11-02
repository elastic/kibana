/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useReducer, useState, useCallback } from 'react';
import type { RuleFormState } from '../types';
import { RuleFormStateContext, RuleFormReducerContext } from './rule_form_state_context';
import type { RuleFormStateReducerAction } from './rule_form_state_reducer';
import { ruleFormStateReducer } from './rule_form_state_reducer';
import { validateRuleBase, validateRuleParams } from '../validation';

export interface RuleFormStateProviderProps {
  initialRuleFormState: RuleFormState;
}

export const RuleFormStateProvider: React.FC<
  React.PropsWithChildren<RuleFormStateProviderProps>
> = (props) => {
  // Tracking whether the user has changed the form is unreliable if we base it only on the difference
  // between initial data and current data, as many rule types will use reducer actions to set their initial data.
  // We need to track whether the user has actually physically interacted with the form before the ruleFormStateReducer
  // can accurately determine the `touched` state
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const { children, initialRuleFormState } = props;
  const {
    formData,
    selectedRuleTypeModel: ruleTypeModel,
    minimumScheduleInterval,
  } = initialRuleFormState;

  const [ruleFormState, baseDispatch] = useReducer(ruleFormStateReducer, {
    ...initialRuleFormState,
    baseErrors: validateRuleBase({
      formData,
      minimumScheduleInterval,
    }),
    paramsErrors: validateRuleParams({
      formData,
      ruleTypeModel,
    }),
  });

  // Prime the dispatch function to set `touched` to true on the next action, but not yet
  const onInteraction = useCallback(() => {
    if (!hasUserInteracted) setHasUserInteracted(true);
  }, [hasUserInteracted]);
  const dispatch: React.Dispatch<RuleFormStateReducerAction> = useCallback(
    (...args) => {
      // If the user has interacted with the form and the `touched` state is false, first update it to be true
      // before executing the next action
      if (hasUserInteracted && !ruleFormState.touched) {
        baseDispatch({ type: 'setTouched' });
      }
      baseDispatch(...args);
    },
    [baseDispatch, hasUserInteracted, ruleFormState.touched]
  );

  return (
    <RuleFormStateContext.Provider value={{ ...ruleFormState, onInteraction }}>
      <RuleFormReducerContext.Provider value={dispatch}>{children}</RuleFormReducerContext.Provider>
    </RuleFormStateContext.Provider>
  );
};
