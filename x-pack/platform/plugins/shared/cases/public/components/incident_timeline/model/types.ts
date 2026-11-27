/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseStatuses } from '../../../../common/types/domain';
import type { IncidentTimelineAlert } from '../../../../common/types/api';
import type {
  IncidentTimelineEntryCategory,
  IncidentTimelineEntryData,
} from '../../../../common/types/domain/attachment/incident_timeline_entry/v2';

export interface TimeWindow {
  readonly startMs: number;
  readonly endMs: number;
}

/** One status user action, already parsed at the API boundary. */
export interface StatusChange {
  readonly status: CaseStatuses;
  readonly atMs: number;
  readonly user: string;
  readonly source?: string;
}

/** `opened` is in-progress back to open; a change away from closed is always `reopened`. */
export type CaseMarkerKind = 'created' | 'in_progress' | 'opened' | 'closed' | 'reopened';

export interface CaseMarker {
  readonly kind: CaseMarkerKind;
  readonly atMs: number;
  readonly user: string;
  readonly source?: string;
}

/** Markers closer than `TIMELINE_DENSITY.markerMergePx` drawn as one. */
export interface CaseMarkerGroup {
  readonly atMs: number;
  readonly markers: readonly CaseMarker[];
}

export interface CaseSpan {
  readonly status: CaseStatuses;
  readonly startMs: number;
  readonly endMs: number;
}

export interface CaseLane {
  readonly spans: readonly CaseSpan[];
  readonly markers: readonly CaseMarker[];
}

export interface AlertRow {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly alerts: readonly IncidentTimelineAlert[];
  readonly firstMs: number;
}

export interface AlertPoint {
  readonly alert: IncidentTimelineAlert;
  readonly timeMs: number;
  /** Vertical slot inside the row, so points closer than `pointStackPx` don't overlap. */
  readonly stack: number;
}

export interface AlertCell {
  readonly startMs: number;
  readonly endMs: number;
  readonly count: number;
  /** Distinct values, most frequent first. */
  readonly hostNames: readonly string[];
  readonly userNames: readonly string[];
}

export type AlertRowRendering =
  | { readonly kind: 'points'; readonly points: readonly AlertPoint[] }
  | { readonly kind: 'cells'; readonly cells: readonly AlertCell[]; readonly intervalMs: number };

export type EntryCategory = IncidentTimelineEntryCategory | 'uncategorized';

export interface TimelineEntry {
  readonly id: string;
  readonly version: string;
  readonly category: EntryCategory;
  readonly occurredMs: number;
  readonly endMs?: number;
  readonly createdBy: string;
  readonly data: IncidentTimelineEntryData;
}

export interface EntryRow {
  readonly category: EntryCategory;
  readonly entries: readonly TimelineEntry[];
}

export interface TimelineModel {
  /** The default window; zoom state lives in the panel. */
  readonly window: TimeWindow;
  readonly caseLane: CaseLane;
  readonly entryRows: readonly EntryRow[];
  readonly alertRows: readonly AlertRow[];
  readonly hiddenRuleCount: number;
  /** Changes away from closed, the lifespan metric's reopen rule. */
  readonly reopenCount: number;
  /** Every alert the lane plots, rows behind "Show N more rules" included. */
  readonly alertCount: number;
}

export type TimelineSelection =
  | { readonly kind: 'alert'; readonly alert: IncidentTimelineAlert; readonly ruleName: string }
  | { readonly kind: 'entry'; readonly entry: TimelineEntry };

/** One row of the table view: every case status change, entry and alert, in time order. */
export type TimelineEvent =
  | {
      readonly kind: 'status';
      readonly id: string;
      readonly atMs: number;
      readonly marker: CaseMarker;
    }
  | {
      readonly kind: 'entry';
      readonly id: string;
      readonly atMs: number;
      readonly entry: TimelineEntry;
    }
  | {
      readonly kind: 'alert';
      readonly id: string;
      readonly atMs: number;
      readonly alert: IncidentTimelineAlert;
      readonly ruleName: string;
    };
