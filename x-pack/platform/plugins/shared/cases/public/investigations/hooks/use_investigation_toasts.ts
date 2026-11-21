/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useInvestigationsServices } from '../services';
import { toDisplayError } from './errors';

export interface InvestigationToasts {
  showError: (error: unknown, title: string) => void;
  showSuccess: (title: string) => void;
}

/** Error and success toasts through `coreStart.notifications.toasts`. */
export const useInvestigationToasts = (): InvestigationToasts => {
  const { notifications } = useInvestigationsServices();
  const { toasts } = notifications;

  return useMemo(
    () => ({
      showError: (error, title) => toasts.addError(toDisplayError(error), { title }),
      showSuccess: (title) => toasts.addSuccess({ title }),
    }),
    [toasts]
  );
};
