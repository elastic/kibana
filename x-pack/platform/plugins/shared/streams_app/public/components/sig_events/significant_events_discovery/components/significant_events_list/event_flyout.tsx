/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiPanel,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiCallOut,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { getVerdictColor, getImpactColor } from '@kbn/streams-plugin/common';
import type { SigEvent } from '@kbn/streams-plugin/common';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../../hooks/use_streams_app_fetch';
import { LifecycleTimeline } from './lifecycle_timeline';
import { TRANSLATIONS } from './translations';

interface EventFlyoutProps {
  event: SigEvent;
  onClose: () => void;
}

const BadgeRow = React.memo(({ items, color }: { items: string[]; color?: string }) => (
  <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
    {items.map((item) => (
      <EuiFlexItem grow={false} key={item}>
        <EuiBadge color={color ?? 'default'}>{item}</EuiBadge>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
));

export const EventFlyout = React.memo(({ event, onClose }: EventFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'sigEventFlyout' });

  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const {
    value: lifecycle,
    loading,
    error,
  } = useStreamsAppFetch(
    async ({ signal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams/sig_events/{eventId}/lifecycle', {
        params: { path: { eventId: event.id } },
        signal,
      }),
    [streamsRepositoryClient, event.id]
  );

  const streamNames = event.stream_names ?? [];
  const { rule_names: ruleNames = [], recommendations = [] } = event;

  return (
    <EuiFlyout onClose={onClose} size="m" ownFocus aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color={getVerdictColor(event.verdict)}>{event.verdict}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={getImpactColor(event.impact)}>{event.impact}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{event.title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiText size="s">
          <p>{event.summary}</p>
        </EuiText>

        {event.root_cause && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xs">
              <h3>{TRANSLATIONS.flyout.rootCause}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiPanel color="plain" hasBorder paddingSize="s">
              <EuiText size="s">
                <p>{event.root_cause}</p>
              </EuiText>
            </EuiPanel>
          </>
        )}

        {recommendations.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xs">
              <h3>{TRANSLATIONS.flyout.recommendations}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiPanel color="subdued" paddingSize="s" hasBorder={false}>
              <EuiText size="s">
                <ol>
                  {recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ol>
              </EuiText>
            </EuiPanel>
          </>
        )}

        <EuiHorizontalRule margin="m" />

        <EuiTitle size="xxs">
          <h4>{TRANSLATIONS.flyout.streams}</h4>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <BadgeRow items={streamNames} color="hollow" />

        {ruleNames.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h4>{TRANSLATIONS.flyout.rules}</h4>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <BadgeRow items={ruleNames} />
          </>
        )}

        <EuiHorizontalRule margin="m" />

        <EuiTitle size="xs">
          <h3>{TRANSLATIONS.flyout.lifecycle}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {loading ? (
          <EuiLoadingSpinner size="m" />
        ) : error ? (
          <EuiCallOut
            announceOnMount
            title={TRANSLATIONS.flyout.lifecycleError}
            color="danger"
            iconType="error"
            size="s"
          />
        ) : lifecycle ? (
          <LifecycleTimeline
            detections={lifecycle.detections}
            discoveries={lifecycle.discoveries}
            verdicts={lifecycle.verdicts}
            eventId={event.id}
            eventTimestamp={event['@timestamp']}
          />
        ) : (
          <EuiText size="s" color="subdued">
            —
          </EuiText>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButtonEmpty onClick={onClose}>{TRANSLATIONS.flyout.close}</EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
});
