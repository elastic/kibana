/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SigEvent } from '@kbn/streams-schema';
import { InfoPanel } from '../../info_panel';
import { RootCauseCard } from './root_cause_card';

const SUMMARY_TITLE = i18n.translate('xpack.streams.sigEventsTab.flyout.summaryTitle', {
  defaultMessage: 'Summary',
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
  event: SigEvent;
}

export const SigEventDetails = ({ event }: SigEventDetailsProps) => {
  const ruleNames = event.rule_names ?? [];

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {event.summary && (
        <InfoPanel title={SUMMARY_TITLE}>
          <EuiText size="s">
            <p>{event.summary}</p>
          </EuiText>
        </InfoPanel>
      )}

      <RootCauseCard event={event} />

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
              maxWidth={false}
            />
          </EuiPanel>
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
    </EuiFlexGroup>
  );
};
