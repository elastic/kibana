/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { ACTIONS } from './actions';
import { overviewChecks, overviewEsql } from './overview';
import { runScenario } from './driver';
import { runExternal } from './external';
import { targetFromEnv } from './kibana_client';
import { SCENARIOS } from './scenarios';
import { computeScorecard, scorecardMarkdown, writeScorecard } from './scorecard';
import { drillToQuery, scoreRun } from './score';
import { fetchManifest, fetchRunSamples } from './store';

const computeScorecardParts = async (es: ReturnType<typeof researchEs>, runId: string) => {
  const manifest = await fetchManifest(es, runId);
  const samples = await fetchRunSamples(es, runId);
  return scoreRun(manifest, samples);
};
import { ingestRunDir, researchEs, setupStore } from './store';

const DEFAULT_RUNS_DIR = path.join(
  os.homedir(),
  '.agentic-work/projects/kibana/workload-isolation-research/runs'
);

const parseArgs = (argv: string[]): { cmd: string; flags: Record<string, string> } => {
  const [cmd, ...rest] = argv;
  const flags: Record<string, string> = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      flags[k] = v ?? (rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : 'true');
    }
  }
  return { cmd, flags };
};

const USAGE = `workload isolation harness (RESEARCH ONLY)

  run.js setup-store
  run.js run --scenario <name> [--lane lane-0] [--variant baseline] [--hypothesis "..."] [--expected '{json}']
             [--target local|qaf] [--qaf-project-id id] [--image-digest sha] [--baseline-commit sha]
             [--expected-pods 1] [--runs-dir dir] [--no-ingest]
  run.js ingest --dir <runDir>
  run.js scorecard --run-id <id> [--runs-dir dir]

env: WIR_KIBANA_URL, WIR_KIBANA_API_KEY | WIR_KIBANA_BASIC (user:pass), WIR_RESEARCH_ES_URL (default http://localhost:9250)
scenarios: ${Object.keys(SCENARIOS).join(', ')}
`;

export const main = async (): Promise<void> => {
  const { cmd, flags } = parseArgs(process.argv.slice(2));
  const es = researchEs();
  const runsDir = flags['runs-dir'] ?? DEFAULT_RUNS_DIR;
  switch (cmd) {
    case 'setup-store':
      await setupStore(es);
      // eslint-disable-next-line no-console
      console.log('research store templates installed');
      return;
    case 'run': {
      const scenario = SCENARIOS[flags.scenario];
      if (!scenario) throw new Error(`unknown scenario ${flags.scenario}\n${USAGE}`);
      const runner = scenario.externalOnly
        ? (o: Parameters<typeof runScenario>[0]) =>
            runExternal({ ...o, kibanaPid: Number(flags['kibana-pid']) })
        : runScenario;
      const { runId, dir } = await runner({
        target: targetFromEnv(),
        targetKind: (flags.target as 'local' | 'qaf') ?? 'local',
        scenario,
        lane: flags.lane ?? 'lane-0',
        variant: flags.variant ?? 'baseline',
        hypothesis: flags.hypothesis ?? '',
        expected: flags.expected ? JSON.parse(flags.expected) : {},
        baselineCommit: flags['baseline-commit'] ?? '',
        imageDigest: flags['image-digest'] ?? null,
        qafProjectId: flags['qaf-project-id'] ?? null,
        runsDir,
        repoDir: path.resolve(__dirname, '../../../../../../..'),
        configOverrides: flags['config-overrides'] ? JSON.parse(flags['config-overrides']) : {},
        expectedPods: Number(flags['expected-pods'] ?? 1),
        actions: ACTIONS,
      });
      if (flags['no-ingest'] === 'true') return;
      await setupStore(es);
      const counts = await ingestRunDir(es, dir);
      const { manifest, rows } = await computeScorecard(es, runId);
      await writeScorecard(es, rows, manifest);
      const md = scorecardMarkdown(manifest, rows);
      fs.writeFileSync(path.join(dir, 'scorecard.md'), md);
      fs.writeFileSync(path.join(dir, 'scorecard.json'), JSON.stringify(rows, null, 2));
      // eslint-disable-next-line no-console
      console.log(`ingested ${JSON.stringify(counts)}\n${md}`);
      return;
    }
    case 'ingest': {
      await setupStore(es);
      // eslint-disable-next-line no-console
      console.log(await ingestRunDir(es, flags.dir));
      return;
    }
    case 'scorecard': {
      const { manifest, rows } = await computeScorecard(es, flags['run-id']);
      await writeScorecard(es, rows, manifest);
      const md = scorecardMarkdown(manifest, rows);
      const dir = path.join(runsDir, flags['run-id']);
      if (fs.existsSync(dir)) {
        fs.writeFileSync(path.join(dir, 'scorecard.md'), md);
        fs.writeFileSync(path.join(dir, 'scorecard.json'), JSON.stringify(rows, null, 2));
      }
      // eslint-disable-next-line no-console
      console.log(md);
      return;
    }
    case 'calibrate': {
      // Slice-proxy calibration: known route doses vs main-side heartbeat gaps (+ worker view).
      const { pods, cluster } = await computeScorecardParts(es, flags['run-id']);
      const byDose = new Map<number, Array<Record<string, number | null>>>();
      for (const c of cluster.filter((r) => r.phase.startsWith('cal-'))) {
        const off = c.offenders[0];
        const pod = pods.find((p) => p.phase === c.phase && p.pod === off?.pod);
        if (!off || !pod) continue;
        const hb = pod.metrics.hb_gap_max_full_ms ?? pod.metrics.hb_window_max_ms;
        const list = byDose.get(off.dose_ms) ?? [];
        list.push({
          blocked: off.blocked_ms,
          hb,
          err: hb === null ? null : hb - off.blocked_ms,
          worker: pod.metrics.worker_gap_window_max_ms,
        });
        byDose.set(off.dose_ms, list);
      }
      const st = (xs: number[]) =>
        xs.length
          ? {
              n: xs.length,
              mean: xs.reduce((a, b) => a + b, 0) / xs.length,
              min: Math.min(...xs),
              max: Math.max(...xs),
            }
          : null;
      const samples = (await fetchRunSamples(es, flags['run-id'])) as Array<Record<string, any>>;
      const manifest = (await fetchManifest(es, flags['run-id'])) as Record<string, any>;
      const base = manifest.phases.find((p: Record<string, any>) => p.name === 'baseline');
      const idle = samples
        .filter(
          (x) =>
            x.source === 'main_gap_window' && x.ts >= base.start + 2000 && x.end <= base.end - 1000
        )
        .map((x) => x.max_gap_ms as number)
        .sort((a, b) => a - b);
      const late = samples
        .filter(
          (x) => x.source === 'gap_window' && x.ts >= base.start + 2000 && x.end <= base.end - 1000
        )
        .map((x) => (x.sampler_late_max_ms ?? 0) as number)
        .sort((a, b) => a - b);
      const q = (xs: number[], p: number) =>
        xs[Math.min(xs.length - 1, Math.ceil(p * xs.length) - 1)];
      const out = {
        run_id: flags['run-id'],
        doses: Object.fromEntries(
          [...byDose.entries()].map(([dose, rows]) => [
            dose,
            {
              hb_minus_blocked_ms: st(
                rows.map((r) => r.err).filter((x): x is number => x !== null)
              ),
              worker_view_ms: st(rows.map((r) => r.worker).filter((x): x is number => x !== null)),
              blocked_ms: st(rows.map((r) => r.blocked).filter((x): x is number => x !== null)),
            },
          ])
        ),
        idle_1s_window_max_gap_ms: idle.length
          ? { n: idle.length, p50: q(idle, 0.5), p99: q(idle, 0.99), max: idle.at(-1) }
          : null,
        worker_sampler_late_ms: late.length
          ? { p50: q(late, 0.5), p99: q(late, 0.99), max: late.at(-1) }
          : null,
      };
      if (flags.out) fs.writeFileSync(flags.out, JSON.stringify(out, null, 2));
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    case 'aa': {
      // A/A analysis: log-ratio noise between matched idle windows (B_i / A_i) per pod+boot.
      const metricsOf = (m: Record<string, number | null>) => ({
        probe_p50: m.probe_p50_ms,
        probe_p95: m.probe_p95_ms,
        probe_p99: m.probe_p99_ms,
        hb_max: Math.max(m.hb_gap_max_overlap_ms ?? 0, m.hb_window_max_ms ?? 0) || null,
      });
      const logs: Record<string, number[]> = {
        probe_p50: [],
        probe_p95: [],
        probe_p99: [],
        hb_max: [],
      };
      const perRun: Record<string, unknown> = {};
      for (const runId of String(flags['run-ids']).split(',')) {
        const { pods } = await computeScorecardParts(es, runId);
        let pairs = 0;
        for (const a of pods.filter(
          (p) => p.phase.startsWith('aa-A-') && p.valid && p.metrics.probe_n
        )) {
          const b = pods.find(
            (p) =>
              p.phase === a.phase.replace('aa-A-', 'aa-B-') &&
              p.pod === a.pod &&
              p.boot_id === a.boot_id
          );
          if (!b || !b.valid) continue;
          pairs++;
          const ma = metricsOf(a.metrics);
          const mb = metricsOf(b.metrics);
          for (const k of Object.keys(logs)) {
            const x = (ma as Record<string, number | null>)[k];
            const y = (mb as Record<string, number | null>)[k];
            if (x && y) logs[k].push(Math.log(y / x));
          }
        }
        perRun[runId] = { valid_pairs: pairs };
      }
      const summary: Record<string, unknown> = {};
      for (const [k, xs] of Object.entries(logs)) {
        if (!xs.length) continue;
        const m = xs.reduce((a, b) => a + b, 0) / xs.length;
        const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, xs.length - 1));
        const mde = (n: number) => Math.exp(((1.96 + 0.84) * sd) / Math.sqrt(n));
        summary[k] = {
          pairs: xs.length,
          mean_ratio: Math.exp(m),
          ci95_mean_ratio: [
            Math.exp(m - (1.96 * sd) / Math.sqrt(xs.length)),
            Math.exp(m + (1.96 * sd) / Math.sqrt(xs.length)),
          ],
          sd_log_ratio: sd,
          single_pair_95pct_band: [Math.exp(-1.96 * sd), Math.exp(1.96 * sd)],
          mde_ratio_80pct_power: { n1: mde(1), n3: mde(3), n5: mde(5), n10: mde(10) },
        };
      }
      const out = { runs: perRun, summary };
      if (flags.out) fs.writeFileSync(flags.out, JSON.stringify(out, null, 2));
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    case 'perturb': {
      // Perturbation calibration summary: external-only idle runs per condition (variant).
      const res = await es.search<Record<string, any>>({
        index: 'research-scorecards',
        size: 1000,
        query: {
          bool: {
            filter: [
              { term: { phase: 'baseline' } },
              { term: { pod: 'cluster' } },
              { prefix: { variant: flags['variant-prefix'] ?? 'perturb-' } },
            ],
          },
        },
      });
      const by = new Map<string, Array<Record<string, number>>>();
      for (const h of res.hits.hits) {
        const r = h._source as Record<string, any>;
        by.set(r.variant, [...(by.get(r.variant) ?? []), r.metrics]);
      }
      const agg = (xs: number[]) => {
        const m = xs.reduce((a, b) => a + b, 0) / xs.length;
        const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, xs.length - 1));
        return { n: xs.length, mean: m, sd, values: xs };
      };
      const out = Object.fromEntries(
        [...by.entries()].map(([variant, rows]) => [
          variant,
          {
            laptop_probe_p50_ms: agg(rows.map((r) => r.laptop_probe_p50_ms)),
            laptop_probe_p99_ms: agg(rows.map((r) => r.laptop_probe_p99_ms)),
            kibana_cpu_pct: agg(rows.map((r) => r.ext_cpu_pct_mean)),
            kibana_rss_max_mb: agg(rows.map((r) => r.ext_rss_max_mb)),
          },
        ])
      );
      if (flags.out) fs.writeFileSync(flags.out, JSON.stringify(out, null, 2));
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    case 'verify-drills': {
      // Re-runs every stored drill query against research-samples and compares the count with
      // the count the scorer used. Any mismatch means a drill does not reproduce its row.
      const { rows } = await computeScorecard(es, flags['run-id']);
      let checked = 0;
      const mismatches: string[] = [];
      for (const r of rows) {
        for (const [name, d] of Object.entries(r.drills)) {
          const { count } = await es.count({ index: 'research-samples', query: drillToQuery(d) });
          checked++;
          if (count !== r.drill_counts[name]) {
            mismatches.push(
              `${r.phase}/${r.kind === 'pod' ? r.pod : 'cluster'}/${name}: es=${count} scorer=${
                r.drill_counts[name]
              }`
            );
          }
        }
      }
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ run_id: flags['run-id'], checked, mismatches }, null, 2));
      if (mismatches.length) process.exitCode = 1;
      return;
    }
    case 'variance': {
      // Baseline-phase dispersion per target (project/local) across runs whose variant matches.
      const prefix = flags['variant-prefix'] ?? 'variance';
      const res = await es.search<Record<string, any>>({
        index: 'research-scorecards',
        size: 1000,
        query: {
          bool: { filter: [{ term: { phase: 'baseline' } }, { prefix: { variant: prefix } }] },
        },
      });
      const runs = await es.search<Record<string, any>>({
        index: 'research-runs',
        size: 1000,
        query: { prefix: { variant: prefix } },
      });
      const project = new Map(
        runs.hits.hits.map((h) => [h._source?.run_id, h._source?.qaf_project_id ?? 'local'])
      );
      const groups = new Map<string, Array<Record<string, any>>>();
      // Supports both the pre-fix (flat) and fix-pass (metrics.*) scorecard row formats.
      const flat = (src: Record<string, any>) =>
        src.metrics
          ? { ...src, ...src.metrics, longest_slice_ms: src.metrics.hb_gap_max_overlap_ms }
          : src;
      for (const h of res.hits.hits) {
        const r = flat(h._source as Record<string, any>);
        if (r.kind === 'cluster' || r.pod === 'cluster') continue;
        // Group by target and pod role (pods are replaced by image updates; roles are stable).
        const role = String(r.pod).startsWith('kb-background')
          ? 'background'
          : String(r.pod).startsWith('kb-ui')
          ? 'ui'
          : r.pod;
        const key = `${project.get(r.run_id)}|${role}`;
        groups.set(key, [...(groups.get(key) ?? []), r]);
      }
      const stats = (raw: Array<number | null>) => {
        const xs = raw.filter((x): x is number => typeof x === 'number');
        if (!xs.length) return null;
        const m = xs.reduce((a, b) => a + b, 0) / xs.length;
        const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, xs.length - 1));
        return {
          n: xs.length,
          mean: Math.round(m * 10) / 10,
          sd: Math.round(sd * 10) / 10,
          cv: Math.round((sd / m) * 100) / 100,
          min: Math.min(...xs),
          max: Math.max(...xs),
        };
      };
      const out: Record<string, unknown> = {};
      for (const [key, rows] of groups) {
        out[key] = {
          runs: rows.map((r) => r.run_id),
          probe_p50_ms: stats(rows.map((r) => r.probe_p50_ms)),
          probe_p99_ms: stats(rows.map((r) => r.probe_p99_ms)),
          longest_slice_ms: stats(rows.map((r) => r.longest_slice_ms)),
        };
      }
      const all = res.hits.hits
        .map((h) => flat(h._source as Record<string, any>))
        .filter((r) => project.get(r.run_id) !== 'local' && String(r.pod).startsWith('kb-ui'));
      out.pooled_qaf_ui = {
        probe_p99_ms: stats(all.map((r) => r.probe_p99_ms)),
        probe_p50_ms: stats(all.map((r) => r.probe_p50_ms)),
      };
      if (flags.out) fs.writeFileSync(flags.out, JSON.stringify(out, null, 2));
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    case 'overview': {
      // Export QA overview slices for a QAF project window (read-only).
      const checks = flags.query
        ? { custom: flags.query }
        : overviewChecks(flags['project-id'], flags.from, flags.to);
      const out: Record<string, unknown> = {};
      for (const [name, query] of Object.entries(checks)) {
        try {
          out[name] = await overviewEsql(query);
        } catch (e) {
          out[name] = { error: String(e) };
        }
      }
      if (flags.out) fs.writeFileSync(flags.out, JSON.stringify(out, null, 2));
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(out, null, 2).slice(0, 4000));
      return;
    }
    default:
      // eslint-disable-next-line no-console
      console.log(USAGE);
  }
};
