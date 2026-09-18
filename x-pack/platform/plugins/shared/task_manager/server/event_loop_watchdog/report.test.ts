/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CpuProfile, RunRegistryEntry } from './report';
import {
  dedupKeyForSuspects,
  formatReport,
  formatStillBlockedNotice,
  isLikelyUnsampled,
  ReportDeduper,
  snapshotSuspects,
  summarizeProfile,
} from './report';
import type { BlockReport, StillBlockedNotice } from './types';

describe('snapshotSuspects', () => {
  test('computes in-flight duration relative to the block start and sorts by longest first', () => {
    const registry = new Map<string, RunRegistryEntry>([
      ['task-a', { taskId: 'task-a', taskType: 'alerting:rule', startedAt: 1_000 }],
      ['task-b', { taskId: 'task-b', taskType: 'reporting:generate', startedAt: 1_800 }],
    ]);

    const suspects = snapshotSuspects(registry, 2_000);

    expect(suspects).toEqual([
      { taskId: 'task-a', taskType: 'alerting:rule', inFlightMs: 1_000 },
      { taskId: 'task-b', taskType: 'reporting:generate', inFlightMs: 200 },
    ]);
  });

  test('returns an empty array when nothing is in flight', () => {
    expect(snapshotSuspects(new Map(), 2_000)).toEqual([]);
  });

  test('clamps negative in-flight durations to zero', () => {
    const registry = new Map<string, RunRegistryEntry>([
      ['task-a', { taskId: 'task-a', taskType: 'alerting:rule', startedAt: 5_000 }],
    ]);

    expect(snapshotSuspects(registry, 1_000)).toEqual([
      { taskId: 'task-a', taskType: 'alerting:rule', inFlightMs: 0 },
    ]);
  });
});

const makeProfile = (overrides: Partial<CpuProfile> = {}): CpuProfile => ({
  startTime: 0,
  endTime: 1_000_000,
  nodes: [
    { id: 1, callFrame: { functionName: '(root)', url: '' } },
    { id: 2, callFrame: { functionName: 'JSON.parse', url: 'node:internal' } },
    { id: 3, callFrame: { functionName: '(garbage collector)', url: '' } },
  ],
  samples: [2, 2, 2, 1],
  timeDeltas: [0, 300_000, 300_000, 300_000],
  ...overrides,
});

describe('summarizeProfile', () => {
  test('attributes self time to the sample active during each interval', () => {
    const { topFrames } = summarizeProfile(makeProfile());

    const jsonParse = topFrames.find((frame) => frame.functionName === 'JSON.parse');
    expect(jsonParse?.selfTimeMs).toBeCloseTo(600, 5);
    expect(jsonParse?.selfTimePercent).toBeCloseTo(66.67, 1);
  });

  test('flags GC as dominant when it accounts for most sampled self time', () => {
    const { gcDominant } = summarizeProfile(
      makeProfile({ samples: [3, 3, 3, 2], timeDeltas: [0, 300_000, 300_000, 300_000] })
    );
    expect(gcDominant).toBe(true);
  });

  test('does not flag GC as dominant when it is a minority of sampled self time', () => {
    const { gcDominant } = summarizeProfile(makeProfile());
    expect(gcDominant).toBe(false);
  });

  test('computes sampled coverage relative to the block duration', () => {
    const { sampledCoverage } = summarizeProfile(makeProfile());
    expect(sampledCoverage).toBeCloseTo(0.9, 5);
  });

  test('handles an empty profile without dividing by zero', () => {
    const { topFrames, gcDominant, sampledCoverage } = summarizeProfile(
      makeProfile({ samples: [], timeDeltas: [] })
    );
    expect(topFrames).toEqual([]);
    expect(gcDominant).toBe(false);
    expect(sampledCoverage).toBe(0);
  });
});

describe('isLikelyUnsampled', () => {
  test('flags low sample coverage as likely unsampled (native/syscall wait or preemption)', () => {
    expect(isLikelyUnsampled(0.1)).toBe(true);
  });

  test('does not flag high sample coverage', () => {
    expect(isLikelyUnsampled(0.95)).toBe(false);
  });
});

describe('ReportDeduper', () => {
  test('logs the first occurrence in a window', () => {
    const deduper = new ReportDeduper(60_000);
    expect(deduper.check('alerting:rule', 0)).toEqual({ action: 'log', suppressedCount: 0 });
  });

  test('suppresses repeats within the dedup window', () => {
    const deduper = new ReportDeduper(60_000);
    deduper.check('alerting:rule', 0);
    expect(deduper.check('alerting:rule', 10_000)).toEqual({
      action: 'suppress',
      suppressedCount: 0,
    });
    expect(deduper.check('alerting:rule', 20_000)).toEqual({
      action: 'suppress',
      suppressedCount: 0,
    });
  });

  test('logs again with a suppressed count once the window elapses', () => {
    const deduper = new ReportDeduper(60_000);
    deduper.check('alerting:rule', 0);
    deduper.check('alerting:rule', 10_000); // suppressed
    deduper.check('alerting:rule', 20_000); // suppressed
    expect(deduper.check('alerting:rule', 70_000)).toEqual({
      action: 'log-with-suppressed',
      suppressedCount: 2,
    });
  });

  test('tracks independent windows per key', () => {
    const deduper = new ReportDeduper(60_000);
    deduper.check('alerting:rule', 0);
    expect(deduper.check('reporting:generate', 0)).toEqual({ action: 'log', suppressedCount: 0 });
  });
});

describe('dedupKeyForSuspects', () => {
  test('returns a stable, sorted key for the same set of task types regardless of order', () => {
    const keyA = dedupKeyForSuspects([
      { taskId: '1', taskType: 'reporting:generate', inFlightMs: 100 },
      { taskId: '2', taskType: 'alerting:rule', inFlightMs: 50 },
    ]);
    const keyB = dedupKeyForSuspects([
      { taskId: '3', taskType: 'alerting:rule', inFlightMs: 10 },
      { taskId: '4', taskType: 'reporting:generate', inFlightMs: 5 },
    ]);
    expect(keyA).toBe(keyB);
  });

  test('returns a sentinel key when there are no suspects', () => {
    expect(dedupKeyForSuspects([])).toBe('unattributed');
  });
});

describe('formatReport', () => {
  const baseReport: BlockReport = {
    blockedMs: 812,
    startedAt: 1_000,
    endedAt: 1_812,
    suspects: [{ taskId: 'task-a', taskType: 'alerting:rule', inFlightMs: 400 }],
    topFrames: [
      { functionName: 'JSON.parse', url: 'node:internal', selfTimeMs: 600, selfTimePercent: 80 },
    ],
    gcDominant: false,
    likelyUnsampled: false,
    sampledCoverage: 0.9,
    suppressedCount: 0,
  };

  test('names the sole suspect task and the top frame', () => {
    const line = formatReport(baseReport);
    expect(line).toContain('blocked for 812ms');
    expect(line).toContain('sole suspect');
    expect(line).toContain('alerting:rule "task-a"');
    expect(line).toContain('JSON.parse');
  });

  test('reports when no task was in flight', () => {
    const line = formatReport({ ...baseReport, suspects: [] });
    expect(line).toContain('none in-flight');
  });

  test('lists multiple candidates without claiming certainty', () => {
    const line = formatReport({
      ...baseReport,
      suspects: [
        { taskId: 'task-a', taskType: 'alerting:rule', inFlightMs: 400 },
        { taskId: 'task-b', taskType: 'reporting:generate', inFlightMs: 100 },
      ],
    });
    expect(line).toContain('2 candidates');
  });

  test('annotates GC-dominated blocks', () => {
    const line = formatReport({ ...baseReport, gcDominant: true });
    expect(line).toContain('garbage collection dominated');
  });

  test('annotates likely-unsampled blocks with the coverage percentage', () => {
    const line = formatReport({ ...baseReport, likelyUnsampled: true, sampledCoverage: 0.2 });
    expect(line).toContain('only 20%');
    expect(line).toContain('preempted');
  });

  test('includes a note about suppressed similar blocks', () => {
    const line = formatReport({ ...baseReport, suppressedCount: 3 });
    expect(line).toContain('3 similar block(s) suppressed');
  });
});

describe('formatStillBlockedNotice', () => {
  test('reports elapsed time and suspects for an ongoing block', () => {
    const notice: StillBlockedNotice = {
      elapsedMs: 5_432,
      suspects: [{ taskId: 'task-a', taskType: 'alerting:rule', inFlightMs: 5_400 }],
    };
    const line = formatStillBlockedNotice(notice);
    expect(line).toContain('still blocked after 5432ms and counting');
    expect(line).toContain('alerting:rule "task-a"');
  });
});
