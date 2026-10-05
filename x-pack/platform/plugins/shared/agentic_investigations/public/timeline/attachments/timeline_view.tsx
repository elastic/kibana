/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import type { IconType } from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
  EuiTitle,
} from '@elastic/eui';
import {
  sortTimelineEvents,
  type InvestigationTimeline,
  type TimelineEvent,
  type TimelineEventType,
} from '../../../common/timeline/timeline';
import { EvidenceView } from '../../evidence/evidence_view';
import type {
  InvestigationAttachmentContentProps,
  InvestigationAttachmentVariant,
} from '../../investigation_attachments';
import { StepIcon, type StepIconTone } from '../../investigation_attachments/step_icon';

const NO_EVENTS = i18n.translate('xpack.agenticInvestigations.timeline.empty', {
  defaultMessage: 'No events recorded yet.',
});

const EVENT_TYPE_LABELS: Record<TimelineEventType, string> = {
  change: i18n.translate('xpack.agenticInvestigations.timeline.type.change', {
    defaultMessage: 'Change',
  }),
  symptom: i18n.translate('xpack.agenticInvestigations.timeline.type.symptom', {
    defaultMessage: 'Symptom',
  }),
  detection: i18n.translate('xpack.agenticInvestigations.timeline.type.detection', {
    defaultMessage: 'Detection',
  }),
  action: i18n.translate('xpack.agenticInvestigations.timeline.type.action', {
    defaultMessage: 'Action',
  }),
  recovery: i18n.translate('xpack.agenticInvestigations.timeline.type.recovery', {
    defaultMessage: 'Recovery',
  }),
  other: i18n.translate('xpack.agenticInvestigations.timeline.type.other', {
    defaultMessage: 'Event',
  }),
};

const EVENT_TYPE_ICONS: Record<TimelineEventType, IconType> = {
  change: 'merge',
  symptom: 'warning',
  detection: 'bell',
  action: 'wrench',
  recovery: 'checkCircle',
  other: 'dot',
};

const EVENT_TYPE_COLORS: Record<TimelineEventType, StepIconTone> = {
  change: 'primary',
  symptom: 'danger',
  detection: 'warning',
  action: 'accent',
  recovery: 'success',
  other: 'neutral',
};

const offsetLabel = (from: string, to: string): string | undefined => {
  const minutes = Math.round(moment(to).diff(moment(from), 'minutes', true));
  if (!Number.isFinite(minutes) || minutes === 0) {
    return undefined;
  }
  const sign = minutes > 0 ? '+' : '-';
  const absolute = Math.abs(minutes);
  return absolute < 120
    ? i18n.translate('xpack.agenticInvestigations.timeline.offsetMinutes', {
        defaultMessage: '{sign}{minutes}m',
        values: { sign, minutes: absolute },
      })
    : i18n.translate('xpack.agenticInvestigations.timeline.offsetHours', {
        defaultMessage: '{sign}{hours}h',
        values: { sign, hours: Math.round((absolute / 60) * 10) / 10 },
      });
};

const formatTime = (timestamp: string): string => moment(timestamp).format('MMM D, HH:mm:ss');

const TimelineEventItem = ({
  event: { timestamp, end_timestamp: endTimestamp, title, type, entity, evidence },
  firstTimestamp,
  variant,
}: {
  event: TimelineEvent;
  firstTimestamp: string;
  variant: InvestigationAttachmentVariant;
}) => {
  const offset = offsetLabel(firstTimestamp, timestamp);
  return (
    <EuiTimelineItem
      verticalAlign="top"
      data-test-subj={`investigationTimelineEvent-${type}`}
      icon={
        <StepIcon
          label={EVENT_TYPE_LABELS[type]}
          iconType={EVENT_TYPE_ICONS[type]}
          tone={EVENT_TYPE_COLORS[type]}
        />
      }
    >
      <EuiPanel hasBorder hasShadow={false} paddingSize="s">
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" data-test-subj="investigationTimelineEventTime">
              <span>
                {formatTime(timestamp)}
                {endTimestamp ? ` – ${formatTime(endTimestamp)}` : ''}
                {offset ? ` (${offset})` : ''}
              </span>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{EVENT_TYPE_LABELS[type]}</EuiBadge>
          </EuiFlexItem>
          {entity && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="default" iconType="compute">
                {entity}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiTitle size="xxs">
          <h4 data-test-subj="investigationTimelineEventTitle">{title}</h4>
        </EuiTitle>
        {variant === 'details' && evidence && (
          <>
            <EuiSpacer size="s" />
            <EvidenceView evidence={evidence} />
          </>
        )}
      </EuiPanel>
    </EuiTimelineItem>
  );
};

/**
 * The investigation's events in time order on a vertical axis, each with its time (and offset
 * from the first event), type, entity, and, in the details flyout, its evidence.
 */
export const TimelineEventsList: React.FC<{
  events: TimelineEvent[];
  variant: InvestigationAttachmentVariant;
}> = ({ events, variant }) => {
  const sorted = useMemo(() => sortTimelineEvents(events), [events]);
  if (sorted.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="investigationTimelineEmpty">
        {NO_EVENTS}
      </EuiText>
    );
  }
  return (
    <EuiTimeline gutterSize="m" data-test-subj="investigationTimeline">
      {sorted.map((event, index) => (
        <TimelineEventItem
          key={index}
          event={event}
          firstTimestamp={sorted[0].timestamp}
          variant={variant}
        />
      ))}
    </EuiTimeline>
  );
};

export const TimelineView: React.FC<InvestigationAttachmentContentProps<InvestigationTimeline>> = ({
  document: { events },
  variant,
}) => <TimelineEventsList events={events} variant={variant} />;
