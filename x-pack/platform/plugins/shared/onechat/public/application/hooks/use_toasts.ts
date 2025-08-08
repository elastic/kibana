/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToastInput } from '@kbn/core/public';
import { useCallback } from 'react';
import { useKibana } from './use_kibana';

export const useToasts = () => {
  const { services } = useKibana();
  const { notifications } = services;

  const addSuccessToast = useCallback(
    (input: ToastInput) => {
      notifications.toasts.addSuccess(input);
    },
    [notifications.toasts]
  );

  const addErrorToast = useCallback(
    (input: ToastInput) => {
      notifications.toasts.addDanger(input);
    },
    [notifications.toasts]
  );

  return { addSuccessToast, addErrorToast };
};
