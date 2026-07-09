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
import type { SignificantEvent } from '@kbn/significant-events-schema';

const ROOT_CAUSE_TITLE = i18n.translate('xpack.streams.sigEventsTab.flyout.rootCause', {
  defaultMessage: 'Root Cause',
});
const RECOMMENDATIONS_TITLE = i18n.translate('xpack.streams.sigEventsTab.flyout.recommendations', {
  defaultMessage: 'Recommendations',
});
const STREAMS_TITLE = i18n.translate('xpack.streams.sigEventsTab.flyout.streams', {
  defaultMessage: 'Streams',
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
  event: SignificantEvent;
}

export const SigEventDetails = ({ event }: SigEventDetailsProps) => {
  return (
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
              maxWidth={false}
            />
          </EuiPanel>
        </EuiFlexGroup>
      )}

      {/* Evidence, causal KIs and fired rules are told in context by the "How we got here"
          provenance section — repeating them here would double the flyout's volume. */}
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiTitle size="xxs">
          <h4>{STREAMS_TITLE}</h4>
        </EuiTitle>
        <BadgeRow items={event.stream_names ?? []} color="hollow" />
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
