/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImpactMapEvent, ImpactMapEventKind, ImpactMapTimeline } from './impact_map';
import { MAX_TIMELINE_KEY_EVENTS } from './impact_map';

type TimelineWindow = NonNullable<ImpactMapTimeline['windows']>[number];

/** What the summary timeline shows: its events, oldest first, and the spans it highlights. */
export interface TimelineSummaryData {
  events: ImpactMapEvent[];
  windows: TimelineWindow[];
  /** The events hidden between each event and the next; one fewer than `events`. */
  hiddenBetween: ImpactMapEvent[][];
  /** The filters the agent applied. The whole timeline starts with the same ones. */
  filters?: TimelineFilters;
  /** The event whose chart the expanded timeline draws, when there is one. */
  chartEvent?: ImpactMapEvent;
}

export interface TimelineFilters {
  entity_ids: string[];
  kinds: ImpactMapEventKind[];
}

const at = (event: ImpactMapEvent): number => Date.parse(event.at);
const byTime = (a: ImpactMapEvent, b: ImpactMapEvent): number =>
  at(a) - at(b) || a.id.localeCompare(b.id);

/** The entity ids an event touches: its entity, or both ends of its relationship. */
export const getEventEntityIds = (
  { entity_id: entityId, relationship_id: relationshipId }: ImpactMapEvent,
  relationships: ReadonlyArray<{ id?: string; source_id: string; target_id: string }>
): string[] => {
  if (entityId) {
    return [entityId];
  }
  if (!relationshipId) {
    return [];
  }
  const relationship = relationships.find(({ id }) => id === relationshipId);
  return relationship
    ? [relationship.source_id, relationship.target_id]
    : relationshipId.split('->').filter(Boolean);
};

/** `13:00Z`, in UTC, as the timelines label an instant. */
export const formatTimelineClock = (iso: string): string => {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}Z`;
};

/** The kinds a summary draws on its own, most telling first. Findings and responses are not events. */
const DERIVED_KINDS: ImpactMapEventKind[] = [
  'root_cause',
  'alert',
  'recovery',
  'customer_impact',
  'failure',
  'change',
  'mitigation',
];

/**
 * Key events picked from their kinds, for an investigation whose agent chose none: the first of
 * each kind that tells the story, and the last change as well when there were several.
 */
const deriveKeyEvents = (sorted: readonly ImpactMapEvent[]): ImpactMapEvent[] => {
  const picked = new Map<string, ImpactMapEvent>();
  DERIVED_KINDS.forEach((kind) => {
    const ofKind = sorted.filter((event) => event.kind === kind);
    if (ofKind.length > 0) picked.set(ofKind[0].id, ofKind[0]);
    if (kind === 'change' && ofKind.length > 1) {
      const last = ofKind[ofKind.length - 1];
      picked.set(last.id, last);
    }
  });
  return [...picked.values()].sort(byTime).slice(0, MAX_TIMELINE_KEY_EVENTS);
};

/** `6h`, `6h 12m`, `45m`: how long a span lasted, for a window's label. */
export const formatTimelineSpan = (fromMs: number, toMs: number): string => {
  const minutes = Math.max(0, Math.round((toMs - fromMs) / 60_000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours >= 24) return `${Math.floor(hours / 24)}d${hours % 24 ? ` ${hours % 24}h` : ''}`;
  return hours > 0 ? `${hours}h${rest ? ` ${rest}m` : ''}` : `${rest}m`;
};

/** A window from the first customer impact to the first recovery after it, when both exist. */
const deriveWindow = (sorted: readonly ImpactMapEvent[]): TimelineWindow | undefined => {
  const start = sorted.find(({ kind }) => kind === 'customer_impact');
  const end = start && sorted.find((event) => event.kind === 'recovery' && at(event) > at(start));
  if (!start || !end) return undefined;
  return {
    label: `Impact ${formatTimelineSpan(at(start), at(end))}`,
    start: start.at,
    end: end.at,
    tone: 'danger',
  };
};

/**
 * The summary timeline of an impact map: the events left by the filters the agent applied, else
 * key events picked from their kinds. More than eight events pass the filters, the key ones of
 * those are drawn. Fewer than two events is no timeline.
 */
export const selectTimelineSummary = ({
  events,
  relationships = [],
  timeline,
}: {
  events: readonly ImpactMapEvent[];
  relationships?: ReadonlyArray<{ id?: string; source_id: string; target_id: string }>;
  timeline?: ImpactMapTimeline;
}): TimelineSummaryData | undefined => {
  const all = events.filter((event) => !Number.isNaN(at(event))).sort(byTime);
  const requested = timeline?.filters;
  const filters: TimelineFilters | undefined =
    requested && ((requested.entity_ids?.length ?? 0) > 0 || (requested.kinds?.length ?? 0) > 0)
      ? { entity_ids: requested.entity_ids ?? [], kinds: requested.kinds ?? [] }
      : undefined;
  const matching = filters
    ? all.filter(
        (event) =>
          (filters.kinds.length === 0 || filters.kinds.includes(event.kind)) &&
          (filters.entity_ids.length === 0 ||
            getEventEntityIds(event, relationships).some((id) => filters.entity_ids.includes(id)))
      )
    : [];
  const useFilters = matching.length >= 2;
  const shown = useFilters
    ? matching.length > MAX_TIMELINE_KEY_EVENTS
      ? deriveKeyEvents(matching)
      : matching
    : deriveKeyEvents(all);
  if (shown.length < 2) return undefined;

  const position = new Map(all.map((event, index) => [event.id, index]));
  const hiddenBetween = shown
    .slice(1)
    .map((event, index) =>
      all.slice((position.get(shown[index].id) ?? 0) + 1, position.get(event.id) ?? 0)
    );
  const windows =
    timeline?.windows && timeline.windows.length > 0
      ? timeline.windows
      : [deriveWindow(all)].filter((window): window is TimelineWindow => window !== undefined);
  const chartEvent =
    (timeline?.chart_event_id ? all.find(({ id }) => id === timeline.chart_event_id) : undefined) ??
    all.find(
      ({ kind, evidence }) =>
        evidence?.chart?.series?.length && (kind === 'root_cause' || kind === 'customer_impact')
    );
  return {
    events: shown,
    windows,
    hiddenBetween,
    ...(useFilters && filters && { filters }),
    ...(chartEvent?.evidence?.chart && { chartEvent }),
  };
};

/** The gap between two events, as the summary labels it: `+42m`, `+4h 5m`, `+2d 3h`. */
export const formatTimelineGap = (fromMs: number, toMs: number): string => {
  const minutes = Math.max(0, Math.round((toMs - fromMs) / 60_000));
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  const rest = minutes % 60;
  if (days > 0) return `+${days}d${hours ? ` ${hours}h` : ''}`;
  if (hours > 0) return `+${hours}h${rest ? ` ${rest}m` : ''}`;
  return `+${rest}m`;
};

/** Whether the stretch between two instants lies inside a window (the summary draws it red). */
export const isInsideWindow = (
  fromMs: number,
  toMs: number,
  windows: readonly TimelineWindow[]
): TimelineWindow | undefined =>
  windows.find(({ start, end }) => fromMs >= Date.parse(start) && toMs <= Date.parse(end));

export interface TimeScaleTick {
  /** Position from 0 to 1. */
  x: number;
  /** `13:00`. */
  label: string;
  /** `10-30 UTC`, on the first tick of a stretch and when the day changes. */
  day?: string;
}

export interface TimeScale {
  /** Where an instant sits, from 0 to 1. Stretches with nothing in them are drawn short. */
  toX: (ms: number) => number;
  /** The instant at a position from 0 to 1; the inverse of `toX`, for a selection dragged on the axis. */
  toMs: (x: number) => number;
  /** Where the axis is broken, from 0 to 1. */
  breaks: number[];
  /** The stretches drawn short, with the real time each one covers. */
  gaps: Array<{ x: number; fromMs: number; toMs: number }>;
  ticks: TimeScaleTick[];
  startMs: number;
  endMs: number;
}

const TICK_STEPS_MS = [15, 30, 60, 120, 180, 360, 720, 1_440].map((minutes) => minutes * 60_000);

const pad2 = (value: number) => String(value).padStart(2, '0');
const dayOf = (ms: number) => {
  const date = new Date(ms);
  return `${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} UTC`;
};

/**
 * A time axis over the instants that matter, to scale. A stretch with nothing in it that is long
 * enough, and a third or more of the whole span, is shown at a fixed short width with a break, so a day of quiet does not
 * push the events apart. Ticks sit on round times inside each drawn stretch.
 */
export const buildTimeScale = (
  instants: readonly number[],
  {
    gapShare = 0.35,
    minGapMs = 4 * 3_600_000,
    brokenShare = 0.05,
    padShare = 0.03,
    maxTicks = 7,
    minTickSpacing = 0.06,
  } = {}
): TimeScale | undefined => {
  const times = [...new Set(instants.filter((value) => !Number.isNaN(value)))].sort(
    (a, b) => a - b
  );
  if (times.length === 0) return undefined;
  const span = Math.max(times[times.length - 1] - times[0], 60_000);
  const pad = span * padShare;
  const points = [times[0] - pad, ...times, times[times.length - 1] + pad];
  const totalSpan = points[points.length - 1] - points[0];

  // Each stretch between neighbours is drawn at its real length, or short when it is a long gap.
  const stretches = points.slice(1).map((end, index) => {
    const start = points[index];
    // Only a long stretch between real instants, with something either side, is drawn short.
    const isGap =
      times.length >= 3 &&
      end - start > Math.max(totalSpan * gapShare, minGapMs);
    return { start, end, isGap };
  });
  // A line cannot be all cuts: when every stretch between events would be cut, the shortest stays
  // to scale.
  const interior = stretches.filter((s, index) => index > 0 && index < stretches.length - 1 && s.end > s.start);
  const cut = interior.filter((s) => s.isGap);
  if (cut.length > 0 && cut.length === interior.length) {
    const shortest = cut.reduce((a, b) => (b.end - b.start < a.end - a.start ? b : a));
    shortest.isGap = false;
  }
  const drawnLength = stretches.reduce((sum, s) => sum + (s.isGap ? 0 : s.end - s.start), 0) || 1;
  const gapWidth = drawnLength * brokenShare;
  const widths = stretches.map((s) => (s.isGap ? gapWidth : s.end - s.start));
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  const offsets = widths.map((_, index) =>
    widths.slice(0, index).reduce((sum, width) => sum + width, 0)
  );

  const toX = (ms: number): number => {
    const clamped = Math.min(Math.max(ms, points[0]), points[points.length - 1]);
    const index = Math.max(
      0,
      stretches.findIndex(({ end }) => clamped <= end)
    );
    const { start, end } = stretches[index];
    const within = end === start ? 0 : (clamped - start) / (end - start);
    return (offsets[index] + within * widths[index]) / totalWidth;
  };

  const gaps = stretches
    .map((s, index) =>
      s.isGap
        ? { x: (offsets[index] + widths[index] / 2) / totalWidth, fromMs: s.start, toMs: s.end }
        : undefined
    )
    .filter((gap): gap is NonNullable<typeof gap> => gap !== undefined);
  const toMs = (x: number): number => {
    const target = Math.min(Math.max(x, 0), 1) * totalWidth;
    const index = Math.max(
      0,
      stretches.findIndex((_, i) => target <= offsets[i] + widths[i])
    );
    const { start, end } = stretches[index];
    const within = widths[index] === 0 ? 0 : (target - offsets[index]) / widths[index];
    return start + Math.min(Math.max(within, 0), 1) * (end - start);
  };
  const breaks = gaps.map(({ x }) => x);

  // Ticks, over the drawn stretches only, on the roundest step that keeps them from crowding.
  const drawnMs = stretches.reduce((sum, s) => sum + (s.isGap ? 0 : s.end - s.start), 0);
  const step = TICK_STEPS_MS.find((candidate) => drawnMs / candidate <= maxTicks) ?? 1_440 * 60_000;
  const ticks: TimeScaleTick[] = [];
  let lastDay: string | undefined;
  stretches.forEach((s) => {
    if (s.isGap) {
      lastDay = undefined;
      return;
    }
    for (let t = Math.ceil(s.start / step) * step; t <= s.end; t += step) {
      const date = new Date(t);
      const day = dayOf(t);
      ticks.push({
        x: toX(t),
        label: `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`,
        ...(day !== lastDay && { day }),
      });
      lastDay = day;
    }
  });
  // Ticks too close to read are dropped, the first of two kept: a stretch's last tick and the next
  // stretch's first can sit on one another around a break.
  const spaced = ticks.filter(
    (tick, index) => index === 0 || tick.x - ticks[index - 1].x >= minTickSpacing || Boolean(tick.day)
  );
  const readable = spaced.filter(
    (tick, index) =>
      index === 0 || tick.x - spaced[index - 1].x >= minTickSpacing || !spaced[index - 1].day
  );
  return {
    toX,
    toMs,
    breaks,
    gaps,
    ticks: readable,
    startMs: points[0],
    endMs: points[points.length - 1],
  };
};
