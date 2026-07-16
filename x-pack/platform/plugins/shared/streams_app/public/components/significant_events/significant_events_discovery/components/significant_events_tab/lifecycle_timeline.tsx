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
import type { Discovery, EventLifecycleResponse } from '@kbn/significant-events-schema';
import { formatTimestamp } from '../../../../../util/formatters';
import { changeTypeLabel } from '../shared/translations';
import {
  getLifecycleStatusColor,
  getLifecycleStatusLabel,
  isVisibleDiscoveryKind,
} from '../shared/status_display';

interface TimelineEntry {
  icon: string;
  label: string;
  color: string;
  timestamp: string;
  title: string;
  description?: string;
  detail?: string;
}

const FLOW_ICONS = {
  detection: 'bell',
  discovery: 'inspect',
  event: 'documentEdit',
} as const;

function buildEntries(data: EventLifecycleResponse): TimelineEntry[] {
  const detections: TimelineEntry[] = data.detections.map((detection) => ({
    icon: FLOW_ICONS.detection,
    // Change-point observation only — never a lifecycle state.
    label: changeTypeLabel(detection.change_point_type),
    color: 'hollow',
    timestamp: detection['@timestamp'],
    title: detection.rule_name ?? '-',
    description: [detection.stream_name, changeTypeLabel(detection.change_point_type)]
      .filter(Boolean)
      .join(' · '),
  }));

  const discoveries: TimelineEntry[] = data.discoveries
    .filter((discovery): discovery is Discovery & { kind: Exclude<Discovery['kind'], 'handled'> } =>
      isVisibleDiscoveryKind(discovery.kind)
    )
    .map((discovery) => ({
      icon: FLOW_ICONS.discovery,
      label: getLifecycleStatusLabel(discovery.kind),
      color: getLifecycleStatusColor(discovery.kind),
      timestamp: discovery['@timestamp'],
      title: discovery.title,
      description:
        discovery.kind === 'discovery' && discovery.criticality != null
          ? i18n.translate('xpack.streams.lifecycle.criticality', {
              defaultMessage: 'Criticality {n}',
              values: { n: discovery.criticality },
            })
          : undefined,
    }));

  const events: TimelineEntry[] = [...data.events]
    .sort((a, b) => Date.parse(a['@timestamp']) - Date.parse(b['@timestamp']))
    .map((event) => ({
      icon: FLOW_ICONS.event,
      label: event.status ? getLifecycleStatusLabel(event.status) : '',
      color: event.status ? getLifecycleStatusColor(event.status) : 'hollow',
      timestamp: event['@timestamp'],
      title: event.title,
      description:
        event.criticality != null
          ? i18n.translate('xpack.streams.lifecycle.criticality', {
              defaultMessage: 'Criticality {n}',
              values: { n: event.criticality },
            })
          : undefined,

      detail: event.assessment_note,
    }));

  return [...detections, ...discoveries, ...events].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
  );
}

export const LifecycleTimeline = ({ data }: { data: EventLifecycleResponse | undefined }) => {
  const entries = data ? buildEntries(data) : [];

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
          key={`${entry.label}-${entry.timestamp}-${idx}`}
          icon={entry.icon}
          iconAriaLabel={entry.label}
          verticalAlign="top"
        >
          <EuiPanel paddingSize="s" color="plain" hasBorder>
            <EuiText size="xs" color="subdued">
              {formatTimestamp(entry.timestamp)}
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiBadge color={entry.color}>{entry.label}</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem>
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
