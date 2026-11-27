/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IncidentTimelineAlert } from '../../../../common/types/api';
import { alertTimeMs } from './alert_rows';
import type { CaseMarker, TimelineEntry, TimelineEvent } from './types';

const KIND_ORDER: Record<TimelineEvent['kind'], number> = { status: 0, entry: 1, alert: 2 };

/** Every status change, entry and alert, oldest first; at the same time case events come first. */
export const buildTimelineEvents = ({
  markers,
  entries,
  alerts,
}: {
  markers: readonly CaseMarker[];
  entries: readonly TimelineEntry[];
  alerts: readonly IncidentTimelineAlert[];
}): TimelineEvent[] => {
  const events: TimelineEvent[] = [
    ...markers.map(
      (marker, index): TimelineEvent => ({
        kind: 'status',
        id: `status-${index}`,
        atMs: marker.atMs,
        marker,
      })
    ),
    ...entries.map(
      (entry): TimelineEvent => ({
        kind: 'entry',
        id: `entry-${entry.id}`,
        atMs: entry.occurredMs,
        entry,
      })
    ),
    ...alerts.map(
      (alert): TimelineEvent => ({
        kind: 'alert',
        id: `alert-${alert.id}`,
        atMs: alertTimeMs(alert),
        alert,
        ruleName: alert.ruleName ?? alert.ruleId ?? '',
      })
    ),
  ];
  return events.sort((a, b) => a.atMs - b.atMs || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
};
