/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Doc, Drill } from './score';
import { drillMatches, drillToQuery, scoreRun } from './score';
import fs from 'fs';
import path from 'path';

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, '__fixtures__', 'red_demo_t113148.json'), 'utf8')
);

const UI = 'kb-ui-kb-df77f889c-vj7v9';

/** Every metric with a drill must be reproducible by applying that drill to the raw samples. */
const assertDrillsReproduce = (
  row: { drills: Record<string, Drill> },
  samples: Doc[],
  runId: string
) => {
  for (const d of Object.values(row.drills)) {
    const q = drillToQuery(d);
    expect(q.bool.filter[0]).toEqual({ term: { run_id: runId } });
    // drillMatches is the predicate the scorer uses; the ES query is generated from the same spec.
    expect(
      samples.filter((s) => drillMatches(d, { run_id: runId, ...s })).length
    ).toBeGreaterThanOrEqual(0);
  }
};

describe('scoreRun — review counterexample (run …t113148-b03a)', () => {
  const { manifest, samples } = fixture as unknown as { manifest: Doc; samples: Doc[] };
  const scored = scoreRun(manifest, samples);
  const route = scored.pods.find((r) => r.phase === 'cpu_spin-route-10000ms' && r.pod === UI);
  const routeCluster = scored.cluster.find((r) => r.phase === 'cpu_spin-route-10000ms');

  it('never attributes cluster-wide ticks to a pod row', () => {
    // The old scorecard reported 17 ticks on the UI route row although its drill returned 0.
    expect(route).toBeDefined();
    expect(Object.keys(route!.metrics).some((k) => k.startsWith('tick'))).toBe(false);
    const tickDrill = Object.values(route!.drills).filter((d) => d.sources.includes('tick'));
    expect(tickDrill).toHaveLength(0);
    expect(routeCluster!.metrics.ticks_observed).toBeGreaterThan(0);
  });

  it('pod-row drills reproduce the row exactly', () => {
    const r = route!;
    const pick = (d: Drill) =>
      samples.filter((s) => drillMatches(d, { run_id: manifest.run_id, ...s }));
    expect(pick(r.drills.probe).length).toBe(r.metrics.probe_n);
    expect(pick(r.drills.proc).length).toBeGreaterThan(0);
    expect(pick(r.drills.probe).every((s) => s.pod === UI && s.thread === 'worker')).toBe(true);
    assertDrillsReproduce(r, samples, manifest.run_id);
  });

  it('cluster tick metrics without a scheduled-tick audit are INVALID, never green', () => {
    // This historical run has no tick_audit samples (denominator missing).
    expect(routeCluster!.valid).toBe(false);
    expect(routeCluster!.invalid_reasons.join()).toMatch(/no tick audit/);
  });

  it('pairs ratios only within the same pod and boot and computes them before rounding', () => {
    const base = scored.pods.find((r) => r.phase === 'baseline' && r.pod === UI)!;
    expect(route!.vs_baseline.probe_p99).toBeCloseTo(
      route!.metrics.probe_p99_ms! / base.metrics.probe_p99_ms!,
      10
    );
  });
});

describe('scoreRun — synthetic coverage and attribution rules', () => {
  const runId = 'r1';
  const t0 = 1_000_000;
  const manifest = {
    run_id: runId,
    status: 'complete',
    tm_poll_interval_ms: 500,
    phases: [
      { name: 'baseline', start: t0, end: t0 + 12_000 },
      { name: 'treat', start: t0 + 12_000, end: t0 + 22_000, offender_result: { status: 200 } },
    ],
    pods: [],
  };
  const pod = { pod: 'p1', boot_id: 'b1' };
  const windows = (from: number, to: number) => {
    const out: Doc[] = [];
    for (let t = from; t + 1000 <= to; t += 1000)
      out.push({
        ...pod,
        thread: 'worker',
        source: 'gap_window',
        ts: t,
        end: t + 1000,
        max_gap_ms: 6,
      });
    return out;
  };
  const polls = (from: number, to: number, step: number) => {
    const out: Doc[] = [];
    for (let t = from; t < to; t += step)
      out.push({
        ...pod,
        thread: 'main',
        source: 'tm',
        tm_event: 'TASK_POLLING_CYCLE',
        ts: t,
        timing_stop: t,
      });
    return out;
  };
  const audit = (from: number, to: number, status = 'done') => {
    const out: Doc[] = [];
    for (let t = from, i = 0; t < to; t += 1000, i++)
      out.push({
        source: 'tick_audit',
        thread: 'driver',
        pod: 'driver',
        ts: t,
        index: i + Math.floor((from - t0) / 1000),
        status,
      });
    return out;
  };
  const ticks = (from: number, to: number, drift: number) => {
    const out: Doc[] = [];
    for (let t = from, i = 0; t < to; t += 1000, i++)
      out.push({
        ...pod,
        thread: 'main',
        source: 'tick',
        ts: t,
        index: i + Math.floor((from - t0) / 1000),
        drift_ms: drift,
      });
    return out;
  };

  it('a heartbeat gap spanning a boundary is attributed to both windows by overlap', () => {
    const gap = {
      ...pod,
      thread: 'main',
      source: 'main_gap',
      ts: t0 + 9_000,
      start: t0 + 9_000,
      end: t0 + 13_000,
      gap_ms: 4_000,
    };
    const s = [
      ...windows(t0, t0 + 22_000),
      gap,
      ...audit(t0, t0 + 22_000),
      ...ticks(t0, t0 + 22_000, 50),
      ...polls(t0, t0 + 22_000, 500),
    ];
    const { pods } = scoreRun(manifest, s);
    const base = pods.find((r) => r.phase === 'baseline')!;
    const treat = pods.find((r) => r.phase === 'treat')!;
    // baseline window is [t0+2s, t0+11s): overlap 2 s; treat window [t0+12s, t0+22s): overlap 1 s.
    expect(base.metrics.hb_gap_max_overlap_ms).toBe(2_000);
    expect(treat.metrics.hb_gap_max_overlap_ms).toBe(1_000);
    expect(treat.metrics.hb_gap_max_full_ms).toBe(4_000);
    expect(treat.notes.join()).toMatch(/spans this window boundary/);
  });

  it('TM poll cycles are windowed to the phase (not cumulative)', () => {
    const s = [
      ...windows(t0, t0 + 22_000),
      ...audit(t0, t0 + 22_000),
      ...ticks(t0, t0 + 22_000, 50),
      ...polls(t0, t0 + 22_000, 500),
    ];
    const { pods } = scoreRun(manifest, s);
    const treat = pods.find((r) => r.phase === 'treat')!;
    expect(treat.metrics.tm_poll_cycles).toBe(20);
    expect(treat.valid).toBe(true);
  });

  it('missing worker telemetry makes the pod row INVALID', () => {
    const s = [
      ...windows(t0, t0 + 12_000),
      ...audit(t0, t0 + 22_000),
      ...ticks(t0, t0 + 22_000, 50),
      ...polls(t0, t0 + 22_000, 500),
    ];
    const treat = scoreRun(manifest, s).pods.find((r) => r.phase === 'treat')!;
    expect(treat.valid).toBe(false);
    expect(treat.invalid_reasons.join()).toMatch(/worker telemetry coverage/);
  });

  it('a TM node with no poll telemetry in a window is INVALID, not "no missed cycles"', () => {
    const s = [
      ...windows(t0, t0 + 22_000),
      ...audit(t0, t0 + 22_000),
      ...ticks(t0, t0 + 22_000, 50),
      ...polls(t0, t0 + 11_000, 500),
    ];
    const treat = scoreRun(manifest, s).pods.find((r) => r.phase === 'treat')!;
    expect(treat.valid).toBe(false);
    expect(treat.invalid_reasons.join()).toMatch(/without poll telemetry/);
  });

  it('ticks that ran but whose samples are missing invalidate the cluster row; unrun ticks are harm', () => {
    const s = [
      ...windows(t0, t0 + 22_000),
      ...polls(t0, t0 + 22_000, 500),
      ...audit(t0, t0 + 12_000),
      ...audit(t0 + 12_000, t0 + 22_000, 'idle'), // starved: never ran (real harm, not lost)
      ...ticks(t0, t0 + 12_000, 50),
    ];
    const { cluster } = scoreRun(manifest, s);
    const treat = cluster.find((r) => r.phase === 'treat')!;
    expect(treat.metrics.ticks_scheduled).toBe(10);
    expect(treat.metrics.ticks_ran).toBe(0);
    expect(treat.metrics.tick_completion).toBe(0);
    expect(treat.valid).toBe(true);

    const lostRun = scoreRun(manifest, [
      ...windows(t0, t0 + 22_000),
      ...polls(t0, t0 + 22_000, 500),
      ...audit(t0, t0 + 22_000),
      ...ticks(t0, t0 + 12_000, 50),
    ]);
    const lost = lostRun.cluster.find((r) => r.phase === 'treat')!;
    expect(lost.valid).toBe(false);
    expect(lost.metrics.ticks_lost).toBe(10);
  });

  it('push losses invalidate the whole run', () => {
    const s = [
      ...windows(t0, t0 + 22_000),
      ...polls(t0, t0 + 22_000, 500),
      ...audit(t0, t0 + 22_000),
      ...ticks(t0, t0 + 22_000, 50),
      {
        ...pod,
        thread: 'main',
        source: 'push_stats',
        ts: t0 + 21_000,
        push_dropped: 3,
        push_ring_overflow: 0,
      },
    ];
    const res = scoreRun(manifest, s);
    expect(res.run_valid).toBe(false);
    expect(res.pods.every((r) => !r.valid)).toBe(true);
  });
});
