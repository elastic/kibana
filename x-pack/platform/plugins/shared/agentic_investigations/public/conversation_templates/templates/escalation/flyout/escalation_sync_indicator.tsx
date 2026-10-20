/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useRef } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import type { SyncIndicatorSlotRenderProps } from '@kbn/agentic-investigations-common';
import { useSyncEscalation } from '../../../../escalations/hooks/use_escalations_api';
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
 * Syncs the escalation's attachments with its linked investigations once when the flyout opens.
 *
 * Shows a spinner beside the title while the request runs. A toast is shown only when the backend
 * copied attachments; when nothing needed to change the user sees nothing. A request that fails,
 * or one that could not write some attachments, shows an error toast.
 */
const EscalationSyncIndicatorInner = ({ escalationId }: SyncIndicatorSlotRenderProps) => {
  const {
    services: { notifications },
  } = useKibana<CoreStart>();
  const { mutate, isLoading } = useSyncEscalation();
  const syncedFor = useRef<string>();

  useEffect(() => {
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
  }, [escalationId, mutate, notifications.toasts]);

  if (!isLoading) return null;

  return (
    <EuiLoadingSpinner size="m" aria-label={T.syncing} data-test-subj="escalationSyncSpinner" />
  );
};

EscalationSyncIndicatorInner.displayName = 'EscalationSyncIndicator';

export const EscalationSyncIndicator = memo(EscalationSyncIndicatorInner);
