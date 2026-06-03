/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiTimelineItem,
  EuiText,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EventLifecycleResponse } from '@kbn/streams-schema';
import { formatTimestamp } from '../../../../../util/formatters';

type EntityType = 'detection' | 'discovery' | 'verdict' | 'event';

interface TimelineEntry {
  type: EntityType;
  timestamp: string;
  title: string;
  description: string;
}

interface LifecycleTimelineProps {
  data: EventLifecycleResponse | undefined;
}

const ENTITY_ICONS: Record<EntityType, string> = {
  detection: 'bell',
  discovery: 'inspect',
  verdict: 'check',
  event: 'documentEdit',
};

const ENTITY_COLORS: Record<EntityType, string> = {
  detection: 'warning',
  discovery: 'primary',
  verdict: 'success',
  event: 'accent',
};

const ENTITY_LABELS: Record<EntityType, string> = {
  detection: i18n.translate('xpack.streams.lifecycle.detection', {
    defaultMessage: 'Detection',
  }),
  discovery: i18n.translate('xpack.streams.lifecycle.discovery', {
    defaultMessage: 'Discovery',
  }),
  verdict: i18n.translate('xpack.streams.lifecycle.verdict', {
    defaultMessage: 'Verdict',
  }),
  event: i18n.translate('xpack.streams.lifecycle.event', {
    defaultMessage: 'Event',
  }),
};

const EVENT_CREATED_LABEL = i18n.translate('xpack.streams.lifecycle.eventCreated', {
  defaultMessage: 'Event created',
});

const EVENT_UPDATED_LABEL = i18n.translate('xpack.streams.lifecycle.eventUpdated', {
  defaultMessage: 'Event updated',
});

const buildDiscoveryDescription = (
  discovery: EventLifecycleResponse['discoveries'][number]
): string =>
  i18n.translate('xpack.streams.lifecycle.discoveryDesc', {
    defaultMessage: '{kind} · criticality {criticality}',
    values: { kind: discovery.kind, criticality: discovery.criticality || '-' },
  });

const buildEventDescription = ({
  event,
  isFirst,
}: {
  event: EventLifecycleResponse['events'][number];
  isFirst: boolean;
}) =>
  isFirst
    ? event.title
    : i18n.translate('xpack.streams.lifecycle.eventUpdatedDesc', {
        defaultMessage: 'Verdict: {verdict}, Criticality: {criticality}',
        values: {
          verdict: event.verdict,
          criticality: event.criticality ? String(event.criticality) : '-',
        },
      });

function buildTimelineEntries(data: EventLifecycleResponse): TimelineEntry[] {
  const detections: TimelineEntry[] = data.detections.map((detection) => ({
    type: 'detection' as const,
    timestamp: detection.detected_at,
    title: detection.rule_name ?? '-',
    description: [detection.stream_name, detection.change_point_type].filter(Boolean).join(' · '),
  }));

  const discoveries: TimelineEntry[] = data.discoveries.map((discovery) => ({
    type: 'discovery' as const,
    timestamp: discovery['@timestamp'],
    title: discovery.title,
    description: buildDiscoveryDescription(discovery),
  }));

  const verdicts: TimelineEntry[] = data.verdicts.map((verdict) => ({
    type: 'verdict' as const,
    timestamp: verdict['@timestamp'],
    title: verdict.verdict,
    description: verdict.verdict_summary,
  }));

  const sortedEvents = [...data.events].sort(
    (a, b) => (Date.parse(a['@timestamp']) || 0) - (Date.parse(b['@timestamp']) || 0)
  );
  const events: TimelineEntry[] = sortedEvents.map((event, idx) => ({
    type: 'event' as const,
    timestamp: event['@timestamp'],
    title: idx === 0 ? EVENT_CREATED_LABEL : EVENT_UPDATED_LABEL,
    description: buildEventDescription({ event, isFirst: idx === 0 }),
  }));

  return [...detections, ...discoveries, ...verdicts, ...events].sort(
    (a, b) => (Date.parse(a.timestamp) || 0) - (Date.parse(b.timestamp) || 0)
  );
}

export const LifecycleTimeline = ({ data }: LifecycleTimelineProps) => {
  const entries = data ? buildTimelineEntries(data) : [];

  if (entries.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="timeline"
        titleSize="xs"
        title={
          <h3>
            {i18n.translate('xpack.streams.lifecycle.emptyTitle', {
              defaultMessage: 'No lifecycle data',
            })}
          </h3>
        }
        body={i18n.translate('xpack.streams.lifecycle.emptyBody', {
          defaultMessage: 'No lifecycle chain could be reconstructed for this event.',
        })}
      />
    );
  }

  return (
    <>
      {entries.map((entry, idx) => (
        <EuiTimelineItem
          key={`${entry.type}-${entry.timestamp}-${idx}`}
          icon={ENTITY_ICONS[entry.type]}
          iconAriaLabel={ENTITY_LABELS[entry.type]}
          verticalAlign="top"
        >
          <EuiPanel paddingSize="s" color="plain" hasBorder>
            <EuiText size="xs" color="subdued">
              {formatTimestamp(entry.timestamp)}
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiBadge color={ENTITY_COLORS[entry.type]}>{ENTITY_LABELS[entry.type]}</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{entry.title}</strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            {entry.description && (
              <>
                <EuiSpacer size="xs" />
                <EuiText size="xs" color="subdued">
                  {entry.description}
                </EuiText>
              </>
            )}
          </EuiPanel>
        </EuiTimelineItem>
      ))}
    </>
  );
};
