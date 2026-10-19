/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { fetchManifest, fetchRunSamples, STREAMS } from './store';

type Doc = Record<string, any>;

const pct = (values: number[], p: number): number | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
};
const max = (values: number[]): number | null => (values.length ? Math.max(...values) : null);
const mean = (values: number[]): number | null =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const round = (v: number | null, d = 1): number | null =>
  v === null ? null : Math.round(v * 10 ** d) / 10 ** d;

export interface ScorecardRow {
  run_id: string;
  lane: string;
  variant: string;
  phase: string;
  pod: string;
  window_start: number;
  window_end: number;
  offender: Doc | null;
  probe_n: number;
  probe_errors: number;
  probe_p50_ms: number | null;
  probe_p99_ms: number | null;
  probe_max_ms: number | null;
  laptop_probe_p99_ms: number | null;
  tick_n: number;
  tick_expected: number;
  tick_drift_p50_ms: number | null;
  tick_drift_p99_ms: number | null;
  tick_drift_max_ms: number | null;
  tm_poll_cycles: number;
  tm_poll_max_gap_ms: number | null;
  /** Gaps longer than max(2× poll interval, 1.5× baseline max gap); TM poll cadence is adaptive. */
  tm_missed_poll_cycles: number;
  tm_poll_stalled_ms: number | null;
  tm_poll_missed_threshold_ms: number | null;
  longest_slice_ms: number | null;
  stall_count: number;
  elu_mean: number | null;
  rss_max_mb: number | null;
  heap_used_max_mb: number | null;
  gc_count: number;
  gc_total_ms: number | null;
  gc_max_ms: number | null;
  probe_worker_cpu_ms_per_s: number | null;
  probe_worker_heap_mb: number | null;
  tier_b: Doc[];
  vs_baseline?: Record<string, number | null>;
  verdict?: Record<string, boolean | null>;
  drill: string;
}

const inWindow = (d: Doc, start: number, end: number) => d.ts >= start && d.ts < end;

/** Derives scorecard rows for one run purely from raw samples in the research store. */
export const computeScorecard = async (
  es: Client,
  runId: string
): Promise<{ manifest: Doc; rows: ScorecardRow[] }> => {
  const manifest = (await fetchManifest(es, runId)) as Doc;
  const samples = (await fetchRunSamples(es, runId)) as Doc[];
  const pollInterval: number = manifest.tm_poll_interval_ms ?? 500;
  const tickInterval: number = manifest.workload_params?.ticks?.intervalMs ?? 1000;
  const offenders = samples.filter((s) => s.source === 'offender');
  const pods = [
    ...new Set(samples.filter((s) => s.thread !== 'driver').map((s) => s.pod as string)),
  ];

  const pollStops = (pod: string): number[] =>
    samples
      .filter((s) => s.pod === pod && s.source === 'tm' && s.tm_event === 'TASK_POLLING_CYCLE')
      .map((s) => (s.timing_stop as number) ?? (s.ts as number))
      .sort((a, b) => a - b);
  const phases: Doc[] = manifest.phases ?? [];
  // Baseline poll cadence per pod (TM mget polling is adaptive, so the floor is measured, not assumed).
  const basePollMaxGap = new Map<string, number>();
  const basePhase = phases.find((p) => p.name === 'baseline');
  if (basePhase) {
    for (const pod of pods) {
      const stops = pollStops(pod).filter(
        (t) => t >= basePhase.start + 2000 && t < basePhase.end - 1000
      );
      let m = 0;
      for (let i = 1; i < stops.length; i++) m = Math.max(m, stops[i] - stops[i - 1]);
      basePollMaxGap.set(pod, m);
    }
  }
  const rows: ScorecardRow[] = [];
  for (const phase of phases) {
    // Skip the first 2s of each phase (transition noise); the offender window starts at phase start.
    const isOffender = !!phase.offender_result && phase.name !== 'baseline';
    const start = isOffender ? phase.start : phase.start + 2000;
    const end = isOffender ? phase.end : phase.end - 1000;
    const offender = offenders.find((o) => o.ts >= phase.start - 1000 && o.ts < phase.end) ?? null;
    const offenderPod = offender?.pod as string | undefined;
    const rowPods = offenderPod ? [offenderPod] : pods;
    for (const pod of rowPods) {
      const w = samples.filter((s) => s.pod === pod && inWindow(s, start, end));
      const probes = w.filter((s) => s.source === 'probe' && s.thread === 'worker');
      const okProbes = probes.filter((s) => s.status === 200);
      const laptop = samples.filter(
        (s) => s.source === 'probe' && s.thread === 'driver' && inWindow(s, start, end)
      );
      const ticks = samples.filter((s) => s.source === 'tick' && inWindow(s, start, end));
      // Poll gaps are attributed to the window containing the gap's end (includes the gap
      // from the last cycle before the window).
      const polls = pollStops(pod).filter((t) => t < end);
      const gaps: number[] = [];
      for (let i = 1; i < polls.length; i++)
        if (polls[i] >= start) gaps.push(polls[i] - polls[i - 1]);
      const missedThreshold = Math.max(2 * pollInterval, 1.5 * (basePollMaxGap.get(pod) ?? 0));
      const missed = gaps.filter((g) => g > missedThreshold).length;
      const missedMs = gaps.filter((g) => g > missedThreshold).reduce((a, g) => a + g, 0);
      const stalls = w.filter((s) => s.source === 'stall');
      const windows = w.filter((s) => s.source === 'gap_window');
      const proc = w.filter((s) => s.source === 'proc');
      const gc = w.filter((s) => s.source === 'gc');
      const wproc = w.filter((s) => s.source === 'worker_proc');
      rows.push({
        run_id: runId,
        lane: manifest.lane,
        variant: manifest.variant,
        phase: phase.name,
        pod,
        window_start: start,
        window_end: end,
        offender: offender
          ? {
              kind: offender.kind,
              mode: offender.mode,
              dose_ms: offender.dose_ms,
              blocked_ms: round(offender.blocked_ms),
              prep_ms: round(offender.prep_ms),
            }
          : null,
        probe_n: probes.length,
        probe_errors: probes.length - okProbes.length,
        probe_p50_ms: round(
          pct(
            probes.map((s) => s.latency_ms),
            50
          )
        ),
        probe_p99_ms: round(
          pct(
            probes.map((s) => s.latency_ms),
            99
          )
        ),
        probe_max_ms: round(max(probes.map((s) => s.latency_ms))),
        laptop_probe_p99_ms: round(
          pct(
            laptop.map((s) => s.latency_ms),
            99
          )
        ),
        tick_n: ticks.length,
        tick_expected: Math.floor((end - start) / tickInterval),
        tick_drift_p50_ms: round(
          pct(
            ticks.map((s) => s.drift_ms),
            50
          )
        ),
        tick_drift_p99_ms: round(
          pct(
            ticks.map((s) => s.drift_ms),
            99
          )
        ),
        tick_drift_max_ms: round(max(ticks.map((s) => s.drift_ms))),
        tm_poll_cycles: polls.length,
        tm_poll_max_gap_ms: round(max(gaps)),
        tm_missed_poll_cycles: missed,
        tm_poll_stalled_ms: round(missedMs),
        tm_poll_missed_threshold_ms: round(missedThreshold),
        longest_slice_ms: round(
          max([...stalls.map((s) => s.gap_ms), ...windows.map((s) => s.max_gap_ms)])
        ),
        stall_count: stalls.length,
        elu_mean: round(mean(proc.map((s) => s.elu)), 3),
        rss_max_mb: round(max(proc.map((s) => s.rss / 1048576))),
        heap_used_max_mb: round(max(proc.map((s) => s.heap_used / 1048576))),
        gc_count: gc.length,
        gc_total_ms: round(gc.reduce((a, s) => a + s.duration_ms, 0)),
        gc_max_ms: round(max(gc.map((s) => s.duration_ms))),
        probe_worker_cpu_ms_per_s: round(mean(wproc.map((s) => s.thread_cpu_ms ?? 0)), 2),
        probe_worker_heap_mb: round(mean(wproc.map((s) => s.heap_used / 1048576))),
<<<<<<< HEAD
=======
        tier_b: samples
          .filter((s) => s.source === 'tier_b' && inWindow(s, start, end))
          .map((s) => ({
            replay: s.replay,
            mode: s.mode,
            pod: s.pod,
            repeat: s.repeat,
            mb: round(s.bytes / 1048576, 2),
            fields: s.fields,
            io_ms: round(s.io_ms),
            decode_ms: round(s.decode_ms),
            parse_ms: round(s.parse_ms),
            shape_ms: round(s.shape_ms),
            e2e_ms: round(s.e2e_ms),
            max_sync_ms: round(s.max_sync_ms),
            heap_delta_mb: round(s.heap_delta_mb),
          })),
>>>>>>> 516f0dd2e43f ([Research] harness: Tier B field caps + alerting replays, QA overview export, CI hygiene (moon, codeowners, plugin list, lint))
        drill: `research-samples: run_id:"${runId}" AND pod:"${pod}" AND ts >= ${Math.round(
          start
        )} AND ts < ${Math.round(end)}`,
      });
    }
  }

  // Ratios against the baseline phase of the same run (paired within run).
  const base = rows.find((r) => r.phase === 'baseline');
  if (base) {
    for (const r of rows) {
      const ratio = (a: number | null, b: number | null) =>
        a === null || b === null || b === 0 ? null : round(a / b, 2);
      r.vs_baseline = {
        probe_p99: ratio(r.probe_p99_ms, base.probe_p99_ms),
        tick_drift_p99: ratio(r.tick_drift_p99_ms, base.tick_drift_p99_ms),
        tick_drift_max: ratio(r.tick_drift_max_ms, base.tick_drift_max_ms),
      };
      r.verdict = {
        probe_p99_le_2x: r.vs_baseline.probe_p99 === null ? null : r.vs_baseline.probe_p99 <= 2,
        tick_drift_p99_le_2x:
          r.vs_baseline.tick_drift_p99 === null ? null : r.vs_baseline.tick_drift_p99 <= 2,
        no_missed_poll_cycles: r.tm_missed_poll_cycles === 0,
        longest_slice_le_50ms: r.longest_slice_ms === null ? null : r.longest_slice_ms <= 50,
      };
    }
  }
  return { manifest, rows };
};

export const writeScorecard = async (es: Client, rows: ScorecardRow[]): Promise<void> => {
  if (!rows.length) return;
  await es.deleteByQuery({
    index: STREAMS.scorecards,
    query: { term: { run_id: rows[0].run_id } },
    ignore_unavailable: true,
    conflicts: 'proceed',
    refresh: true,
  });
  await es.bulk({
    refresh: true,
    operations: rows.flatMap((r) => [
      { create: { _index: STREAMS.scorecards } },
      { ...r, '@timestamp': Math.round(r.window_start), row: `${r.phase}/${r.pod}` },
    ]),
  });
};

export const scorecardMarkdown = (manifest: Doc, rows: ScorecardRow[]): string => {
  const head =
    '| phase | offender (kind/mode/dose→blocked ms) | probe p50/p99/max ms | p99 × base | laptop p99 | tick drift p50/p99/max ms | drift p99 × base | ticks obs/exp | TM polls / max gap / missed | longest slice ms | ELU | RSS max MB | heap max MB | GC n/total/max ms | probe-worker cpu ms/s |\n' +
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
  const body = rows
    .map((r) => {
      const o = r.offender
        ? `${r.offender.kind}/${r.offender.mode}/${r.offender.dose_ms}→${r.offender.blocked_ms}`
        : '—';
      return `| ${r.phase} | ${o} | ${r.probe_p50_ms}/${r.probe_p99_ms}/${r.probe_max_ms} (n=${
        r.probe_n
      }, err=${r.probe_errors}) | ${r.vs_baseline?.probe_p99 ?? '—'} | ${
        r.laptop_probe_p99_ms ?? '—'
      } | ${r.tick_drift_p50_ms}/${r.tick_drift_p99_ms}/${r.tick_drift_max_ms} | ${
        r.vs_baseline?.tick_drift_p99 ?? '—'
      } | ${r.tick_n}/${r.tick_expected} | ${r.tm_poll_cycles}/${r.tm_poll_max_gap_ms}/${
        r.tm_missed_poll_cycles
      } (>${r.tm_poll_missed_threshold_ms}) | ${r.longest_slice_ms} | ${r.elu_mean} | ${
        r.rss_max_mb
      } | ${r.heap_used_max_mb} | ${r.gc_count}/${r.gc_total_ms}/${r.gc_max_ms} | ${
        r.probe_worker_cpu_ms_per_s
      } |`;
    })
    .join('\n');
<<<<<<< HEAD
=======
  const tierB = rows
    .flatMap((r) => r.tier_b.map((t) => `- ${r.phase}: ${JSON.stringify(t)}`))
    .join('\n');
>>>>>>> 516f0dd2e43f ([Research] harness: Tier B field caps + alerting replays, QA overview export, CI hygiene (moon, codeowners, plugin list, lint))
  return `# Scorecard ${manifest.run_id}\n\n- lane: ${manifest.lane} · variant: ${
    manifest.variant
  } · target: ${manifest.target?.kind} · commit: ${manifest.source_commit}${
    manifest.source_dirty ? ' (dirty)' : ''
  }\n- image: ${manifest.image_digest ?? 'n/a'} · QAF project: ${
    manifest.qaf_project_id ?? 'n/a'
  } · TM poll interval: ${manifest.tm_poll_interval_ms} ms (${
    manifest.tm_claim_strategy
  })\n- window: ${manifest.utc_start} → ${manifest.utc_end}\n- hypothesis: ${
    manifest.hypothesis
<<<<<<< HEAD
  }\n- drill: each row's \`drill\` field in \`research-scorecards\` is the exact \`research-samples\` filter.\n\n${head}${body}\n`;
=======
  }\n- drill: each row's \`drill\` field in \`research-scorecards\` is the exact \`research-samples\` filter.\n\n${head}${body}\n${
    tierB ? `\n## Tier B replay timings\n\n${tierB}\n` : ''
  }`;
>>>>>>> 516f0dd2e43f ([Research] harness: Tier B field caps + alerting replays, QA overview export, CI hygiene (moon, codeowners, plugin list, lint))
};
