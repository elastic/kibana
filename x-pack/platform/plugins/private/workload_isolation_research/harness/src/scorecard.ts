/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ClusterRow, Doc, PodRow } from './score';
import { drillToQuery, r1, scoreRun } from './score';
import { fetchManifest, fetchRunSamples, STREAMS } from './store';

export type ScorecardRow = PodRow | ClusterRow;

/** Derives scorecard rows for one run purely from raw samples in the research store. */
export const computeScorecard = async (
  es: Client,
  runId: string
): Promise<{
  manifest: Doc;
  rows: ScorecardRow[];
  run_valid: boolean;
  run_invalid_reasons: string[];
}> => {
  const manifest = (await fetchManifest(es, runId)) as Doc;
  const samples = (await fetchRunSamples(es, runId)) as Doc[];
  const {
    pods,
    cluster,
    run_valid: runValid,
    run_invalid_reasons: reasons,
  } = scoreRun(manifest, samples);
  return {
    manifest,
    rows: [...cluster, ...pods],
    run_valid: runValid,
    run_invalid_reasons: reasons,
  };
};

export const writeScorecard = async (
  es: Client,
  rows: ScorecardRow[],
  manifest?: Doc
): Promise<void> => {
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
      {
        ...r,
        lane: manifest?.lane,
        variant: manifest?.variant,
        qaf_project_id: manifest?.qaf_project_id ?? null,
        '@timestamp': Math.round(r.window_start),
        row: r.kind === 'pod' ? `${r.phase}/${r.pod}/${r.boot_id}` : `${r.phase}/cluster`,
        pod: r.kind === 'pod' ? r.pod : 'cluster',
        // Drill specs are stored as ES queries against research-samples (same predicate).
        drills: Object.fromEntries(
          Object.entries(r.drills).map(([k, d]) => [k, JSON.stringify(drillToQuery(d))])
        ),
      },
    ]),
  });
};

const verdict = (r: ScorecardRow) =>
  r.valid ? 'valid' : `**INVALID**: ${r.invalid_reasons.join('; ')}`;

export const scorecardMarkdown = (manifest: Doc, rows: ScorecardRow[]): string => {
  const cluster = rows.filter((r): r is ClusterRow => r.kind === 'cluster');
  const pods = rows.filter((r): r is PodRow => r.kind === 'pod');
  const ch =
    '| phase | validity | ticks sched/ran/obs/lost | tick drift p50/p99/max ms | drift p99 × base | laptop p95 / p99 | offenders (pod kind/mode dose→blocked) |\n|---|---|---|---|---|---|---|\n';
  const cb = cluster
    .map((r) => {
      const m = r.metrics;
      const off =
        r.offenders
          .map(
            (o) =>
              `${String(o.pod).slice(0, 18)} ${o.kind}/${o.mode} ${o.dose_ms}→${r1(o.blocked_ms)}`
          )
          .join('<br>') || '—';
      return `| ${r.phase} | ${verdict(r)} | ${m.ticks_scheduled}/${m.ticks_ran}/${
        m.ticks_observed
      }/${m.ticks_lost} | ${r1(m.tick_drift_p50_ms)}/${r1(m.tick_drift_p99_ms)}/${r1(
        m.tick_drift_max_ms
      )} | ${r1(r.vs_baseline.tick_drift_p99, 2)} | ${r1(m.laptop_probe_p95_ms)} / ${r1(
        m.laptop_probe_p99_ms
      )} | ${off} |`;
    })
    .join('\n');
  const ph =
    '| phase | pod / boot | validity | probe p50/**p95**/p99/max ms (n, err) | **p95 × base** (p99 × base) | hb-gap proxy max ms (overlap / full / 1 s-window max) | worker cov | TM polls / max gap / missed | ELU | heap sampled max MB | GC n/max ms |\n|---|---|---|---|---|---|---|---|---|---|---|\n';
  const pb = pods
    .map((r) => {
      const m = r.metrics;
      const cells = [
        r.phase,
        `${r.pod.slice(0, 26)} / ${r.boot_id.slice(0, 8)}`,
        verdict(r),
        `${r1(m.probe_p50_ms)}/**${r1(m.probe_p95_ms)}**/${r1(m.probe_p99_ms)}/${r1(
          m.probe_max_ms
        )} (${m.probe_n}, ${m.probe_errors})`,
        `**${r1(r.vs_baseline.probe_p95, 2)}** (${r1(r.vs_baseline.probe_p99, 2)})`,
        `${r1(m.hb_gap_max_overlap_ms)} / ${r1(m.hb_gap_max_full_ms)} / ${r1(m.hb_window_max_ms)}`,
        r1(m.worker_coverage, 2),
        `${m.tm_poll_cycles ?? '—'}/${r1(m.tm_poll_max_gap_ms)} (full ${r1(
          m.tm_poll_max_gap_full_ms
        )})/${m.tm_missed_poll_cycles ?? '—'}`,
        r1(m.elu_mean, 3),
        r1(m.heap_sampled_max_mb),
        `${m.gc_count}/${r1(m.gc_max_ms)}`,
      ];
      return `| ${cells.join(' | ')} |`;
    })
    .join('\n');
  const tierB = cluster
    .flatMap((r) => r.tier_b.map((t) => `- ${r.phase}: ${JSON.stringify(t)}`))
    .join('\n');
  const runValid = rows.every(
    (r) =>
      !r.invalid_reasons.some(
        (x) => x.startsWith('run status') || x.startsWith('push loss') || x.startsWith('pull ring')
      )
  );
  return `# Scorecard ${manifest.run_id}

- lane: ${manifest.lane} · variant: ${manifest.variant} · target: ${
    manifest.target?.kind
  } · commit: ${manifest.source_commit}${manifest.source_dirty ? ' (dirty)' : ''}
- image: ${manifest.image_digest ?? 'n/a'} · QAF project: ${
    manifest.qaf_project_id ?? 'n/a'
  } · TM poll interval: ${manifest.tm_poll_interval_ms} ms (${manifest.tm_claim_strategy})
- window: ${manifest.utc_start} → ${manifest.utc_end} · run-level: ${
    runValid ? 'valid' : '**INVALID**'
  }
- hypothesis: ${manifest.hypothesis}
- Scoping: cluster rows hold cluster-wide metrics (ticks run on any background pod, laptop probe, offenders, Tier B); pod rows are per pod+boot only. Every metric's drill (ES query) is stored in \`research-scorecards.drills\` and reproduces the row. "hb-gap proxy" = main-side heartbeat gap (calibrated proxy for the longest uninterrupted slice; see Track 0 report). Heap/RSS are sampled lower bounds.

## Cluster

${ch}${cb}

## Pods

${ph}${pb}
${tierB ? `\n## Tier B replay timings\n\n${tierB}\n` : ''}`;
};
