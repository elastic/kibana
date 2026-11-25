/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImpactMapEvent } from './impact_map';
import {
  buildTimeScale,
  formatTimelineGap,
  isInsideWindow,
  selectTimelineSummary,
} from './timeline';

const event = (
  id: string,
  kind: ImpactMapEvent['kind'],
  at: string,
  extra: Partial<ImpactMapEvent> = {}
): ImpactMapEvent => ({ id, kind, title: id, at, ...extra });

const EVENTS = [
  event('up', 'change', '2026-10-30T12:18:00Z'),
  event('cause', 'root_cause', '2026-10-30T13:00:00Z'),
  event('impact', 'customer_impact', '2026-10-30T13:00:00Z'),
  event('alert', 'alert', '2026-10-30T17:05:00Z'),
  event('gone', 'change', '2026-10-30T18:09:00Z'),
  event('clean', 'recovery', '2026-10-30T19:00:00Z'),
  event('note', 'investigation', '2026-10-30T13:30:00Z'),
];

describe('selectTimelineSummary', () => {
  it('shows the events the agent filters left, with its labels, windows and the hidden counts', () => {
    const windows = [{ label: 'Data dropped', start: EVENTS[1].at, end: EVENTS[5].at }];
    const summary = selectTimelineSummary({
      events: EVENTS,
      timeline: {
        filters: { kinds: ['root_cause', 'alert', 'recovery'] },
        windows,
      },
    });
    expect(summary?.events.map(({ id }) => id)).toEqual(['cause', 'alert', 'clean']);
    expect(summary?.windows).toEqual(windows);
    expect(summary?.filters).toEqual({ entity_ids: [], kinds: ['root_cause', 'alert', 'recovery'] });
    // Between the cause and the alert lie the impact and the note; between alert and clean, a change.
    expect(summary?.hiddenBetween.map((hidden) => hidden.map(({ id }) => id))).toEqual([
      ['impact', 'note'],
      ['gone'],
    ]);
  });

  it('filters by the entity an event happened to, or a relationship that touches it', () => {
    const events = [
      event('a', 'failure', '2026-10-30T13:00:00Z', { entity_id: 'svc' }),
      event('b', 'failure', '2026-10-30T14:00:00Z', { entity_id: 'other' }),
      event('c', 'failure', '2026-10-30T15:00:00Z', { relationship_id: 'svc->kafka' }),
    ];
    const summary = selectTimelineSummary({
      events,
      relationships: [{ id: 'svc->kafka', source_id: 'svc', target_id: 'kafka' }],
      timeline: { filters: { entity_ids: ['svc'] } },
    });
    expect(summary?.events.map(({ id }) => id)).toEqual(['a', 'c']);
    expect(summary?.hiddenBetween.map((hidden) => hidden.map(({ id }) => id))).toEqual([['b']]);
  });

  it('picks key events from their kinds when the agent applied no filters, leaving findings out', () => {
    const summary = selectTimelineSummary({ events: EVENTS });
    expect(summary?.events.map(({ id }) => id)).toEqual([
      'up',
      'cause',
      'impact',
      'alert',
      'gone',
      'clean',
    ]);
    expect(summary?.filters).toBeUndefined();
    expect(summary?.windows).toEqual([
      expect.objectContaining({ start: EVENTS[2].at, end: EVENTS[5].at, tone: 'danger' }),
    ]);
    // The finding at 13:30 sits between the impact and the alert.
    expect(summary?.hiddenBetween.map((hidden) => hidden.length)).toEqual([0, 0, 1, 0, 0]);
  });

  it('falls back to the key events when the filters leave fewer than two', () => {
    const summary = selectTimelineSummary({
      events: EVENTS,
      timeline: { filters: { kinds: ['recovery'] } },
    });
    expect(summary?.filters).toBeUndefined();
    expect(summary?.events.length).toBeGreaterThan(2);
  });

  it('is nothing for fewer than two key events', () => {
    expect(selectTimelineSummary({ events: [EVENTS[0]] })).toBeUndefined();
    expect(selectTimelineSummary({ events: [EVENTS[6]] })).toBeUndefined();
  });
});

describe('formatTimelineGap', () => {
  it('writes minutes, hours with minutes, and days', () => {
    const t = Date.parse('2026-10-30T12:00:00Z');
    expect(formatTimelineGap(t, t + 42 * 60_000)).toBe('+42m');
    expect(formatTimelineGap(t, t + (4 * 60 + 5) * 60_000)).toBe('+4h 5m');
    expect(formatTimelineGap(t, t + 60 * 60_000)).toBe('+1h');
    expect(formatTimelineGap(t, t + (27 * 60) * 60_000)).toBe('+1d 3h');
  });
});

describe('isInsideWindow', () => {
  it('finds the window a stretch lies inside', () => {
    const windows = [{ label: 'w', start: '2026-10-30T13:00:00Z', end: '2026-10-30T19:00:00Z' }];
    const ms = (iso: string) => Date.parse(iso);
    expect(isInsideWindow(ms('2026-10-30T13:00:00Z'), ms('2026-10-30T17:05:00Z'), windows)).toBe(
      windows[0]
    );
    expect(isInsideWindow(ms('2026-10-30T12:18:00Z'), ms('2026-10-30T13:00:00Z'), windows)).toBe(
      undefined
    );
  });
});

describe('buildTimeScale', () => {
  it('places instants in order across 0 to 1', () => {
    const scale = buildTimeScale(EVENTS.map(({ at }) => Date.parse(at)));
    const xs = EVENTS.slice(0, 6)
      .map(({ at }) => scale?.toX(Date.parse(at)) ?? -1)
      .sort((a, b) => a - b);
    expect(xs[0]).toBeGreaterThanOrEqual(0);
    expect(xs[xs.length - 1]).toBeLessThanOrEqual(1);
    expect(scale?.breaks).toEqual([]);
  });

  it('turns a position back into the instant, the inverse of where an instant sits', () => {
    const day = 24 * 3_600_000;
    const t0 = Date.parse('2026-10-29T08:00:00Z');
    // Includes a shortened stretch, where the mapping is not a straight line.
    const scale = buildTimeScale([t0, t0 + 3_600_000, t0 + day, t0 + day + 3_600_000]);
    [t0, t0 + 1_800_000, t0 + day + 1_800_000].forEach((ms) => {
      expect(Math.abs((scale?.toMs(scale.toX(ms)) ?? 0) - ms)).toBeLessThan(1_000);
    });
    expect(scale?.toMs(0)).toBe(scale?.startMs);
    expect(scale?.toMs(1)).toBe(scale?.endMs);
  });

  it('draws a long quiet stretch short, with a break', () => {
    const day = 24 * 3_600_000;
    const t0 = Date.parse('2026-10-29T08:00:00Z');
    const scale = buildTimeScale([t0, t0 + 3_600_000, t0 + day, t0 + day + 3_600_000]);
    expect(scale?.breaks).toHaveLength(1);
    expect(scale?.gaps[0]).toEqual(
      expect.objectContaining({ fromMs: t0 + 3_600_000, toMs: t0 + day })
    );
    // The hour either side of the quiet day is far wider than the quiet day itself.
    const quiet = (scale?.toX(t0 + day) ?? 0) - (scale?.toX(t0 + 3_600_000) ?? 0);
    const busy = (scale?.toX(t0 + 3_600_000) ?? 0) - (scale?.toX(t0) ?? 0);
    expect(quiet).toBeLessThan(busy * 1.5);
  });

  it('cuts a big swathe of nothing, however short in time, and never every stretch', () => {
    const t0 = Date.parse('2026-11-24T14:45:00Z');
    const minute = 60_000;
    const options = { gapShare: 0.35, minGapMs: 0, brokenShare: 0.12, padShare: 0 };
    // One lonely event, then a cluster a few minutes apart.
    const clustered = [t0, t0 + 9 * minute, t0 + 10 * minute, t0 + 10 * minute, t0 + 11 * minute];
    const scale = buildTimeScale(clustered, options);
    expect(scale?.gaps).toHaveLength(1);
    expect(scale?.gaps[0]).toEqual(expect.objectContaining({ fromMs: t0, toMs: t0 + 9 * minute }));
    // The line runs edge to edge, and the cut takes a small share of it, not nine elevenths.
    expect(scale?.toX(t0)).toBe(0);
    expect(scale?.toX(t0 + 11 * minute)).toBe(1);
    expect((scale?.toX(t0 + 9 * minute) ?? 1) - (scale?.toX(t0) ?? 0)).toBeLessThan(0.3);
    // Evenly spaced events are not cut.
    expect(buildTimeScale([t0, t0 + 10 * minute, t0 + 20 * minute, t0 + 30 * minute], options)?.gaps).toEqual([]);
    // When every stretch would be cut, the shortest stays to scale.
    const sparse = buildTimeScale([t0, t0 + 60 * minute, t0 + 150 * minute], options);
    expect(sparse?.gaps).toHaveLength(1);
  });

  it('has ticks on round times, with the day on the first', () => {
    const t0 = Date.parse('2026-10-30T12:18:00Z');
    const scale = buildTimeScale([t0, t0 + 6 * 3_600_000]);
    expect(scale?.ticks.length).toBeGreaterThan(2);
    expect(scale?.ticks.every(({ label }) => /^\d\d:\d\d$/.test(label))).toBe(true);
    expect(scale?.ticks[0].day).toBe('10-30 UTC');
  });
});
