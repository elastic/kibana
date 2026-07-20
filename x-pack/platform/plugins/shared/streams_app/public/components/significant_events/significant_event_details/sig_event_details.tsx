/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SignificantEvent } from '@kbn/significant-events-schema';

const CAUSAL_FEATURES_TITLE = i18n.translate('xpack.streams.sigEventsTab.flyout.causalFeatures', {
  defaultMessage: 'Causal Features',
});
const STREAMS_TITLE = i18n.translate('xpack.streams.sigEventsTab.flyout.streams', {
  defaultMessage: 'Streams',
});

const signalPanelCss = css`
  margin-bottom: 4px;
`;

const BadgeRow = ({ items, color }: { items: string[]; color?: string }) => (
  <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
    {items.map((item, idx) => (
      <EuiFlexItem grow={false} key={`${item}-${idx}`}>
        <EuiBadge color={color ?? 'default'}>{item}</EuiBadge>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

interface SigEventDetailsProps {
  event: SignificantEvent;
}

export const SigEventDetails = ({ event }: SigEventDetailsProps) => {
  const signals = event.signals ?? [];
  const detectionSignals = signals.filter((s) => s.type === 'detection');

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {event.summary && (
        <EuiText size="s">
          <p>{event.summary}</p>
        </EuiText>
      )}

      {detectionSignals.length > 0 && (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.streams.sigEventsTab.flyout.signals', {
                defaultMessage: 'Signals ({count})',
                values: { count: detectionSignals.length },
              })}
            </h3>
          </EuiTitle>
          {detectionSignals.map((signal, idx) => (
            <EuiPanel key={idx} color="plain" hasBorder paddingSize="s" css={signalPanelCss}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                {signal.metadata?.rule_name && (
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <strong>{signal.metadata.rule_name}</strong>
                    </EuiText>
                  </EuiFlexItem>
                )}
                {signal.stream_name && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">{signal.stream_name}</EuiBadge>
                  </EuiFlexItem>
                )}
                {signal.evidence?.result && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={signal.evidence.result === 'empty' ? 'hollow' : 'warning'}>
                      {signal.evidence.result}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              {signal.description && (
                <EuiText size="xs" color="subdued">
                  {signal.description}
                </EuiText>
              )}
            </EuiPanel>
          ))}
        </EuiFlexGroup>
      )}

      {event.causal_features && event.causal_features.length > 0 && (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiTitle size="xxs">
            <h4>{CAUSAL_FEATURES_TITLE}</h4>
          </EuiTitle>
          <BadgeRow
            items={event.causal_features.map(
              (f) => `${f.name || '-'}${f.stream_name ? ` (${f.stream_name})` : ''}`
            )}
          />
        </EuiFlexGroup>
      )}

      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiTitle size="xxs">
          <h4>{STREAMS_TITLE}</h4>
        </EuiTitle>
        <BadgeRow items={event.stream_names ?? []} color="hollow" />
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
