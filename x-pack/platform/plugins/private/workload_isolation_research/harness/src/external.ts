/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { performance } from 'perf_hooks';
import { Collector, DRIVER_VERSION } from './driver';
import type { RunOptions } from './driver';
import { LaptopProbe } from './laptop_probe';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const now = () => performance.timeOrigin + performance.now();

/**
 * External-only run (perturbation calibration): touches no plugin endpoint, so it works with the
 * research plugin disabled. Samples the laptop probe and the Kibana server process (ps).
 */
export const runExternal = async (
  opts: RunOptions & { kibanaPid: number }
): Promise<{ runId: string; dir: string }> => {
  const { scenario } = opts;
  const stamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 17);
  const runId = `${opts.lane}-${scenario.name}-${opts.variant}-${stamp}-${Math.random()
    .toString(16)
    .slice(2, 6)}`.toLowerCase();
  const dir = path.join(opts.runsDir, runId);
  fs.mkdirSync(dir, { recursive: true });
  const collector = new Collector(opts.target, path.join(dir, 'samples.ndjson'));
  const manifest: Record<string, any> = {
    run_id: runId,
    '@timestamp': new Date().toISOString(),
    lane: opts.lane,
    hypothesis: opts.hypothesis,
    expected: opts.expected,
    variant: opts.variant,
    source_commit: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: opts.repoDir,
      encoding: 'utf8',
    }).trim(),
    target: { kind: opts.targetKind, url: opts.target.url },
    workload_params: scenario,
    utc_start: new Date().toISOString(),
    driver_version: DRIVER_VERSION,
    config_overrides: opts.configOverrides,
    host: { loadavg_start: os.loadavg(), cpus: os.cpus().length },
    phases: [],
    pods: [],
    notes: ['external-only run: no plugin endpoints used'],
    invalid_reasons: [],
    status: 'running',
    kibana_pid: opts.kibanaPid,
  };
  const laptop = new LaptopProbe(
    opts.target,
    scenario.laptopProbe.rps,
    scenario.laptopProbe.path,
    collector
  );
  laptop.start();
  let sampling = true;
  const psLoop = (async () => {
    while (sampling) {
      try {
        const [cpu, rss] = execFileSync('ps', ['-o', '%cpu=,rss=', '-p', String(opts.kibanaPid)], {
          encoding: 'utf8',
        })
          .trim()
          .split(/\s+/)
          .map(Number);
        collector.write({
          source: 'ext_proc',
          thread: 'driver',
          pod: 'driver',
          ts: now(),
          cpu_pct: cpu,
          rss_kb: rss,
        });
      } catch {
        manifest.invalid_reasons.push('kibana pid not found');
        return;
      }
      await sleep(1000);
    }
  })();
  for (const phase of scenario.phases) {
    const start = now();
    await sleep(phase.durationS * 1000);
    manifest.phases.push({ name: phase.name, start, end: now() });
  }
  laptop.stop();
  sampling = false;
  await psLoop;
  await sleep(3000);
  await collector.close();
  manifest.status = manifest.invalid_reasons.length ? 'failed' : 'complete';
  manifest.utc_end = new Date().toISOString();
  manifest.host.loadavg_end = os.loadavg();
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return { runId, dir };
};
