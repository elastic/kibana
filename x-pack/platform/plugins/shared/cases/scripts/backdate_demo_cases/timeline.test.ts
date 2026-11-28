/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../common/types/domain';
import { CasePersistedStatus } from '../../server/common/types/case';
import type { DemoTimeline } from './timeline';
import {
  buildDemoActivityEvents,
  buildDemoAlertTimes,
  buildDemoTimeline,
  getDemoCaseTimeFields,
  pickDemoScenario,
} from './timeline';

const now = new Date('2026-11-17T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;
const createdAt = '2026-11-01T00:00:00.000Z';
const at = (offsetMs: number): string => new Date(Date.parse(createdAt) + offsetMs).toISOString();

const sequence = (values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};

describe('pickDemoScenario', () => {
  it('maps the random number to the weighted scenarios', () => {
    expect(pickDemoScenario(() => 0)).toBe('open');
    expect(pickDemoScenario(() => 0.2)).toBe('in_progress');
    expect(pickDemoScenario(() => 0.4)).toBe('direct_close');
    expect(pickDemoScenario(() => 0.6)).toBe('resolved');
    expect(pickDemoScenario(() => 0.99)).toBe('reopened');
  });
});

describe('buildDemoTimeline', () => {
  it('creates the case in the date range and keeps every change before now', () => {
    for (let run = 0; run < 50; run++) {
      const timeline = buildDemoTimeline({ now, days: 60, random: Math.random });
      const createdAtMs = Date.parse(timeline.createdAt);

      expect(createdAtMs).toBeLessThan(now.getTime());
      expect(createdAtMs).toBeGreaterThanOrEqual(now.getTime() - 60 * 24 * HOUR_MS);
      timeline.statusChanges.forEach(({ timestamp }) => {
        expect(Date.parse(timestamp)).toBeLessThanOrEqual(now.getTime());
        expect(Date.parse(timestamp)).toBeGreaterThan(createdAtMs);
      });
    }
  });

  it('builds the four changes of a reopened case', () => {
    const timeline = buildDemoTimeline({ now, days: 60, random: sequence([0.99, 0.9, 0.1]) });

    expect(timeline.scenario).toBe('reopened');
    expect(timeline.statusChanges.map(({ status }) => status)).toEqual([
      CaseStatuses['in-progress'],
      CaseStatuses.closed,
      CaseStatuses.open,
      CaseStatuses.closed,
    ]);
  });
});

describe('getDemoCaseTimeFields', () => {
  it('calculates the fields of a resolved case', () => {
    const timeline: DemoTimeline = {
      scenario: 'resolved',
      createdAt,
      statusChanges: [
        { status: CaseStatuses['in-progress'], timestamp: at(HOUR_MS / 2) },
        { status: CaseStatuses.closed, timestamp: at(3 * HOUR_MS) },
      ],
    };

    expect(getDemoCaseTimeFields(timeline, now)).toEqual({
      status: CaseStatuses.closed,
      persistedStatus: CasePersistedStatus.CLOSED,
      created_at: createdAt,
      updated_at: at(3 * HOUR_MS),
      closed_at: at(3 * HOUR_MS),
      in_progress_at: at(HOUR_MS / 2),
      duration: 10800,
      time_to_acknowledge: 1800,
      time_to_investigate: 9000,
      time_to_resolve: 10800,
      statusHistory: { active_time_open: 10800, time_to_pickup: 1800, reopen_count: 0 },
    });
  });

  it('calculates the fields of a case closed directly from open', () => {
    const timeline: DemoTimeline = {
      scenario: 'direct_close',
      createdAt,
      statusChanges: [{ status: CaseStatuses.closed, timestamp: at(HOUR_MS) }],
    };

    expect(getDemoCaseTimeFields(timeline, now)).toEqual(
      expect.objectContaining({
        in_progress_at: null,
        time_to_acknowledge: 3600,
        time_to_investigate: 0,
        time_to_resolve: 3600,
        statusHistory: { active_time_open: 3600, time_to_pickup: null, reopen_count: 0 },
      })
    );
  });

  it('calculates the fields of a case that is still open', () => {
    const timeline: DemoTimeline = { scenario: 'open', createdAt, statusChanges: [] };

    expect(getDemoCaseTimeFields(timeline, now)).toEqual(
      expect.objectContaining({
        status: CaseStatuses.open,
        persistedStatus: CasePersistedStatus.OPEN,
        updated_at: createdAt,
        closed_at: null,
        duration: null,
        time_to_acknowledge: null,
        time_to_resolve: null,
      })
    );
  });
});

describe('buildDemoAlertTimes', () => {
  const MINUTE_MS = 60 * 1000;

  it('attaches the first alert in the first 2 minutes and the others later', () => {
    for (let run = 0; run < 50; run++) {
      const [first, ...others] = buildDemoAlertTimes({
        createdAt,
        count: 3,
        now,
        random: Math.random,
      });
      const createdAtMs = Date.parse(createdAt);

      expect(Date.parse(first.attachedAt) - createdAtMs).toBeGreaterThanOrEqual(0);
      expect(Date.parse(first.attachedAt) - createdAtMs).toBeLessThan(2 * MINUTE_MS);
      others.forEach(({ attachedAt }) => {
        expect(Date.parse(attachedAt) - createdAtMs).toBeGreaterThanOrEqual(10 * MINUTE_MS);
        expect(Date.parse(attachedAt) - createdAtMs).toBeLessThan(48 * HOUR_MS);
      });
    }
  });

  it('starts each alert 1 minute to 12 hours before its attach time', () => {
    for (let run = 0; run < 50; run++) {
      buildDemoAlertTimes({ createdAt, count: 3, now, random: Math.random }).forEach(
        ({ attachedAt, startedAt }) => {
          const delayMs = Date.parse(attachedAt) - Date.parse(startedAt);

          expect(delayMs).toBeGreaterThanOrEqual(MINUTE_MS);
          expect(delayMs).toBeLessThan(12 * HOUR_MS);
        }
      );
    }
  });

  it('never attaches an alert later than now', () => {
    const recentCreatedAt = new Date(now.getTime() - 30 * MINUTE_MS).toISOString();

    const times = buildDemoAlertTimes({
      createdAt: recentCreatedAt,
      count: 2,
      now,
      random: () => 0.99,
    });

    expect(times[1].attachedAt).toBe(now.toISOString());
  });

  it('gives one entry for each alert', () => {
    expect(buildDemoAlertTimes({ createdAt, count: 0, now, random: Math.random })).toEqual([]);
    expect(buildDemoAlertTimes({ createdAt, count: 2, now, random: () => 0 })).toEqual([
      { attachedAt: createdAt, startedAt: at(-MINUTE_MS) },
      { attachedAt: at(10 * MINUTE_MS), startedAt: at(9 * MINUTE_MS) },
    ]);
  });
});

describe('buildDemoActivityEvents', () => {
  const resolved: DemoTimeline = {
    scenario: 'resolved',
    createdAt,
    statusChanges: [
      { status: CaseStatuses['in-progress'], timestamp: at(2 * HOUR_MS) },
      { status: CaseStatuses.closed, timestamp: at(100 * HOUR_MS) },
    ],
  };
  const events = (overrides: Partial<Parameters<typeof buildDemoActivityEvents>[0]> = {}) =>
    buildDemoActivityEvents({
      timeline: resolved,
      attachTimes: [],
      assigneeUids: [],
      now,
      random: () => 0,
      ...overrides,
    });

  it('writes the status changes of the time line, and the last status event is the case status', () => {
    const result = events();

    expect(result.map(({ status }) => status)).toEqual([
      CaseStatuses['in-progress'],
      CaseStatuses.closed,
    ]);
    expect(result[result.length - 1]).toEqual({
      timestamp: at(100 * HOUR_MS),
      type: 'status',
      verb: 'update',
      status: CaseStatuses.closed,
    });
  });

  it('writes no event for an open case', () => {
    expect(
      events({ timeline: { scenario: 'open', createdAt, statusChanges: [] }, attachTimes: [at(1)] })
    ).toEqual([]);
  });

  it('adds an assignee event at each pickup only when the case has assignees', () => {
    expect(events().some(({ type }) => type === 'assignees')).toBe(false);

    const withAssignee = events({ assigneeUids: ['u1'] }).filter(
      ({ type }) => type === 'assignees'
    );

    expect(withAssignee).toEqual([
      { timestamp: at(2 * HOUR_MS), type: 'assignees', verb: 'add', assigneeUids: ['u1'] },
    ]);
  });

  it('moves the case to Open at a later attach and to In progress 1 to 10 hours later', () => {
    const result = events({ attachTimes: [at(1), at(10 * HOUR_MS)], random: () => 0 });

    expect(result.map(({ status, timestamp }) => [status, timestamp])).toEqual([
      [CaseStatuses['in-progress'], at(2 * HOUR_MS)],
      [CaseStatuses.open, at(10 * HOUR_MS)],
      [CaseStatuses['in-progress'], at(11 * HOUR_MS)],
      [CaseStatuses.closed, at(100 * HOUR_MS)],
    ]);
  });

  it('skips a later pickup that is after the last status change or after now', () => {
    expect(events({ attachTimes: [at(99 * HOUR_MS + 1)], random: () => 0.99 })).toHaveLength(2);
    expect(
      events({
        attachTimes: [at(50 * HOUR_MS)],
        random: () => 0,
        now: new Date(at(50 * HOUR_MS + 1)),
      })
    ).toHaveLength(2);
  });

  it('keeps every event in time order and before now', () => {
    for (let run = 0; run < 50; run++) {
      const timeline = buildDemoTimeline({ now, days: 60, random: Math.random });
      const result = buildDemoActivityEvents({
        timeline,
        attachTimes: buildDemoAlertTimes({
          createdAt: timeline.createdAt,
          count: 3,
          now,
          random: Math.random,
        }).map(({ attachedAt }) => attachedAt),
        assigneeUids: [],
        now,
        random: Math.random,
      });
      const times = result.map(({ timestamp }) => Date.parse(timestamp));

      expect([...times].sort((a, b) => a - b)).toEqual(times);
      times.forEach((time) => expect(time).toBeLessThanOrEqual(now.getTime()));

      const lastStatus = result.filter(({ type }) => type === 'status').pop()?.status;
      const expected = timeline.statusChanges[timeline.statusChanges.length - 1]?.status;

      expect(lastStatus).toBe(expected);
    }
  });
});
