/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IncidentTimelineAlert } from '../../../../common/types/api';
import type { StatusChange, TimeWindow, TimelineEntry, TimelineModel } from './types';
import type { TimelineDensity } from './density';
import { TIMELINE_DENSITY } from './density';
import { buildCaseLane } from './case_lane';
import { alertTimeMs, buildAlertRows } from './alert_rows';
import { buildEntryRows } from './entry_rows';

const MIN_SPAN_MS = 60 * 1000;

/**
 * From the earliest of alerts, entries and case creation to the latest of alerts, entry ends
 * and the close (or now), padded on each side.
 */
export const getDefaultWindow = (
  {
    createdAtMs,
    endOfCaseMs,
    alerts,
    entries,
  }: {
    createdAtMs: number;
    endOfCaseMs: number;
    alerts: readonly IncidentTimelineAlert[];
    entries: readonly TimelineEntry[];
  },
  density: TimelineDensity = TIMELINE_DENSITY
): TimeWindow => {
  const alertTimes = alerts.map(alertTimeMs);
  const starts = [createdAtMs, ...alertTimes, ...entries.map(({ occurredMs }) => occurredMs)];
  const ends = [
    endOfCaseMs,
    ...alertTimes,
    ...entries.map(({ occurredMs, endMs }) => endMs ?? occurredMs),
  ];
  const startMs = Math.min(...starts);
  const endMs = Math.max(...ends);
  const pad = Math.max(endMs - startMs, MIN_SPAN_MS) * density.windowPadRatio;
  return { startMs: startMs - pad, endMs: endMs + pad };
};

export const buildTimelineModel = (
  {
    createdAtMs,
    createdBy,
    closedAtMs,
    statusChanges,
    alerts,
    entries,
    nowMs,
    showAllRules,
  }: {
    createdAtMs: number;
    createdBy: string;
    /** Set only while the case is closed. */
    closedAtMs?: number;
    statusChanges: readonly StatusChange[];
    alerts: readonly IncidentTimelineAlert[];
    entries: readonly TimelineEntry[];
    nowMs: number;
    showAllRules: boolean;
  },
  density: TimelineDensity = TIMELINE_DENSITY
): TimelineModel => {
  const rows = buildAlertRows(alerts);
  const alertRows = showAllRules ? rows : rows.slice(0, density.maxAlertRows);

  const caseLane = buildCaseLane({ createdAtMs, createdBy, statusChanges, nowMs });

  return {
    window: getDefaultWindow(
      { createdAtMs, endOfCaseMs: closedAtMs ?? nowMs, alerts, entries },
      density
    ),
    caseLane,
    entryRows: buildEntryRows(entries),
    alertRows,
    hiddenRuleCount: rows.length - alertRows.length,
    reopenCount: caseLane.markers.filter(({ kind }) => kind === 'reopened').length,
    alertCount: alerts.length,
  };
};
