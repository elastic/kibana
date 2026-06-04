/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiListGroup,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SigEvent } from '@kbn/streams-schema';
import { useFetchEventLifecycle } from '../../../../../hooks/sig_events/use_fetch_sig_events';
import { useKibana } from '../../../../../hooks/use_kibana';
import { LifecycleTimeline } from './lifecycle_timeline';
import { getStatusColor } from './filter_constants';
import { formatTimestamp } from '../../../../../util/formatters';

const evidencePanelCss = css`
  margin-bottom: 4px;
`;

const ROOT_CAUSE_TITLE = i18n.translate('xpack.streams.sigEventsTab.flyout.rootCause', {
  defaultMessage: 'Root Cause',
});
const RECOMMENDATIONS_TITLE = i18n.translate('xpack.streams.sigEventsTab.flyout.recommendations', {
  defaultMessage: 'Recommendations',
});
const CAUSE_KIS_TITLE = i18n.translate('xpack.streams.sigEventsTab.flyout.causeKis', {
  defaultMessage: 'Cause KIs',
});
const STREAMS_TITLE = i18n.translate('xpack.streams.sigEventsTab.flyout.streams', {
  defaultMessage: 'Streams',
});
const RULES_TITLE = i18n.translate('xpack.streams.sigEventsTab.flyout.rules', {
  defaultMessage: 'Rules',
});
const LIFECYCLE_TITLE = i18n.translate('xpack.streams.sigEventsTab.flyout.lifecycleTitle', {
  defaultMessage: 'Lifecycle',
});
const LIFECYCLE_ERROR = i18n.translate('xpack.streams.sigEventsTab.flyout.lifecycleError', {
  defaultMessage: 'Failed to load lifecycle data',
});
const CLOSE_LABEL = i18n.translate('xpack.streams.sigEventsTab.flyout.close', {
  defaultMessage: 'Close',
});
const CRITICALITY_LABEL = i18n.translate('xpack.streams.sigEventsTab.flyout.criticalityLabel', {
  defaultMessage: 'Criticality',
});
const CONFIDENCE_LABEL = i18n.translate('xpack.streams.sigEventsTab.flyout.confidenceLabel', {
  defaultMessage: 'Confidence',
});

const BadgeRow = ({ items, color }: { items: string[]; color?: string }) => (
  <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
    {items.map((item, idx) => (
      <EuiFlexItem grow={false} key={`${item}-${idx}`}>
        <EuiBadge color={color ?? 'default'}>{item}</EuiBadge>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

interface SigEventFlyoutProps {
  event: SigEvent;
  onClose: () => void;
}

export const SigEventFlyout = ({ event, onClose }: SigEventFlyoutProps) => {
  const {
    services: { focusedSignificantEventService },
  } = useKibana();
  const {
    data: lifecycleData,
    isLoading: isLifecycleLoading,
    isError: isLifecycleError,
  } = useFetchEventLifecycle(event.event_id);

  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'sigEventFlyout' });
  const ruleNames = event.rule_names ?? [];

  useEffect(() => {
    focusedSignificantEventService.setFocusedEvent(event);

    return () => {
      focusedSignificantEventService.clearFocusedEvent(event.discovery_slug);
    };
  }, [event, focusedSignificantEventService]);

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              {/* TODO: rename event.verdict to event.status once the data stream field is renamed */}
              <EuiBadge color={getStatusColor(event.verdict)}>{event.verdict}</EuiBadge>
            </EuiFlexItem>
            {event.recommended_action && (
              <EuiFlexItem grow={false}>
                <EuiBadge color={event.recommended_action === 'escalate' ? 'danger' : 'hollow'}>
                  {event.recommended_action}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiTitle size="m">
            <h2 id={flyoutTitleId}>{event.title}</h2>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {formatTimestamp(event['@timestamp'])}
            {event.criticality != null && ` · ${CRITICALITY_LABEL}: ${event.criticality}`}
            {event.confidence != null && ` · ${CONFIDENCE_LABEL}: ${event.confidence}%`}
          </EuiText>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          {event.summary && (
            <EuiText size="s">
              <p>{event.summary}</p>
            </EuiText>
          )}

          {event.root_cause && (
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiTitle size="xs">
                <h3>{ROOT_CAUSE_TITLE}</h3>
              </EuiTitle>
              <EuiPanel color="plain" hasBorder paddingSize="s">
                <EuiText size="s">
                  <p>{event.root_cause}</p>
                </EuiText>
              </EuiPanel>
            </EuiFlexGroup>
          )}

          {event.recommendations && event.recommendations.length > 0 && (
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiTitle size="xs">
                <h3>{RECOMMENDATIONS_TITLE}</h3>
              </EuiTitle>
              <EuiPanel color="subdued" paddingSize="s" hasBorder={false}>
                <EuiListGroup
                  listItems={event.recommendations.map((rec, idx) => ({
                    label: `${idx + 1}. ${rec}`,
                    size: 's' as const,
                    wrapText: true,
                  }))}
                  bordered={false}
                />
              </EuiPanel>
            </EuiFlexGroup>
          )}

          {event.evidences && event.evidences.length > 0 && (
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate('xpack.streams.sigEventsTab.flyout.evidence', {
                    defaultMessage: 'Evidence ({count})',
                    values: { count: event.evidences.length },
                  })}
                </h3>
              </EuiTitle>
              {event.evidences.map((ev, idx) => (
                <EuiPanel key={idx} color="plain" hasBorder paddingSize="s" css={evidencePanelCss}>
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                    {ev.rule_name && (
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          <strong>{ev.rule_name}</strong>
                        </EuiText>
                      </EuiFlexItem>
                    )}
                    {ev.stream_name && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">{ev.stream_name}</EuiBadge>
                      </EuiFlexItem>
                    )}
                    {ev.result && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color={ev.result === 'anomaly' ? 'warning' : 'hollow'}>
                          {ev.result}
                        </EuiBadge>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                  {ev.description && (
                    <EuiText size="xs" color="subdued">
                      {ev.description}
                    </EuiText>
                  )}
                </EuiPanel>
              ))}
            </EuiFlexGroup>
          )}

          {event.cause_kis && event.cause_kis.length > 0 && (
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiTitle size="xxs">
                <h4>{CAUSE_KIS_TITLE}</h4>
              </EuiTitle>
              <BadgeRow
                items={event.cause_kis.map(
                  (ki) => `${ki.name || '-'}${ki.stream_name ? ` (${ki.stream_name})` : ''}`
                )}
              />
            </EuiFlexGroup>
          )}

          <EuiHorizontalRule margin="none" />

          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiTitle size="xxs">
              <h4>{STREAMS_TITLE}</h4>
            </EuiTitle>
            <BadgeRow items={event.stream_names ?? []} color="hollow" />
          </EuiFlexGroup>

          {ruleNames.length > 0 && (
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiTitle size="xxs">
                <h4>{RULES_TITLE}</h4>
              </EuiTitle>
              <BadgeRow items={ruleNames} />
            </EuiFlexGroup>
          )}

          <EuiHorizontalRule margin="none" />

          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiTitle size="xs">
              <h3>{LIFECYCLE_TITLE}</h3>
            </EuiTitle>
            {isLifecycleLoading ? (
              <EuiLoadingSpinner size="m" />
            ) : isLifecycleError ? (
              <EuiCallOut
                announceOnMount
                title={LIFECYCLE_ERROR}
                color="danger"
                iconType="error"
                size="s"
              />
            ) : (
              <LifecycleTimeline data={lifecycleData} />
            )}
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButtonEmpty onClick={onClose}>{CLOSE_LABEL}</EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
