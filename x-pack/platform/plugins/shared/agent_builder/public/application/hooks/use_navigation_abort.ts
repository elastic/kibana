/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { OnAppLeave } from '../context/app_leave_context';
import { labels } from '../utils/i18n';

interface UseNavigationAbortParams {
  onAppLeave: OnAppLeave;
  isResponseLoading: boolean;
  cancelAll: () => void;
}

/**
 * Hook that handles navigation abort confirmation when user tries to navigate away
 * while one or more chat streams are in progress.
 *
 * If the user confirms, every in-flight stream is cancelled before the platform
 * proceeds with navigation. If the user cancels, they stay on the page and the
 * streams continue.
 */
export const useNavigationAbort = ({
  onAppLeave,
  isResponseLoading,
  cancelAll,
}: UseNavigationAbortParams) => {
  useEffect(() => {
    onAppLeave((actions) => {
      if (isResponseLoading) {
        return actions.confirm(
          labels.navigationAbort.message,
          labels.navigationAbort.title,
          () => {
            cancelAll();
          },
          labels.navigationAbort.confirmButton,
          'danger'
        );
      }
      return actions.default();
    });

    return () => {
      onAppLeave((actions) => actions.default());
    };
  }, [onAppLeave, isResponseLoading, cancelAll]);
};
