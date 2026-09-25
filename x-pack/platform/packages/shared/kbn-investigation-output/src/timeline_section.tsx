/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiTimeline, type EuiTimelineProps, type IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InvestigationTimelineEvent } from '@kbn/significant-events-schema';

type TimelineEventType = InvestigationTimelineEvent['type'];

const TIMELINE_EVENT_ICONS: Record<TimelineEventType, IconType> = {
  change: 'package',
  symptom: 'warning',
  alert: 'bell',
  recovery: 'checkCircle',
  other: 'dot',
};

const TIMELINE_EVENT_LABELS: Record<TimelineEventType, string> = {
  change: i18n.translate('xpack.investigationOutput.timeline.changeLabel', {
    defaultMessage: 'Change',
  }),
  symptom: i18n.translate('xpack.investigationOutput.timeline.symptomLabel', {
    defaultMessage: 'Symptom',
  }),
  alert: i18n.translate('xpack.investigationOutput.timeline.alertLabel', {
    defaultMessage: 'Alert',
  }),
  recovery: i18n.translate('xpack.investigationOutput.timeline.recoveryLabel', {
    defaultMessage: 'Recovery',
  }),
  other: i18n.translate('xpack.investigationOutput.timeline.otherLabel', {
    defaultMessage: 'Event',
  }),
};

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

const formatTimestamp = (timestamp: string): string => {
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? timestamp : dateTimeFormat.format(parsed);
};

export interface TimelineSectionProps {
  timeline: InvestigationTimelineEvent[];
}

/** Chronological view of the relevant events in the investigated system. */
export const TimelineSection: React.FC<TimelineSectionProps> = ({ timeline }) => {
  if (timeline.length === 0) {
    return null;
  }

  const items: EuiTimelineProps['items'] = timeline.map(({ timestamp, type, summary }) => ({
    icon: TIMELINE_EVENT_ICONS[type],
    iconAriaLabel: TIMELINE_EVENT_LABELS[type],
    verticalAlign: 'top',
    'data-test-subj': `investigationOutputTimelineEvent-${type}`,
    children: (
      <>
        <EuiText size="xs" color="subdued">
          {`${formatTimestamp(timestamp)} · ${TIMELINE_EVENT_LABELS[type]}`}
        </EuiText>
        <EuiText size="s">
          <p>{summary}</p>
        </EuiText>
      </>
    ),
  }));

  return <EuiTimeline items={items} gutterSize="m" data-test-subj="investigationOutputTimeline" />;
};
