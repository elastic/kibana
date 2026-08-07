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
import { getSeverityLabel, type EventLifecycleResponse } from '@kbn/significant-events-schema';
import { formatTimestamp } from '../../../../util/formatters';
import { changeTypeLabel } from '../shared/translations';
import { getLifecycleStatusColor, getLifecycleStatusLabel } from '../shared/status_display';

interface TimelineEntry {
  icon: string;
  label: string;
  color: string;
  timestamp: string;
  title: string;
  description?: string;
  detail?: string;
  /** Set when a workflow execution produced this version; shown as a "created by workflow" line. */
  workflowExecutionId?: string;
}

const FLOW_ICONS = {
  detection: 'bell',
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

  const events: TimelineEntry[] = [...data.events]
    .sort((a, b) => Date.parse(a['@timestamp']) - Date.parse(b['@timestamp']))
    .map((event) => ({
      icon: FLOW_ICONS.event,
      label: event.status ? getLifecycleStatusLabel(event.status) : '',
      color: event.status ? getLifecycleStatusColor(event.status) : 'hollow',
      timestamp: event['@timestamp'],
      title: event.title,
      description:
        event.severity != null
          ? i18n.translate('xpack.significantEventsApp.lifecycle.severity', {
              defaultMessage: 'Severity: {severity}',
              values: { severity: getSeverityLabel(event.severity) },
            })
          : undefined,

      detail: event.assessment_note,
      workflowExecutionId: event.workflow_execution_id,
    }));

  return [...detections, ...events].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
  );
}

/** A subdued detail line under a timeline entry, preceded by a small spacer. */
const SubduedLine: React.FC<{ children: React.ReactNode; 'data-test-subj'?: string }> = ({
  children,
  'data-test-subj': dataTestSubj,
}) => (
  <>
    <EuiSpacer size="xs" />
    <EuiText size="xs" color="subdued" data-test-subj={dataTestSubj}>
      {children}
    </EuiText>
  </>
);

export const LifecycleTimeline = ({ data }: { data: EventLifecycleResponse | undefined }) => {
  const entries = data ? buildEntries(data) : [];

  if (entries.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="timeline"
        titleSize="xs"
        title={
          <h3>
            {i18n.translate('xpack.significantEventsApp.lifecycle.emptyTitle', {
              defaultMessage: 'No lifecycle data',
            })}
          </h3>
        }
        body={i18n.translate('xpack.significantEventsApp.lifecycle.emptyBody', {
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
            {entry.description && <SubduedLine>{entry.description}</SubduedLine>}
            {entry.detail && <SubduedLine>{entry.detail}</SubduedLine>}
            {entry.workflowExecutionId && (
              <SubduedLine data-test-subj="lifecycleCreatedByWorkflow">
                {i18n.translate('xpack.significantEventsApp.lifecycle.createdByWorkflow', {
                  defaultMessage: 'Created by workflow: {id}',
                  values: { id: entry.workflowExecutionId },
                })}
              </SubduedLine>
            )}
          </EuiPanel>
        </EuiTimelineItem>
      ))}
    </>
  );
};
