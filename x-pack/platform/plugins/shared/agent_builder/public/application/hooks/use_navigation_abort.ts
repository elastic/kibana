/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { OnAppLeave } from '../context/app_leave_context';
import { labels } from '../utils/i18n';

interface UseNavigationAbortParams {
  onAppLeave: OnAppLeave;
  isResponseLoading: boolean;
}

/**
 * Hook that handles navigation abort confirmation when user tries to navigate away
 * while a chat request is in progress.
 *
 * When user confirms navigation, the request is aborted and the round is marked as aborted.
 * When user cancels, they stay on the page and the request continues.
 */
export const useNavigationAbort = ({ onAppLeave, isResponseLoading }: UseNavigationAbortParams) => {
  const shouldAbortOnUnmountRef = useRef(false);

  useEffect(() => {
    onAppLeave((actions) => {
      if (isResponseLoading) {
        shouldAbortOnUnmountRef.current = true;
        return actions.confirm(
          labels.navigationAbort.message,
          labels.navigationAbort.title,
          () => {},
          labels.navigationAbort.confirmButton,
          'danger'
        );
      }
      return actions.default();
    });

    return () => {
      onAppLeave((actions) => actions.default());
    };
  }, [onAppLeave, isResponseLoading]);
};
