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

type EntityType = 'detection' | 'discovery' | 'clearance' | 'event';

interface TimelineEntry {
  type: EntityType;
  timestamp: string;
  title: string;
  description: string;
  detail?: string;
}

interface LifecycleTimelineProps {
  data: EventLifecycleResponse | undefined;
}

const ENTITY_ICONS: Record<EntityType, string> = {
  detection: 'bell',
  discovery: 'inspect',
  clearance: 'check',
  event: 'documentEdit',
};

const ENTITY_COLORS: Record<EntityType, string> = {
  detection: 'warning',
  discovery: 'primary',
  clearance: 'success',
  event: 'accent',
};

const ENTITY_LABELS: Record<EntityType, string> = {
  detection: i18n.translate('xpack.streams.lifecycle.detection', {
    defaultMessage: 'Detection',
  }),
  discovery: i18n.translate('xpack.streams.lifecycle.discovery', {
    defaultMessage: 'Discovery',
  }),
  clearance: i18n.translate('xpack.streams.lifecycle.clearance', {
    defaultMessage: 'Cleared',
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
): string => {
  if (discovery.kind === 'clearance') {
    return i18n.translate('xpack.streams.lifecycle.discoveryCleared', {
      defaultMessage: 'All detection signals resolved',
    });
  }
  const occurrence = discovery.change_point_occurrence;
  const parts: string[] = [];
  if (occurrence) parts.push(occurrence);
  parts.push(
    i18n.translate('xpack.streams.lifecycle.discoveryCriticality', {
      defaultMessage: 'criticality {criticality}',
      values: { criticality: discovery.criticality ?? '-' },
    })
  );
  return parts.join(' · ');
};

const buildEventDescription = ({
  event,
}: {
  event: EventLifecycleResponse['events'][number];
}): { description: string; detail?: string } => {
  const description = i18n.translate('xpack.streams.lifecycle.eventDesc', {
    defaultMessage: 'Status: {status}, Criticality: {criticality}',
    values: {
      // TODO: rename to event.status once the data stream field is renamed
      status: event.verdict ?? '-',
      criticality: event.criticality != null ? String(event.criticality) : '-',
    },
  });
  const detail =
    [event.verdict_summary, event.assessment_note].filter(Boolean).join(' — ') || undefined;
  return { description, detail };
};

function buildTimelineEntries(data: EventLifecycleResponse): TimelineEntry[] {
  const detections: TimelineEntry[] = data.detections.map((detection) => ({
    type: 'detection' as const,
    timestamp: detection.detected_at,
    title: detection.rule_name ?? '-',
    description: [detection.stream_name, detection.change_point_type].filter(Boolean).join(' · '),
  }));

  const discoveries: TimelineEntry[] = data.discoveries.map((discovery) => ({
    type: (discovery.kind === 'clearance' ? 'clearance' : 'discovery') as EntityType,
    timestamp: discovery['@timestamp'],
    title: discovery.title,
    description: buildDiscoveryDescription(discovery),
  }));

  const sortedEvents = [...data.events].sort(
    (a, b) => (Date.parse(a['@timestamp']) || 0) - (Date.parse(b['@timestamp']) || 0)
  );
  const events: TimelineEntry[] = sortedEvents.map((event, idx) => {
    const { description, detail } = buildEventDescription({ event });
    return {
      type: 'event' as const,
      timestamp: event['@timestamp'],
      title: idx === 0 ? EVENT_CREATED_LABEL : EVENT_UPDATED_LABEL,
      description: idx === 0 ? event.title : description,
      detail: idx === 0 ? description : detail,
    };
  });

  return [...detections, ...discoveries, ...events].sort(
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
            {entry.detail && (
              <>
                <EuiSpacer size="xs" />
                <EuiText size="xs" color="subdued">
                  {entry.detail}
                </EuiText>
              </>
            )}
          </EuiPanel>
        </EuiTimelineItem>
      ))}
    </>
  );
};
