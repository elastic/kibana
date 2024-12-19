/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { History } from 'history';
import { type WizardSection } from './component_template_form';

export function useStepFromQueryString(history: History) {
  const activeStep = useMemo(() => {
    const params = new URLSearchParams(history.location.search);
    if (params.has('step')) {
      return params.get('step') as WizardSection;
    }
  }, [history.location.search]);

  const updateStep = useCallback(
    (stepId: string) => {
      const params = new URLSearchParams(history.location.search);
      if (params.has('step')) {
        params.set('step', stepId);
        history.push({
          search: params.toString(),
        });
      }
    },
    [history]
  );

  return { activeStep, updateStep };
}
