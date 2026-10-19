/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Pure scorecard derivation (no I/O) so it can be regression-tested.
 *
 * Scoping rules (Track 0 fix pass):
 *  - POD rows are keyed by (phase, pod, boot_id) and only ever read samples of that pod+boot.
 *  - CLUSTER rows (one per phase) hold cluster-wide metrics: tick tasks (run on any background
 *    pod), the laptop probe, Tier B replay results and offender results.
 *  - Every metric is computed through a `Drill` spec; the same spec is rendered as the drill
 *    filter, so a drill reproduces the row exactly (tested).
 *  - Interval attribution: point samples by their timestamp field; interval samples (heartbeat
 *    gaps, TM poll gaps) by overlap with the window. A gap spanning a boundary appears in both
 *    windows with `spans_boundary`, and its overlap is reported separately from its full length.
 *  - Coverage is checked; missing telemetry makes a row INVALID (never green).
 *  - Ratios are computed from unrounded values; rounding happens only for display.
 */

export type Doc = Record<string, any>;

export interface Drill {
  run_id: string;
  sources: string[];
  thread?: string;
  pod?: string;
  boot_id?: string;
  /** Timestamp field used for point attribution. */
  field: string;
  from: number;
  to: number;
  /** Interval samples: attribute by overlap of [start_field, end_field] with [from, to). */
  overlap?: { start: string; end: string };
  extra?: Record<string, string | number | boolean>;
}

export const drillMatches = (d: Drill, s: Doc): boolean => {
  if (s.run_id !== undefined && s.run_id !== d.run_id) return false;
  if (!d.sources.includes(s.source)) return false;
  if (d.thread !== undefined && s.thread !== d.thread) return false;
  if (d.pod !== undefined && s.pod !== d.pod) return false;
  if (d.boot_id !== undefined && s.boot_id !== d.boot_id) return false;
  if (d.extra) for (const [k, v] of Object.entries(d.extra)) if (s[k] !== v) return false;
  if (d.overlap) {
    const a = s[d.overlap.start] as number;
    const b = s[d.overlap.end] as number;
    return a < d.to && b > d.from;
  }
  const t = s[d.field] as number;
  return t >= d.from && t < d.to;
};

/** Renders a drill spec as an ES query for `research-samples` (same predicate as drillMatches). */
export const drillToQuery = (d: Drill): Doc => {
  const filter: Doc[] = [{ term: { run_id: d.run_id } }, { terms: { source: d.sources } }];
  if (d.thread !== undefined) filter.push({ term: { thread: d.thread } });
  if (d.pod !== undefined) filter.push({ term: { pod: d.pod } });
  if (d.boot_id !== undefined) filter.push({ term: { boot_id: d.boot_id } });
  if (d.extra) for (const [k, v] of Object.entries(d.extra)) filter.push({ term: { [k]: v } });
  if (d.overlap) {
    filter.push({ range: { [d.overlap.start]: { lt: d.to } } });
    filter.push({ range: { [d.overlap.end]: { gt: d.from } } });
  } else {
    filter.push({ range: { [d.field]: { gte: d.from, lt: d.to } } });
  }
  return { bool: { filter } };
};

const pct = (values: number[], p: number): number | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
};
const max = (v: number[]): number | null => (v.length ? Math.max(...v) : null);
const mean = (v: number[]): number | null =>
  v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
const ratio = (a: number | null, b: number | null) =>
  a === null || b === null || b === 0 ? null : a / b;

export interface PodRow {
  kind: 'pod';
  run_id: string;
  phase: string;
  pod: string;
  boot_id: string;
  window_start: number;
  window_end: number;
  valid: boolean;
  invalid_reasons: string[];
  metrics: Record<string, number | null>;
  vs_baseline: Record<string, number | null>;
  drills: Record<string, Drill>;
  /** Number of raw samples each drill matched when the row was computed. */
  drill_counts: Record<string, number>;
  notes: string[];
}

export interface ClusterRow {
  kind: 'cluster';
  run_id: string;
  phase: string;
  window_start: number;
  window_end: number;
  valid: boolean;
  invalid_reasons: string[];
  metrics: Record<string, number | null>;
  vs_baseline: Record<string, number | null>;
  offenders: Doc[];
  tier_b: Doc[];
  drills: Record<string, Drill>;
  drill_counts: Record<string, number>;
}

export interface ScoreOptions {
  /** Minimum fraction of expected 1 s worker gap windows present in a pod window. */
  minWorkerCoverage?: number;
}

/** Phase windows: offender/action phases start at phase start, others skip 2 s / trim 1 s. */
export const phaseWindow = (phase: Doc): { from: number; to: number } => {
  const active = !!phase.offender_result || !!phase.action;
  return active
    ? { from: phase.start, to: phase.end }
    : { from: phase.start + 2000, to: phase.end - 1000 };
};

export const scoreRun = (
  manifest: Doc,
  samples: Doc[],
  opts: ScoreOptions = {}
): { pods: PodRow[]; cluster: ClusterRow[]; run_valid: boolean; run_invalid_reasons: string[] } => {
  const runId: string = manifest.run_id;
  const minCov = opts.minWorkerCoverage ?? 0.8;
  const pollInterval: number = manifest.tm_poll_interval_ms ?? 500;
  const s: Doc[] = samples.map((x) => ({ run_id: runId, ...x }));

  // Run-level validity.
  const runReasons: string[] = [...(manifest.invalid_reasons ?? [])];
  if (manifest.status && manifest.status !== 'complete')
    runReasons.push(`run status ${manifest.status}`);
  const lastPushStats = new Map<string, Doc>();
  for (const x of s.filter((y) => y.source === 'push_stats')) {
    const prev = lastPushStats.get(x.boot_id);
    if (!prev || prev.ts < x.ts) lastPushStats.set(x.boot_id, x);
  }
  for (const [boot, ps] of lastPushStats) {
    if ((ps.push_dropped ?? 0) > 0 || (ps.push_ring_overflow ?? 0) > 0) {
      runReasons.push(
        `push loss on boot ${boot}: dropped=${ps.push_dropped} ringOverflow=${ps.push_ring_overflow}`
      );
    }
  }
  for (const p of manifest.pods ?? [])
    if ((p.dropped ?? 0) > 0)
      runReasons.push(`pull ring overflow on boot ${p.boot_id}: ${p.dropped}`);

  const units = new Map<string, { pod: string; boot_id: string }>();
  for (const x of s) {
    if (x.thread === 'main' || x.thread === 'worker')
      units.set(`${x.pod}|${x.boot_id}`, { pod: x.pod, boot_id: x.boot_id });
  }
  const tmUnits = new Set(
    s
      .filter((x) => x.source === 'tm' && x.tm_event === 'TASK_POLLING_CYCLE')
      .map((x) => `${x.pod}|${x.boot_id}`)
  );

  const pods: PodRow[] = [];
  const cluster: ClusterRow[] = [];
  const phases: Doc[] = manifest.phases ?? [];

  // Baseline TM max gap per unit (baseline-relative missed-cycle threshold).
  const basePhase = phases.find((p) => p.name === 'baseline');
  const pollStops = (u: { pod: string; boot_id: string }) =>
    s
      .filter(
        (x) =>
          x.pod === u.pod &&
          x.boot_id === u.boot_id &&
          x.source === 'tm' &&
          x.tm_event === 'TASK_POLLING_CYCLE'
      )
      .map((x) => (x.timing_stop as number) ?? (x.ts as number))
      .sort((a, b) => a - b);
  const pollGaps = (u: { pod: string; boot_id: string }) => {
    const st = pollStops(u);
    const gaps: Doc[] = [];
    for (let i = 1; i < st.length; i++)
      gaps.push({ start: st[i - 1], end: st[i], gap_ms: st[i] - st[i - 1] });
    return { stops: st, gaps };
  };

  for (const phase of phases) {
    const { from, to } = phaseWindow(phase);
    for (const u of units.values()) {
      const key = `${u.pod}|${u.boot_id}`;
      const base = { run_id: runId, pod: u.pod, boot_id: u.boot_id, from, to, field: 'ts' };
      const drills: Record<string, Drill> = {
        probe: { ...base, sources: ['probe'], thread: 'worker', field: 'intended' },
        hb_gap: {
          ...base,
          sources: ['main_gap'],
          thread: 'main',
          overlap: { start: 'start', end: 'end' },
        },
        hb_windows: {
          ...base,
          sources: ['main_gap_window'],
          thread: 'main',
          overlap: { start: 'ts', end: 'end' },
        },
        worker_windows: {
          ...base,
          sources: ['gap_window'],
          thread: 'worker',
          overlap: { start: 'ts', end: 'end' },
        },
        worker_stalls: {
          ...base,
          sources: ['stall'],
          thread: 'worker',
          overlap: { start: 'start', end: 'end' },
        },
        proc: { ...base, sources: ['proc'], thread: 'main' },
        gc: { ...base, sources: ['gc'], thread: 'main' },
        worker_proc: { ...base, sources: ['worker_proc'], thread: 'worker' },
        tm_polls: {
          ...base,
          sources: ['tm'],
          thread: 'main',
          extra: { tm_event: 'TASK_POLLING_CYCLE' },
          field: 'timing_stop',
        },
      };
      const pick = (d: Drill) => s.filter((x) => drillMatches(d, x));
      const probes = pick(drills.probe);
      const ok = probes.filter((x) => x.status === 200);
      const hbGaps = pick(drills.hb_gap);
      const overlapOf = (g: Doc) => Math.min(g.end, to) - Math.max(g.start, from);
      const wWin = pick(drills.worker_windows);
      const hbWin = pick(drills.hb_windows);
      const proc = pick(drills.proc);
      const gc = pick(drills.gc);
      const wproc = pick(drills.worker_proc);
      const polls = pick(drills.tm_polls);

      const reasons: string[] = [];
      const notes: string[] = [];
      const windowS = (to - from) / 1000;
      const workerCoverage = windowS > 0 ? wWin.length / Math.max(1, Math.floor(windowS)) : null;
      if (workerCoverage !== null && workerCoverage < minCov)
        reasons.push(`worker telemetry coverage ${workerCoverage.toFixed(2)} < ${minCov}`);

      // TM cadence, overlap-attributed gaps; missed threshold relative to this unit's baseline.
      let pollMetrics: Record<string, number | null> = {
        tm_poll_cycles: null,
        tm_poll_max_gap_ms: null,
        tm_missed_poll_cycles: null,
      };
      if (tmUnits.has(key)) {
        const { gaps } = pollGaps(u);
        const overlapping = gaps.filter((g) => g.start < to && g.end > from);
        let baseMax = 0;
        if (basePhase) {
          const bw = phaseWindow(basePhase);
          for (const g of gaps)
            if (g.start >= bw.from && g.end < bw.to) baseMax = Math.max(baseMax, g.gap_ms);
        }
        const threshold = Math.max(2 * pollInterval, 1.5 * baseMax);
        if (!polls.length && !overlapping.length)
          reasons.push('TM node without poll telemetry in window');
        pollMetrics = {
          tm_poll_cycles: polls.length,
          // Overlap-attributed: a gap that starts here and ends in the next phase only counts its
          // in-window part here (full length reported separately).
          tm_poll_max_gap_ms: max(
            overlapping.map((g) => Math.min(g.end, to) - Math.max(g.start, from))
          ),
          tm_poll_max_gap_full_ms: max(overlapping.map((g) => g.gap_ms)),
          tm_missed_poll_cycles: overlapping.filter(
            (g) => Math.min(g.end, to) - Math.max(g.start, from) > threshold
          ).length,
          tm_missed_threshold_ms: threshold,
        };
        if (overlapping.some((g) => g.start < from || g.end > to))
          notes.push('a TM poll gap spans this window boundary');
      }
      if (hbGaps.some((g) => g.start < from || g.end > to))
        notes.push('a heartbeat gap spans this window boundary');

      const metrics: Record<string, number | null> = {
        probe_n: probes.length,
        probe_errors: probes.length - ok.length,
        probe_p50_ms: pct(
          probes.map((x) => x.latency_ms),
          50
        ),
        probe_p95_ms: pct(
          probes.map((x) => x.latency_ms),
          95
        ),
        probe_p99_ms: pct(
          probes.map((x) => x.latency_ms),
          99
        ),
        probe_max_ms: max(probes.map((x) => x.latency_ms)),
        // Heartbeat-gap proxy for the longest uninterrupted main-thread slice (main-side clock).
        hb_gap_max_overlap_ms: max(hbGaps.map(overlapOf)),
        hb_gap_max_full_ms: max(hbGaps.map((g) => g.gap_ms)),
        hb_gap_count: hbGaps.length,
        // Per-second max heartbeat gap (incl. sub-threshold gaps): the idle resolution floor.
        hb_window_max_ms: max(hbWin.map((x) => x.max_gap_ms)),
        worker_gap_window_max_ms: max(wWin.map((x) => x.max_gap_ms)),
        worker_sampler_late_max_ms: max(wWin.map((x) => x.sampler_late_max_ms ?? 0)),
        worker_coverage: workerCoverage,
        ...pollMetrics,
        elu_mean: mean(proc.map((x) => x.elu)),
        rss_sampled_max_mb: max(proc.map((x) => x.rss / 1048576)),
        heap_sampled_max_mb: max(proc.map((x) => x.heap_used / 1048576)),
        gc_count: gc.length,
        gc_total_ms: gc.reduce((a, x) => a + x.duration_ms, 0),
        gc_max_ms: max(gc.map((x) => x.duration_ms)),
        research_worker_cpu_ms_per_s: mean(wproc.map((x) => x.thread_cpu_ms ?? 0)),
      };
      pods.push({
        kind: 'pod',
        run_id: runId,
        phase: phase.name,
        pod: u.pod,
        boot_id: u.boot_id,
        window_start: from,
        window_end: to,
        valid: reasons.length === 0 && runReasons.length === 0,
        invalid_reasons: [...reasons, ...runReasons],
        metrics,
        vs_baseline: {},
        drills,
        drill_counts: Object.fromEntries(
          Object.entries(drills).map(([k, d]) => [k, pick(d).length])
        ),
        notes,
      });
    }

    // Cluster row.
    const cbase = { run_id: runId, from, to, field: 'ts' };
    const cdrills: Record<string, Drill> = {
      tick_audit: { ...cbase, sources: ['tick_audit'] },
      ticks: { ...cbase, sources: ['tick'] },
      laptop_probe: { ...cbase, sources: ['probe'], thread: 'driver', field: 'intended' },
      ext_proc: { ...cbase, sources: ['ext_proc'], thread: 'driver' },
      offenders: { ...cbase, sources: ['offender'], overlap: { start: 'ts', end: 'end' } },
      tier_b: { ...cbase, sources: ['tier_b'], overlap: { start: 'ts', end: 'end' } },
    };
    const pick = (d: Drill) => s.filter((x) => drillMatches(d, x));
    const audit = pick(cdrills.tick_audit);
    const ticks = pick(cdrills.ticks);
    const laptop = pick(cdrills.laptop_probe);
    const ext = pick(cdrills.ext_proc);
    const reasons: string[] = [];
    const scheduled = audit.length;
    const ran = audit.filter((x) => x.status === 'done').length;
    const observedIdx = new Set(ticks.map((x) => x.index));
    const lost = audit.filter((x) => x.status === 'done' && !observedIdx.has(x.index)).length;
    if (!audit.length && ticks.length)
      reasons.push('no tick audit (scheduled denominator missing)');
    if (lost > 0) reasons.push(`${lost} ticks ran but their samples are missing`);
    const cmetrics: Record<string, number | null> = {
      ticks_scheduled: scheduled,
      ticks_ran: ran,
      ticks_observed: ticks.length,
      ticks_lost: lost,
      tick_completion: scheduled ? ran / scheduled : null,
      tick_drift_p50_ms: pct(
        ticks.map((x) => x.drift_ms),
        50
      ),
      tick_drift_p99_ms: pct(
        ticks.map((x) => x.drift_ms),
        99
      ),
      tick_drift_max_ms: max(ticks.map((x) => x.drift_ms)),
      laptop_probe_n: laptop.length,
      laptop_probe_p99_ms: pct(
        laptop.map((x) => x.latency_ms),
        99
      ),
      laptop_probe_p50_ms: pct(
        laptop.map((x) => x.latency_ms),
        50
      ),
      ext_cpu_pct_mean: mean(ext.map((x) => x.cpu_pct)),
      ext_rss_max_mb: max(ext.map((x) => x.rss_kb / 1024)),
    };
    cluster.push({
      kind: 'cluster',
      run_id: runId,
      phase: phase.name,
      window_start: from,
      window_end: to,
      valid: reasons.length === 0 && runReasons.length === 0,
      invalid_reasons: [...reasons, ...runReasons],
      metrics: cmetrics,
      vs_baseline: {},
      offenders: pick(cdrills.offenders).map((o) => ({
        pod: o.pod,
        kind: o.kind,
        mode: o.mode,
        task_id: o.task_id,
        dose_ms: o.dose_ms,
        blocked_ms: o.blocked_ms,
        ts: o.ts,
        end: o.end,
      })),
      tier_b: pick(cdrills.tier_b).map(({ run_id: _r, ...rest }) => rest),
      drills: cdrills,
      drill_counts: Object.fromEntries(
        Object.entries(cdrills).map(([k, d]) => [k, pick(d).length])
      ),
    });
  }

  // Ratios (unrounded), strictly within the same pod+boot / cluster.
  for (const r of pods) {
    const b = pods.find(
      (x) => x.phase === 'baseline' && x.pod === r.pod && x.boot_id === r.boot_id
    );
    if (!b) continue;
    r.vs_baseline = {
      probe_p50: ratio(r.metrics.probe_p50_ms, b.metrics.probe_p50_ms),
      probe_p95: ratio(r.metrics.probe_p95_ms, b.metrics.probe_p95_ms),
      probe_p99: ratio(r.metrics.probe_p99_ms, b.metrics.probe_p99_ms),
      hb_gap_max: ratio(
        Math.max(r.metrics.hb_gap_max_overlap_ms ?? 0, r.metrics.hb_window_max_ms ?? 0) || null,
        Math.max(b.metrics.hb_gap_max_overlap_ms ?? 0, b.metrics.hb_window_max_ms ?? 0) || null
      ),
    };
    if (!b.valid) {
      r.valid = false;
      r.invalid_reasons.push('baseline row invalid');
    }
  }
  const cb = cluster.find((x) => x.phase === 'baseline');
  if (cb) {
    for (const r of cluster) {
      r.vs_baseline = {
        tick_drift_p99: ratio(r.metrics.tick_drift_p99_ms, cb.metrics.tick_drift_p99_ms),
        tick_drift_max: ratio(r.metrics.tick_drift_max_ms, cb.metrics.tick_drift_max_ms),
      };
      if (!cb.valid && r !== cb) {
        r.valid = false;
        r.invalid_reasons.push('baseline row invalid');
      }
    }
  }
  return { pods, cluster, run_valid: runReasons.length === 0, run_invalid_reasons: runReasons };
};

export const r1 = (v: number | null | undefined, d = 1) =>
  v === null || v === undefined ? '—' : String(Math.round(v * 10 ** d) / 10 ** d);
