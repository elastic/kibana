/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useState } from 'react';
import { isEqual } from 'lodash';

export type StepFieldKey = 'after' | 'fixed_interval';
export type OnStepFieldErrorsChange = (
  stepPath: string,
  field: StepFieldKey,
  errors: string[] | null
) => void;

const OnStepFieldErrorsChangeContext = createContext<OnStepFieldErrorsChange | null>(null);

export const OnStepFieldErrorsChangeProvider = ({
  value,
  children,
}: {
  value: OnStepFieldErrorsChange;
  children: React.ReactNode;
}) => {
  return React.createElement(OnStepFieldErrorsChangeContext.Provider, { value }, children);
};

export const useOnStepFieldErrorsChange = (): OnStepFieldErrorsChange | null => {
  return useContext(OnStepFieldErrorsChangeContext);
};

export const useDslStepsFlyoutTabErrors = () => {
  const [errorsByStepPath, setErrorsByStepPath] = useState<
    Record<string, Partial<Record<StepFieldKey, string[] | null>>>
  >({});

  const onStepFieldErrorsChange = useCallback<OnStepFieldErrorsChange>(
    (stepPath, field, errors) => {
      setErrorsByStepPath((prev) => {
        const prevForStep = prev[stepPath];
        if (isEqual(prevForStep?.[field], errors)) return prev;
        return { ...prev, [stepPath]: { ...prevForStep, [field]: errors } };
      });
    },
    []
  );

  const tabHasErrors = useCallback(
    (stepPath: string) => {
      const stepErrors = errorsByStepPath[stepPath];
      return Boolean(stepErrors?.after?.length) || Boolean(stepErrors?.fixed_interval?.length);
    },
    [errorsByStepPath]
  );

  const pruneToStepPaths = useCallback((stepPaths: string[]) => {
    setErrorsByStepPath((prev) => {
      const next: typeof prev = {};
      stepPaths.forEach((p) => {
        if (prev[p]) next[p] = prev[p];
      });

      return isEqual(prev, next) ? prev : next;
    });
  }, []);

  return { onStepFieldErrorsChange, tabHasErrors, pruneToStepPaths };
};
