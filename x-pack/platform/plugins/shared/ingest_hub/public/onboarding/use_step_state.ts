/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useRef } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { ONBOARDING_STEPS } from './steps';

type StepStatus = 'incomplete' | 'complete';
type StepState = Record<string, StepStatus>;

function buildDefaultState(): StepState {
  return Object.fromEntries(ONBOARDING_STEPS.map((s) => [s.id, 'incomplete' as StepStatus]));
}

export function useStepState(integrationId: string) {
  const storageKey = `onboarding.${integrationId}.stepState`;
  const [state, setState] = useSessionStorage<StepState>(storageKey, buildDefaultState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const completedSteps = useMemo(
    () =>
      new Set(
        Object.entries(state ?? {})
          .filter(([, v]) => v === 'complete')
          .map(([k]) => k)
      ),
    [state]
  );

  const markStepComplete = useCallback(
    (stepId: string) => {
      const next = { ...stateRef.current, [stepId]: 'complete' as StepStatus };
      setState(next);
    },
    [setState]
  );

  const resetSteps = useCallback(() => {
    setState(buildDefaultState());
  }, [setState]);

  const firstIncompleteStepId = useMemo(() => {
    const step = ONBOARDING_STEPS.find((s) => !completedSteps.has(s.id));
    return step?.id ?? ONBOARDING_STEPS[0].id;
  }, [completedSteps]);

  return { completedSteps, markStepComplete, resetSteps, firstIncompleteStepId };
}
