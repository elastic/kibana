/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Pure scorecard derivation (no I/O) so it can be regression-tested.
 *
 * Scoping rules (Track 0 fix passes 1+2):
 *  - POD rows are keyed by (phase, pod, boot_id) and only read samples of that pod+boot.
 *  - CLUSTER rows (one per phase) hold cluster-wide metrics: tick tasks (current series only),
 *    the laptop probe, offenders and Tier B results.
 *  - Every metric is a pure function of the docs matched by the row's drills
 *    (`computePodMetrics` / `computeClusterMetrics`). The same drill specs are stored as ES
 *    queries, and `verify-drills` re-fetches the docs and recomputes the metric VALUES.
 *  - Interval attribution: point samples by timestamp; interval samples by overlap. TM poll gaps
 *    use a gap drill that includes the adjacent poll endpoints outside the window.
 *  - Coverage is checked against an EXPECTED inventory (roles/pods/sources from the manifest),
 *    so missing telemetry is INVALID even when zero samples arrive. Any invalid row makes the
 *    run invalid. Ratios are computed from unrounded values.
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

export interface ExpectedRole {
  role: 'combined' | 'ui' | 'background';
  min_pods: number;
  sources: string[];
}

export interface ExpectedInventory {
  roles: ExpectedRole[];
  ticks: { interval_ms: number } | null;
  laptop_probe_rps: number | null;
  in_pod_probe_rps: number | null;
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

/** Fraction of [from, to) covered by the union of intervals. */
const unionCoverage = (intervals: Array<[number, number]>, from: number, to: number): number => {
  const clipped = intervals
    .map(([a, b]) => [Math.max(a, from), Math.min(b, to)] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  let covered = 0;
  let cur: [number, number] | undefined;
  for (const iv of clipped) {
    if (!cur || iv[0] > cur[1]) {
      if (cur) covered += cur[1] - cur[0];
      cur = [iv[0], iv[1]];
    } else cur[1] = Math.max(cur[1], iv[1]);
  }
  if (cur) covered += cur[1] - cur[0];
  return to > from ? covered / (to - from) : 1;
};

export interface PodRow {
  kind: 'pod';
  run_id: string;
  phase: string;
  pod: string;
  boot_id: string;
  role: string;
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

export interface PodCtx {
  from: number;
  to: number;
  /** Missed-poll threshold (from the same pod's baseline phase), stored in the row. */
  missedThresholdMs: number;
  tmNode: boolean;
  expectedSources: string[];
  probeRps: number | null;
  minCoverage: number;
}

/** Pure: pod-row metrics + coverage problems from the docs matched by each drill. */
export const computePodMetrics = (
  docs: Record<string, Doc[]>,
  ctx: PodCtx
): { metrics: Record<string, number | null>; problems: string[]; notes: string[] } => {
  const { from, to } = ctx;
  const windowS = (to - from) / 1000;
  const probes = docs.probe ?? [];
  const ok = probes.filter((x) => x.status === 200 || x.status === '200');
  const hbGaps = docs.hb_gap ?? [];
  const hbWin = docs.hb_windows ?? [];
  const wWin = docs.worker_windows ?? [];
  const proc = docs.proc ?? [];
  const gc = docs.gc ?? [];
  const wproc = docs.worker_proc ?? [];
  const pollDocs = docs.tm_poll_gaps ?? [];
  const overlapOf = (a: number, b: number) => Math.min(b, to) - Math.max(a, from);
  const problems: string[] = [];
  const notes: string[] = [];

  // TM cadence from the gap drill (includes the adjacent endpoints outside the window).
  const stops = pollDocs
    .map((x) => (x.timing_stop as number) ?? (x.ts as number))
    .sort((a, b) => a - b);
  const gaps: Array<{ start: number; end: number; gap: number }> = [];
  for (let i = 1; i < stops.length; i++)
    gaps.push({ start: stops[i - 1], end: stops[i], gap: stops[i] - stops[i - 1] });
  const overlapping = gaps.filter((g) => g.start < to && g.end > from);
  const inWindowPolls = stops.filter((t) => t >= from && t < to).length;

  // Coverage against the expected sources (zero samples => coverage 0, never "valid").
  const workerCoverage = windowS > 0 ? wWin.length / Math.max(1, Math.floor(windowS)) : 1;
  const hbIntervals: Array<[number, number]> = [
    ...hbWin.map((x) => [x.ts, x.end] as [number, number]),
    ...hbGaps.map((x) => [x.start, x.end] as [number, number]),
  ];
  const mainHbCoverage = unionCoverage(hbIntervals, from, to);
  const procCoverage = unionCoverage(
    [
      ...proc.map((x) => [x.window_start ?? x.ts - 1000, x.ts] as [number, number]),
      ...hbGaps.map((x) => [x.start, x.end] as [number, number]),
    ],
    from,
    to
  );
  const expectedProbes = ctx.probeRps ? Math.floor(ctx.probeRps * windowS) : 0;
  const probeCoverage = expectedProbes ? probes.length / expectedProbes : null;
  const need = (src: string) => ctx.expectedSources.includes(src);
  if (need('gap_window') && workerCoverage < ctx.minCoverage)
    problems.push(`worker telemetry coverage ${workerCoverage.toFixed(2)} < ${ctx.minCoverage}`);
  if (need('main_hb') && mainHbCoverage < ctx.minCoverage)
    problems.push(`main heartbeat coverage ${mainHbCoverage.toFixed(2)} < ${ctx.minCoverage}`);
  if (need('proc') && procCoverage < ctx.minCoverage)
    problems.push(`proc coverage ${procCoverage.toFixed(2)} < ${ctx.minCoverage}`);
  if (need('probe') && probeCoverage !== null && probeCoverage < ctx.minCoverage)
    problems.push(`in-pod probe coverage ${probeCoverage.toFixed(2)} < ${ctx.minCoverage}`);
  if ((need('tm_polls') || ctx.tmNode) && !inWindowPolls && !overlapping.length)
    problems.push('TM node without poll telemetry in window');
  if (overlapping.some((g) => g.start < from || g.end > to))
    notes.push('a TM poll gap spans this window boundary');
  if (hbGaps.some((g) => g.start < from || g.end > to))
    notes.push('a heartbeat gap spans this window boundary');

  const lat = probes.map((x) => x.latency_ms as number);
  const metrics: Record<string, number | null> = {
    probe_n: probes.length,
    probe_errors: probes.length - ok.length,
    probe_coverage: probeCoverage,
    probe_p50_ms: pct(lat, 50),
    probe_p95_ms: pct(lat, 95),
    probe_p99_ms: pct(lat, 99),
    probe_max_ms: max(lat),
    // Heartbeat-gap proxy for the longest uninterrupted main-thread slice (main-side clock).
    hb_gap_max_overlap_ms: max(hbGaps.map((g) => overlapOf(g.start, g.end))),
    hb_gap_max_full_ms: max(hbGaps.map((g) => g.gap_ms)),
    hb_gap_count: hbGaps.length,
    hb_window_max_ms: max(hbWin.map((x) => x.max_gap_ms)),
    main_hb_coverage: mainHbCoverage,
    worker_gap_window_max_ms: max(wWin.map((x) => x.max_gap_ms)),
    worker_sampler_late_max_ms: max(wWin.map((x) => x.sampler_late_max_ms ?? 0)),
    worker_coverage: workerCoverage,
    proc_coverage: procCoverage,
    tm_poll_cycles: ctx.tmNode ? inWindowPolls : null,
    tm_poll_max_gap_ms: ctx.tmNode ? max(overlapping.map((g) => overlapOf(g.start, g.end))) : null,
    tm_poll_max_gap_full_ms: ctx.tmNode ? max(overlapping.map((g) => g.gap)) : null,
    tm_missed_poll_cycles: ctx.tmNode
      ? overlapping.filter((g) => overlapOf(g.start, g.end) > ctx.missedThresholdMs).length
      : null,
    tm_missed_threshold_ms: ctx.tmNode ? ctx.missedThresholdMs : null,
    elu_mean: mean(proc.map((x) => x.elu)),
    // Sampled lower bounds of the window's peak (1 s point samples).
    rss_sampled_max_mb: max(proc.map((x) => x.rss / 1048576)),
    heap_sampled_max_mb: max(proc.map((x) => x.heap_used / 1048576)),
    gc_count: gc.length,
    gc_total_ms: gc.reduce((a, x) => a + x.duration_ms, 0),
    gc_max_ms: max(gc.map((x) => x.duration_ms)),
    research_worker_cpu_ms_per_s: mean(wproc.map((x) => x.thread_cpu_ms ?? 0)),
  };
  return { metrics, problems, notes };
};

export interface ClusterCtx {
  from: number;
  to: number;
  ticks: { interval_ms: number } | null;
  laptopRps: number | null;
  minCoverage: number;
  /** Exact scheduled run_at instants of this run's tick series (from tick_scheduled samples). */
  scheduledRunAts?: number[];
}

const tickTaskId = (x: Doc) => (x.task_id as string) ?? `wir-tick-${x.series_id}-${x.index}`;

/** Pure: cluster-row metrics + coverage problems from drilled docs. */
export const computeClusterMetrics = (
  docs: Record<string, Doc[]>,
  ctx: ClusterCtx
): { metrics: Record<string, number | null>; problems: string[] } => {
  const windowS = (ctx.to - ctx.from) / 1000;
  const audit = docs.tick_audit ?? [];
  const ticks = docs.ticks ?? [];
  const laptop = docs.laptop_probe ?? [];
  const ext = docs.ext_proc ?? [];
  const problems: string[] = [];
  const observedIds = new Set(ticks.map(tickTaskId));
  const ran = audit.filter((x) => x.status === 'done');
  const lost = ran.filter((x) => !observedIds.has(x.id));
  if (ctx.ticks) {
    // Denominator = ticks actually scheduled to run inside this window. A series may start after
    // the phase began (e.g. mid-seed), so window/interval over-counts; fall back to it only when
    // the run carries no tick_scheduled record (legacy runs).
    const expected = ctx.scheduledRunAts
      ? ctx.scheduledRunAts.filter((t) => t >= ctx.from && t < ctx.to).length
      : Math.floor((ctx.to - ctx.from) / ctx.ticks.interval_ms);
    if (audit.length < Math.floor(expected * ctx.minCoverage)) {
      problems.push(
        `tick audit coverage ${audit.length}/${expected} scheduled ticks (denominator missing or incomplete)`
      );
    }
    if (lost.length > 0) problems.push(`${lost.length} ticks ran but their samples are missing`);
  }
  if (ctx.laptopRps) {
    const expectedLaptop = Math.floor(ctx.laptopRps * windowS);
    if (laptop.length < Math.floor(expectedLaptop * ctx.minCoverage))
      problems.push(`laptop probe coverage ${laptop.length}/${expectedLaptop}`);
  }
  const lat = laptop.map((x) => x.latency_ms as number);
  return {
    problems,
    metrics: {
      ticks_scheduled: audit.length,
      ticks_ran: ran.length,
      ticks_observed: observedIds.size,
      ticks_lost: lost.length,
      tick_completion: audit.length ? ran.length / audit.length : null,
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
      laptop_probe_p50_ms: pct(lat, 50),
      laptop_probe_p95_ms: pct(lat, 95),
      laptop_probe_p99_ms: pct(lat, 99),
      ext_cpu_pct_mean: mean(ext.map((x) => x.cpu_pct)),
      ext_rss_max_mb: max(ext.map((x) => x.rss_kb / 1024)),
    },
  };
};

/** Phase windows: offender/action phases start at phase start, others skip 2 s / trim 1 s. */
export const phaseWindow = (phase: Doc): { from: number; to: number } => {
  const active = !!phase.offender_result || !!phase.action;
  return active
    ? { from: phase.start, to: phase.end }
    : { from: phase.start + 2000, to: phase.end - 1000 };
};

/** Role of a pod: from samples' `roles` field, else by serverless pod name, else combined. */
const roleOf = (pod: string, rolesSeen: string | undefined): ExpectedRole['role'] => {
  if (rolesSeen) {
    const ui = rolesSeen.includes('ui');
    const bg = rolesSeen.includes('background');
    if (ui && bg) return 'combined';
    if (bg) return 'background';
    if (ui) return 'ui';
  }
  if (pod.startsWith('kb-background-tasks')) return 'background';
  if (pod.startsWith('kb-ui')) return 'ui';
  return 'combined';
};

export const scoreRun = (
  manifest: Doc,
  samples: Doc[],
  opts: { minCoverage?: number } = {}
): { pods: PodRow[]; cluster: ClusterRow[]; run_valid: boolean; run_invalid_reasons: string[] } => {
  const runId: string = manifest.run_id;
  const minCov = opts.minCoverage ?? 0.8;
  const pollInterval: number = manifest.tm_poll_interval_ms ?? 500;
  const series: string | undefined = manifest.tick_series_id;
  const expected: ExpectedInventory | undefined = manifest.expected_inventory;
  const s: Doc[] = samples
    .map((x): Doc => ({ run_id: runId, ...x }))
    // Ticks and audits of other (previous) series never count for this run.
    .filter(
      (x) =>
        !series ||
        (x.source !== 'tick' && x.source !== 'tick_audit' && x.source !== 'tick_scheduled') ||
        x.series_id === series
    );

  const scheduledDocs = s.filter((x) => x.source === 'tick_scheduled');
  const scheduledRunAts: number[] | undefined = scheduledDocs.length
    ? scheduledDocs.flatMap((x) => (Array.isArray(x.run_ats) ? (x.run_ats as number[]) : []))
    : undefined;

  const runReasons: string[] = [...(manifest.invalid_reasons ?? [])];
  if (manifest.status && manifest.status !== 'complete')
    runReasons.push(`run status ${manifest.status}`);
  if (!expected) runReasons.push('no expected inventory in manifest (coverage cannot be proven)');
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

  const units = new Map<string, { pod: string; boot_id: string; roles?: string }>();
  for (const x of s) {
    if (x.thread !== 'main' && x.thread !== 'worker') continue;
    const key = `${x.pod}|${x.boot_id}`;
    const u: { pod: string; boot_id: string; roles?: string } = units.get(key) ?? {
      pod: x.pod,
      boot_id: x.boot_id,
    };
    if (x.roles) u.roles = String(x.roles);
    units.set(key, u);
  }
  const tmUnits = new Set(
    s
      .filter((x) => x.source === 'tm' && x.tm_event === 'TASK_POLLING_CYCLE')
      .map((x) => `${x.pod}|${x.boot_id}`)
  );
  const phases: Doc[] = manifest.phases ?? [];
  const basePhase = phases.find((p) => p.name === 'baseline');
  const pollStopsOf = (u: { pod: string; boot_id: string }) =>
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

  const pods: PodRow[] = [];
  const cluster: ClusterRow[] = [];
  for (const phase of phases) {
    const { from, to } = phaseWindow(phase);
    const seenRoles = new Map<string, number>();
    for (const [key, u] of units) {
      const role = roleOf(u.pod, u.roles);
      const roleSpec = expected?.roles.find((r) => r.role === role);
      const tmNode = tmUnits.has(key) || !!roleSpec?.sources.includes('tm_polls');
      const stops = pollStopsOf(u);
      const prev = [...stops].reverse().find((t) => t < from) ?? from;
      const next = stops.find((t) => t >= to) ?? to;
      let baseMax = 0;
      if (basePhase) {
        const bw = phaseWindow(basePhase);
        for (let i = 1; i < stops.length; i++)
          if (stops[i - 1] >= bw.from && stops[i] < bw.to)
            baseMax = Math.max(baseMax, stops[i] - stops[i - 1]);
      }
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
        proc: { ...base, sources: ['proc'], thread: 'main' },
        gc: { ...base, sources: ['gc'], thread: 'main' },
        worker_proc: { ...base, sources: ['worker_proc'], thread: 'worker' },
        // Gap drill: includes the adjacent poll endpoints just outside the window.
        tm_poll_gaps: {
          ...base,
          sources: ['tm'],
          thread: 'main',
          extra: { tm_event: 'TASK_POLLING_CYCLE' },
          field: 'timing_stop',
          from: prev,
          to: next + 0.001,
        },
      };
      const docs = Object.fromEntries(
        Object.entries(drills).map(([k, d]) => [k, s.filter((x) => drillMatches(d, x))])
      );
      const ctx: PodCtx = {
        from,
        to,
        missedThresholdMs: Math.max(2 * pollInterval, 1.5 * baseMax),
        tmNode,
        expectedSources: roleSpec?.sources ?? [],
        probeRps: roleSpec?.sources.includes('probe') ? expected?.in_pod_probe_rps ?? null : null,
        minCoverage: minCov,
      };
      const { metrics, problems, notes } = computePodMetrics(docs, ctx);
      if (expected && !roleSpec) notes.push(`pod role ${role} not in expected inventory`);
      if ((docs.worker_windows?.length ?? 0) > 0)
        seenRoles.set(role, (seenRoles.get(role) ?? 0) + 1);
      pods.push({
        kind: 'pod',
        run_id: runId,
        phase: phase.name,
        pod: u.pod,
        boot_id: u.boot_id,
        role,
        window_start: from,
        window_end: to,
        valid: problems.length === 0,
        invalid_reasons: problems,
        metrics,
        vs_baseline: {},
        drills,
        drill_counts: Object.fromEntries(Object.entries(docs).map(([k, v]) => [k, v.length])),
        notes,
      });
    }
    // Expected pods that produced no telemetry in this window -> synthetic INVALID rows.
    for (const r of expected?.roles ?? []) {
      const have = seenRoles.get(r.role) ?? 0;
      if (have < r.min_pods) {
        pods.push({
          kind: 'pod',
          run_id: runId,
          phase: phase.name,
          pod: `expected:${r.role}`,
          boot_id: 'missing',
          role: r.role,
          window_start: from,
          window_end: to,
          valid: false,
          invalid_reasons: [
            `expected ${r.min_pods} ${r.role} pod(s) with telemetry, found ${have}`,
          ],
          metrics: {},
          vs_baseline: {},
          drills: {},
          drill_counts: {},
          notes: [],
        });
      }
    }

    const cbase = { run_id: runId, from, to, field: 'ts' };
    const cdrills: Record<string, Drill> = {
      tick_audit: {
        ...cbase,
        sources: ['tick_audit'],
        ...(series ? { extra: { series_id: series } } : {}),
      },
      ticks: { ...cbase, sources: ['tick'], ...(series ? { extra: { series_id: series } } : {}) },
      laptop_probe: { ...cbase, sources: ['probe'], thread: 'driver', field: 'intended' },
      ext_proc: { ...cbase, sources: ['ext_proc'], thread: 'driver' },
      offenders: { ...cbase, sources: ['offender'], overlap: { start: 'ts', end: 'end' } },
      tier_b: { ...cbase, sources: ['tier_b'], overlap: { start: 'ts', end: 'end' } },
    };
    const cdocs = Object.fromEntries(
      Object.entries(cdrills).map(([k, d]) => [k, s.filter((x) => drillMatches(d, x))])
    );
    const { metrics, problems } = computeClusterMetrics(cdocs, {
      from,
      to,
      ticks: expected?.ticks ?? null,
      laptopRps: expected?.laptop_probe_rps ?? null,
      minCoverage: minCov,
      scheduledRunAts,
    });
    cluster.push({
      kind: 'cluster',
      run_id: runId,
      phase: phase.name,
      window_start: from,
      window_end: to,
      valid: problems.length === 0,
      invalid_reasons: problems,
      metrics,
      vs_baseline: {},
      offenders: cdocs.offenders.map((o) => ({
        pod: o.pod,
        kind: o.kind,
        mode: o.mode,
        task_id: o.task_id,
        dose_ms: o.dose_ms,
        blocked_ms: o.blocked_ms,
        ts: o.ts,
        end: o.end,
      })),
      tier_b: cdocs.tier_b.map(({ run_id: _r, ...rest }) => rest),
      drills: cdrills,
      drill_counts: Object.fromEntries(Object.entries(cdocs).map(([k, v]) => [k, v.length])),
    });
  }

  // Ratios (unrounded), strictly within the same pod+boot / cluster.
  for (const r of pods) {
    const b = pods.find(
      (x) => x.phase === 'baseline' && x.pod === r.pod && x.boot_id === r.boot_id
    );
    if (!b || r.boot_id === 'missing') continue;
    r.vs_baseline = {
      probe_p50: ratio(r.metrics.probe_p50_ms, b.metrics.probe_p50_ms),
      probe_p95: ratio(r.metrics.probe_p95_ms, b.metrics.probe_p95_ms),
      probe_p99: ratio(r.metrics.probe_p99_ms, b.metrics.probe_p99_ms),
      hb_gap_max: ratio(
        Math.max(r.metrics.hb_gap_max_overlap_ms ?? 0, r.metrics.hb_window_max_ms ?? 0) || null,
        Math.max(b.metrics.hb_gap_max_overlap_ms ?? 0, b.metrics.hb_window_max_ms ?? 0) || null
      ),
    };
    if (!b.valid && r !== b) {
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
        laptop_probe_p95: ratio(r.metrics.laptop_probe_p95_ms, cb.metrics.laptop_probe_p95_ms),
      };
      if (!cb.valid && r !== cb) {
        r.valid = false;
        r.invalid_reasons.push('baseline row invalid');
      }
    }
  }
  // Run-level reasons apply to every row; any invalid row makes the run invalid.
  for (const r of [...pods, ...cluster]) {
    if (runReasons.length) {
      r.valid = false;
      r.invalid_reasons.push(...runReasons);
    }
  }
  const invalidRows = [...pods, ...cluster].filter((r) => !r.valid);
  const allReasons = [...runReasons];
  if (invalidRows.length) allReasons.push(`${invalidRows.length} invalid row(s)`);
  return { pods, cluster, run_valid: allReasons.length === 0, run_invalid_reasons: allReasons };
};

/** Recomputes a stored row's metrics from docs fetched with its drills (value verification). */
export const recomputeRow = (
  row: PodRow | ClusterRow,
  docs: Record<string, Doc[]>,
  manifest: Doc
): Record<string, number | null> => {
  const expected: ExpectedInventory | undefined = manifest.expected_inventory;
  if (row.kind === 'cluster') {
    return computeClusterMetrics(docs, {
      from: row.window_start,
      to: row.window_end,
      ticks: expected?.ticks ?? null,
      laptopRps: expected?.laptop_probe_rps ?? null,
      minCoverage: 0.8,
    }).metrics;
  }
  const roleSpec = expected?.roles.find((r) => r.role === row.role);
  return computePodMetrics(docs, {
    from: row.window_start,
    to: row.window_end,
    missedThresholdMs: row.metrics.tm_missed_threshold_ms ?? 0,
    tmNode: row.metrics.tm_poll_cycles !== null && row.metrics.tm_poll_cycles !== undefined,
    expectedSources: roleSpec?.sources ?? [],
    probeRps: roleSpec?.sources.includes('probe') ? expected?.in_pod_probe_rps ?? null : null,
    minCoverage: 0.8,
  }).metrics;
};

export const r1 = (v: number | null | undefined, d = 1) =>
  v === null || v === undefined ? '—' : String(Math.round(v * 10 ** d) / 10 ** d);
