/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../common/types/domain';
import { CasePersistedStatus } from '../../server/common/types/case';
import type { DemoTimeline } from './timeline';
import { buildDemoTimeline, getDemoCaseTimeFields, pickDemoScenario } from './timeline';

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
