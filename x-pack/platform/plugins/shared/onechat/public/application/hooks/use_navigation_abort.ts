/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { OnAppLeave } from '../context/app_leave_context';

interface UseNavigationAbortParams {
  onAppLeave: OnAppLeave;
  isResponseLoading: boolean;
  cancel: () => void;
  markRoundAsAborted: () => void;
}

/**
 * Hook that handles navigation abort confirmation when user tries to navigate away
 * while a chat request is in progress.
 *
 * When user confirms navigation, the request is aborted and the round is marked as aborted.
 * When user cancels, they stay on the page and the request continues.
 */
export const useNavigationAbort = ({
  onAppLeave,
  isResponseLoading,
  cancel,
  markRoundAsAborted,
}: UseNavigationAbortParams) => {
  const shouldAbortOnUnmountRef = useRef(false);

  useEffect(() => {
    onAppLeave((actions) => {
      if (isResponseLoading) {
        shouldAbortOnUnmountRef.current = true;
        return actions.confirm(
          i18n.translate('xpack.onechat.navigationAbort.message', {
            defaultMessage:
              'A chat request is in progress. Do you want to navigate away and abort it?',
          }),
          i18n.translate('xpack.onechat.navigationAbort.title', {
            defaultMessage: 'Abort chat request?',
          }),
          () => {
            shouldAbortOnUnmountRef.current = false;
          },
          i18n.translate('xpack.onechat.navigationAbort.confirmButton', {
            defaultMessage: 'Yes, abort',
          }),
          'danger'
        );
      }
      return actions.default();
    });

    return () => {
      onAppLeave((actions) => actions.default());
    };
  }, [onAppLeave, isResponseLoading]);

  useEffect(() => {
    if (!isResponseLoading) {
      shouldAbortOnUnmountRef.current = false;
    }
  }, [isResponseLoading]);

  useEffect(() => {
    return () => {
      if (shouldAbortOnUnmountRef.current) {
        cancel();
        markRoundAsAborted();
      }
    };
  }, [cancel, markRoundAsAborted]);
};
