/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import type {
  ActivityEntry,
  TimelineEventItem,
  TimelineEventDetails,
} from '../../../../common/investigations/types';
import { ENTITY_TYPE_ICONS, ICONS } from '../../icons';
import { formatDuration } from '../shared';
import type { SortOrder } from './use_response_log';
import * as i18n from './translations';

export type Lane = 'all' | 'security' | 'response';

export const MAX_EVENTS = 500;

export type TimelineRow =
  | { lane: 'security'; id: string; ts: number; item: TimelineEventItem }
  | { lane: 'response'; id: string; ts: number; entry: ActivityEntry };

export const ACTOR_KIND_ICONS: Record<TimelineEventDetails['actor']['kind'], string> = {
  user: ICONS.user,
  nhi: ENTITY_TYPE_ICONS.nhi,
  proc: ICONS.process,
  rule: ICONS.rule,
  unk: ICONS.unknownActor,
};

export const parseTime = (value: string): number => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const sortSecurityEvents = (items: readonly TimelineEventItem[]): TimelineEventItem[] =>
  [...items].sort(
    (a, b) =>
      parseTime(a.timeline_event.occurred_at) - parseTime(b.timeline_event.occurred_at) ||
      a.ref.localeCompare(b.ref, undefined, { numeric: true })
  );

export const matchesEventSearch = (item: TimelineEventItem, query: string): boolean => {
  if (query.length === 0) {
    return true;
  }
  const { timeline_event: event } = item;
  return [
    item.title,
    item.text ?? '',
    event.stage,
    event.mitre ?? '',
    event.actor.name,
    event.actor.sub ?? '',
    event.source,
  ]
    .join(' ')
    .toLowerCase()
    .includes(query);
};

/** `T+3 min` for a time after the first security event, `T-2 h` for one before it. */
export const formatOffset = (ts: number, origin: number | undefined): string | null => {
  if (origin === undefined) {
    return null;
  }
  const delta = ts - origin;
  if (delta === 0) {
    return i18n.T_ZERO;
  }
  return delta > 0 ? i18n.T_PLUS(formatDuration(delta)) : i18n.T_MINUS(formatDuration(-delta));
};

export const formatClock = (ts: number): string => moment.utc(ts).format('HH:mm:ss');
export const formatDayKey = (ts: number): string => moment.utc(ts).format('YYYY-MM-DD');
export const formatDayLabel = (ts: number): string => moment.utc(ts).format('dddd, MMM D, YYYY');
export const formatStageTime = (ts: number): string =>
  moment.utc(ts).format('MMM D, HH:mm:ss [UTC]');

export interface DayGroup {
  key: string;
  label: string;
  rows: TimelineRow[];
}

export const groupByDay = (rows: readonly TimelineRow[]): DayGroup[] => {
  const groups: DayGroup[] = [];
  rows.forEach((row) => {
    const key = formatDayKey(row.ts);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.rows.push(row);
      return;
    }
    groups.push({ key, label: formatDayLabel(row.ts), rows: [row] });
  });
  return groups;
};

export interface MergeResult {
  rows: TimelineRow[];
  /** Security events left out because the response log is loaded only part of the way. */
  heldBack: number;
}

/**
 * Interleaves the lanes by time. While more of the response log is waiting to load, security
 * events past the last loaded entry are held back so the two lanes never disagree about order.
 */
export const mergeLanes = ({
  lane,
  order,
  events,
  entries,
  hasMoreEntries,
}: {
  lane: Lane;
  order: SortOrder;
  events: readonly TimelineEventItem[];
  entries: readonly ActivityEntry[];
  hasMoreEntries: boolean;
}): MergeResult => {
  const securityRows: TimelineRow[] =
    lane === 'response'
      ? []
      : events.map((item) => ({
          lane: 'security',
          id: `event-${item.id}`,
          ts: parseTime(item.timeline_event.occurred_at),
          item,
        }));
  const responseRows: TimelineRow[] =
    lane === 'security'
      ? []
      : entries.map((entry) => ({
          lane: 'response',
          id: `entry-${entry.id}`,
          ts: parseTime(entry.ts),
          entry,
        }));

  let heldBack = 0;
  let visibleSecurity = securityRows;
  if (lane === 'all' && hasMoreEntries && responseRows.length > 0) {
    const boundary = responseRows.reduce(
      (edge, row) => (order === 'asc' ? Math.max(edge, row.ts) : Math.min(edge, row.ts)),
      order === 'asc' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
    );
    visibleSecurity = securityRows.filter((row) =>
      order === 'asc' ? row.ts <= boundary : row.ts >= boundary
    );
    heldBack = securityRows.length - visibleSecurity.length;
  }

  const direction = order === 'asc' ? 1 : -1;
  const rows = [...visibleSecurity, ...responseRows].sort((a, b) => (a.ts - b.ts) * direction);
  return { rows, heldBack };
};

export interface StageSummary {
  stage: string;
  firstEvent: TimelineEventItem;
  ts: number;
  suspected: boolean;
}

/** One entry per stage, in order of first appearance. */
export const getStages = (events: readonly TimelineEventItem[]): StageSummary[] => {
  const stages: StageSummary[] = [];
  events.forEach((item) => {
    const { stage } = item.timeline_event;
    if (stage.length === 0 || stages.some((summary) => summary.stage === stage)) {
      return;
    }
    stages.push({
      stage,
      firstEvent: item,
      ts: parseTime(item.timeline_event.occurred_at),
      suspected: item.timeline_event.flag === 'suspected',
    });
  });
  return stages;
};
