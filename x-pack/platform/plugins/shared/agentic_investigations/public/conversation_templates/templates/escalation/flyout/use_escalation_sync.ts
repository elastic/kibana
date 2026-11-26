/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useSyncEscalation } from '../../../../escalations/hooks/use_escalations_api';
import { useCanManageEscalations } from '../../../../escalations/hooks/use_escalation_privileges';
import { ESCALATION_SYNC_TRANSLATIONS } from './escalation_sync_translations';

const T = ESCALATION_SYNC_TRANSLATIONS;

const errorText = (error: unknown): string | undefined => {
  if (isHttpFetchError(error)) {
    const body = error.body as { message?: unknown } | undefined;
    if (typeof body?.message === 'string') return body.message;
  }
  return error instanceof Error ? error.message : undefined;
};

/**
 * Syncs the escalation's attachments with its linked investigations once when the flyout opens,
 * and returns whether the sync is running.
 *
 * Syncing writes to the escalation, so it waits until the user is known to manage escalations. A
 * toast is shown only when the backend copied attachments; when nothing needed to change the user
 * sees nothing. A request that fails, or one that could not write some attachments, shows an
 * error toast.
 */
export const useEscalationSync = (escalationId: string): boolean => {
  const {
    services: { notifications },
  } = useKibana<CoreStart>();
  const canManageEscalations = useCanManageEscalations();
  const { mutate, isLoading } = useSyncEscalation();
  const syncedFor = useRef<string>();

  useEffect(() => {
    if (!canManageEscalations) return;
    // The ref keeps a re-render or a dev-mode double effect from syncing twice per flyout open.
    if (syncedFor.current === escalationId) return;
    syncedFor.current = escalationId;

    mutate(
      { escalationId },
      {
        onSuccess: ({ copied, failed }) => {
          if (copied > 0) {
            notifications.toasts.addSuccess(T.updated(copied));
          }
          if (failed > 0) {
            notifications.toasts.addDanger({
              title: T.partialFailureTitle,
              text: T.partialFailure(failed),
            });
          }
        },
        onError: (error) => {
          notifications.toasts.addDanger({
            title: T.failureTitle,
            text: errorText(error) ?? T.failure,
          });
        },
      }
    );
  }, [canManageEscalations, escalationId, mutate, notifications.toasts]);

  return isLoading;
};
