/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { CoreStart } from '@kbn/core/public';
import type { IToasts } from '@kbn/core-notifications-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';

type UseToastsTypes = Pick<
  IToasts,
  'addInfo' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
>;

export const useToasts = (): UseToastsTypes => {
  const { services } = useKibana<CoreStart>();
  const { toasts } = services.notifications;

  return useMemo(
    () => ({
      addInfo: toasts.addInfo.bind(toasts),
      addSuccess: toasts.addSuccess.bind(toasts),
      addWarning: toasts.addWarning.bind(toasts),
      addDanger: toasts.addDanger.bind(toasts),
      addError: toasts.addError.bind(toasts),
    }),
    [toasts]
  );
};
