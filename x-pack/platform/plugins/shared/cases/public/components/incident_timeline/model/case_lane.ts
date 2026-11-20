/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../../../common/types/domain';
import type {
  CaseLane,
  CaseMarker,
  CaseMarkerGroup,
  CaseMarkerKind,
  CaseSpan,
  StatusChange,
  TimeWindow,
} from './types';
import type { TimelineDensity } from './density';
import { TIMELINE_DENSITY } from './density';

/** Same reopen rule as the lifespan metric: any change away from closed. */
const markerKind = (from: CaseStatuses, to: CaseStatuses): CaseMarkerKind => {
  if (to === CaseStatuses.closed) return 'closed';
  if (from === CaseStatuses.closed) return 'reopened';
  if (to === CaseStatuses['in-progress']) return 'in_progress';
  return 'opened';
};

/**
 * Walks status changes from `open` at case creation. Every period becomes a span; an open
 * case's last span runs to `nowMs`, a closed case ends at its last close.
 */
export const buildCaseLane = ({
  createdAtMs,
  createdBy,
  statusChanges,
  nowMs,
}: {
  createdAtMs: number;
  createdBy: string;
  statusChanges: readonly StatusChange[];
  nowMs: number;
}): CaseLane => {
  const spans: CaseSpan[] = [];
  const markers: CaseMarker[] = [{ kind: 'created', atMs: createdAtMs, user: createdBy }];
  let status: CaseStatuses = CaseStatuses.open;
  let since = createdAtMs;

  const ordered = [...statusChanges].sort((a, b) => a.atMs - b.atMs);
  const changes = ordered.filter(
    (change, i) => change.status !== (ordered[i - 1]?.status ?? status)
  );
  for (const change of changes) {
    spans.push({ status, startMs: since, endMs: change.atMs });
    markers.push({
      kind: markerKind(status, change.status),
      atMs: change.atMs,
      user: change.user,
      source: change.source,
    });
    status = change.status;
    since = change.atMs;
  }

  if (status !== CaseStatuses.closed) {
    spans.push({ status, startMs: since, endMs: Math.max(since, nowMs) });
  }

  return { spans, markers };
};

/** Groups markers that would sit closer than `markerMergePx` at the given chart width. */
export const groupCaseMarkers = (
  markers: readonly CaseMarker[],
  window: TimeWindow,
  widthPx: number,
  density: TimelineDensity = TIMELINE_DENSITY
): CaseMarkerGroup[] => {
  const msPerPx = (window.endMs - window.startMs) / Math.max(widthPx, 1);
  const mergeMs = density.markerMergePx * msPerPx;
  const groups: Array<{ atMs: number; markers: CaseMarker[] }> = [];

  for (const marker of [...markers].sort((a, b) => a.atMs - b.atMs)) {
    const last = groups[groups.length - 1];
    if (last && marker.atMs - last.atMs < mergeMs) {
      last.markers.push(marker);
    } else {
      groups.push({ atMs: marker.atMs, markers: [marker] });
    }
  }
  return groups;
};
