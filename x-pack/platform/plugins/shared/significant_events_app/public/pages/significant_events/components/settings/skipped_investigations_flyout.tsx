/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSignificantEventsAppRouter } from '../../../../hooks/use_significant_events_app_router';
import { useSkippedRunQuotaInvestigations } from '../../../../hooks/use_significant_events_run_quotas';

export const SkippedInvestigationsFlyout = ({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) => {
  const router = useSignificantEventsAppRouter();
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'runLimitReviewFlyoutTitle' });
  const { data, isLoading, isError } = useSkippedRunQuotaInvestigations({
    date,
    enabled: true,
  });

  return (
    <EuiFlyout
      onClose={onClose}
      ownFocus
      size="s"
      data-test-subj="runLimitReviewFlyout"
      aria-labelledby={flyoutTitleId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m" id={flyoutTitleId}>
          <h2>
            {i18n.translate('xpack.significantEventsApp.settings.runLimits.reviewFlyoutTitle', {
              defaultMessage: 'Investigation gate denials',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>
            {i18n.translate(
              'xpack.significantEventsApp.settings.runLimits.reviewSpaceScopeDescription',
              {
                defaultMessage:
                  'The headline total is deployment-wide. The requests below are limited to the current space and are shown newest first.',
              }
            )}
          </p>
        </EuiText>
        <EuiSpacer />
        {isLoading && <EuiLoadingSpinner />}
        {isError && (
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="error"
            title={i18n.translate(
              'xpack.significantEventsApp.settings.runLimits.reviewLoadErrorMessage',
              {
                defaultMessage: 'Could not load investigation gate denials',
              }
            )}
          />
        )}
        {data?.truncated && (
          <>
            <EuiCallOut
              announceOnMount
              color="warning"
              iconType="warning"
              title={i18n.translate(
                'xpack.significantEventsApp.settings.runLimits.reviewTruncatedDescription',
                {
                  defaultMessage: 'Showing the newest 200 rows.',
                }
              )}
            />
            <EuiSpacer />
          </>
        )}
        {data?.decisionsEvicted && (
          <>
            <EuiCallOut
              announceOnMount
              color="warning"
              iconType="warning"
              title={i18n.translate(
                'xpack.significantEventsApp.settings.runLimits.reviewEvictionDescription',
                {
                  defaultMessage:
                    'Older decisions have expired, so retries can appear more than once.',
                }
              )}
            />
            <EuiSpacer />
          </>
        )}
        {data?.rows.length === 0 && (
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.significantEventsApp.settings.runLimits.reviewEmptyDescription',
                {
                  defaultMessage: 'No investigation gate denials are recorded for this space.',
                }
              )}
            </p>
          </EuiText>
        )}
        {data?.rows.map((row, index) => (
          <React.Fragment key={`${row.eventUuid}-${row.decidedAt}-${index}`}>
            {index > 0 && <EuiHorizontalRule margin="m" />}
            <EuiLink
              href={router.link('/{tab}', {
                path: { tab: 'significant_events' },
                query: { selectedEvent: row.eventId, openEvent: row.eventId },
              })}
            >
              {i18n.translate('xpack.significantEventsApp.settings.runLimits.reviewEventLinkText', {
                defaultMessage: 'Open event {eventId}',
                values: { eventId: row.eventId },
              })}
            </EuiLink>
            <EuiText size="xs" color="subdued">
              <p>
                {i18n.translate(
                  'xpack.significantEventsApp.settings.runLimits.reviewRowDescription',
                  {
                    defaultMessage:
                      'The gate denied the request at {decidedAt, date, medium}, {decidedAt, time, short}. Severity: {severity}.',
                    values: {
                      decidedAt: new Date(row.decidedAt),
                      severity: row.severity,
                    },
                  }
                )}
              </p>
            </EuiText>
          </React.Fragment>
        ))}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
