/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../hooks/use_kibana';
import { getFormattedError } from '../../../../util/errors';

interface CleanupStaleEventsResponse {
  scanned: number;
  closed: number;
  kept: number;
  skipped: number;
}

export function StaleEventCleanupSection({ canManage }: { canManage: boolean }) {
  const { core } = useKibana();
  const [isLoading, setIsLoading] = useState(false);

  const cleanup = async () => {
    setIsLoading(true);
    try {
      const result = await core.http.post<CleanupStaleEventsResponse>(
        '/internal/significant_events/events/_cleanup'
      );
      core.notifications.toasts.addSuccess({
        title:
          result.closed === 0
            ? i18n.translate(
                'xpack.significantEventsApp.settings.staleEventCleanup.noEventsTitle',
                { defaultMessage: 'No stale events found' }
              )
            : i18n.translate('xpack.significantEventsApp.settings.staleEventCleanup.successTitle', {
                defaultMessage:
                  '{count, plural, one {Closed # stale event} other {Closed # stale events}}',
                values: { count: result.closed },
              }),
      });
    } catch (error) {
      core.notifications.toasts.addError(getFormattedError(error), {
        title: i18n.translate('xpack.significantEventsApp.settings.staleEventCleanup.errorTitle', {
          defaultMessage: 'Failed to clean up stale events',
        }),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
      <EuiPanel hasShadow={false} color="subdued">
        <EuiText size="s">
          <h3>
            {i18n.translate('xpack.significantEventsApp.settings.staleEventCleanup.title', {
              defaultMessage: 'Stale event cleanup',
            })}
          </h3>
        </EuiText>
      </EuiPanel>
      <EuiPanel hasShadow={false} hasBorder={false}>
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.significantEventsApp.settings.staleEventCleanup.description', {
              defaultMessage:
                'Close open significant events when none of their backing rules still exist. This cleanup also runs automatically each day.',
            })}
          </p>
        </EuiText>
        <EuiButton
          data-test-subj="streams-settings-stale-event-cleanup-button"
          isLoading={isLoading}
          isDisabled={!canManage || isLoading}
          onClick={cleanup}
        >
          {i18n.translate('xpack.significantEventsApp.settings.staleEventCleanup.buttonLabel', {
            defaultMessage: 'Clean up stale events',
          })}
        </EuiButton>
      </EuiPanel>
    </EuiPanel>
  );
}
