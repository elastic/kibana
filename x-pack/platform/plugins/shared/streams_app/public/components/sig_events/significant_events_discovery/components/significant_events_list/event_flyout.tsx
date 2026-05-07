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
  useGeneratedHtmlId,
} from '@elastic/eui';
import { VERDICT_COLORS, IMPACT_COLORS } from '@kbn/streams-plugin/common';
import type { Verdict, Impact, SigEvent } from '@kbn/streams-plugin/common';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../../hooks/use_streams_app_fetch';
import { LifecycleTimeline } from './lifecycle_timeline';
import { TRANSLATIONS } from './translations';

interface EventFlyoutProps {
  event: SigEvent;
  onClose: () => void;
}

export const EventFlyout = ({ event, onClose }: EventFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'sigEventFlyout' });

  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const lifecycleFetch = useStreamsAppFetch(
    async ({ signal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams/sig_events/{eventId}/lifecycle', {
        params: { path: { eventId: event.id } },
        signal,
      }),
    [streamsRepositoryClient, event.id]
  );

  const lifecycle = lifecycleFetch.value;

  return (
    <EuiFlyout onClose={onClose} size="m" ownFocus aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color={VERDICT_COLORS[event.verdict as Verdict] ?? 'default'}>
              {event.verdict}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={IMPACT_COLORS[event.impact as Impact] ?? 'hollow'}>
              {event.impact}
            </EuiBadge>
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

        {event.recommendations && event.recommendations.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xs">
              <h3>{TRANSLATIONS.flyout.recommendations}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiPanel color="subdued" paddingSize="s" hasBorder={false}>
              <EuiText size="s">
                <ol>
                  {event.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ol>
              </EuiText>
            </EuiPanel>
          </>
        )}

        <EuiHorizontalRule margin="m" />

        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h4>{TRANSLATIONS.flyout.streams}</h4>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {(event.stream_names ?? []).map((name) => (
            <EuiFlexItem grow={false} key={name}>
              <EuiBadge color="hollow">{name}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        {event.rule_names && event.rule_names.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h4>{TRANSLATIONS.flyout.rules}</h4>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {event.rule_names.map((rule) => (
                <EuiFlexItem grow={false} key={rule}>
                  <EuiBadge>{rule}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        )}

        <EuiHorizontalRule margin="m" />

        <EuiTitle size="xs">
          <h3>{TRANSLATIONS.flyout.lifecycle}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {lifecycleFetch.loading ? (
          <EuiLoadingSpinner size="m" />
        ) : lifecycle ? (
          <LifecycleTimeline
            discovery={lifecycle.discovery}
            verdicts={lifecycle.verdicts}
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
};
