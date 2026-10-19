/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { performance } from 'perf_hooks';
import type { KibanaTarget } from './kibana_client';
import { API, kbn } from './kibana_client';
import type { Phase, RunManifest, Scenario } from './types';
import { LaptopProbe } from './laptop_probe';
import { awaitTasks, taskStatus } from './await_tasks';

export const DRIVER_VERSION = '0.1.0';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const now = () => performance.timeOrigin + performance.now();

interface SamplesResponse {
  pod: string;
  boot_id: string;
  pid: number;
  main: {
    samples: Array<{ seq: number; item: Record<string, unknown> }>;
    dropped: number;
    last_seq: number;
  };
  worker: {
    samples: Array<{ seq: number; item: Record<string, unknown> }>;
    dropped: number;
    last_seq: number;
    probing: boolean;
  };
}

/** Pull-with-dedup collector: the load balancer picks the pod; cursors are keyed per process boot. */
export class Collector {
  public readonly cursors: Record<string, { main: number; worker: number }> = {};
  public readonly pods = new Map<
    string,
    { pod: string; boot_id: string; pid: number; probing: boolean; dropped: number }
  >();
  private readonly out: fs.WriteStream;
  public count = 0;
  public pullErrors = 0;
  private stopped = false;

  constructor(private readonly target: KibanaTarget, file: string) {
    this.out = fs.createWriteStream(file, { flags: 'a' });
  }

  public readonly seen = new Set<string>();
  public readonly tickScheduled: Array<Record<string, unknown>> = [];

  public write(doc: Record<string, unknown>): void {
    if (doc.thread !== 'driver') {
      const key = `${doc.boot_id}|${doc.thread}|${doc.seq}`;
      if (this.seen.has(key)) return;
      this.seen.add(key);
    }
    if (doc.source === 'tick_scheduled') this.tickScheduled.push(doc);
    this.out.write(JSON.stringify(doc) + '\n');
    this.count++;
  }

  public async pullOnce(): Promise<SamplesResponse | undefined> {
    try {
      const { status, body } = await kbn<SamplesResponse>(
        this.target,
        'POST',
        `${API}/samples`,
        {
          cursors: this.cursors,
          limit: 50000,
        },
        30000
      );
      if (status !== 200) {
        this.pullErrors++;
        return undefined;
      }
      const { pod, boot_id: bootId } = body;
      const cursor = this.cursors[bootId] ?? { main: 0, worker: 0 };
      for (const { seq, item } of body.main.samples) {
        this.write({ ...item, pod, boot_id: bootId, thread: 'main', seq });
        cursor.main = seq;
      }
      for (const { seq, item } of body.worker.samples) {
        this.write({ ...item, pod, boot_id: bootId, thread: 'worker', seq });
        cursor.worker = seq;
      }
      this.cursors[bootId] = cursor;
      const prev = this.pods.get(bootId);
      this.pods.set(bootId, {
        pod,
        boot_id: bootId,
        pid: body.pid,
        probing: body.worker.probing,
        dropped: (prev?.dropped ?? 0) + body.main.dropped + body.worker.dropped,
      });
      return body;
    } catch {
      this.pullErrors++;
      return undefined;
    }
  }

  public async loop(intervalMs: number): Promise<void> {
    while (!this.stopped) {
      await this.pullOnce();
      await sleep(intervalMs);
    }
  }

  public stop(): void {
    this.stopped = true;
  }

  public close(): Promise<void> {
    return new Promise((r) => this.out.end(r));
  }
}

const git = (cmd: string, cwd: string): string => {
  try {
    return execSync(`git ${cmd}`, { cwd, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

export interface RunOptions {
  readonly target: KibanaTarget;
  readonly targetKind: 'local' | 'qaf';
  readonly scenario: Scenario;
  readonly lane: string;
  readonly variant: string;
  readonly hypothesis: string;
  readonly expected: Record<string, unknown>;
  readonly baselineCommit: string;
  readonly imageDigest: string | null;
  readonly qafProjectId: string | null;
  readonly runsDir: string;
  readonly repoDir: string;
  readonly configOverrides: Record<string, unknown>;
  readonly expectedPods: number;
  readonly actions?: Record<
    string,
    (params: Record<string, unknown>, ctx: ActionContext) => Promise<Record<string, unknown>>
  >;
}

export interface ActionContext {
  readonly target: KibanaTarget;
  readonly runId: string;
  readonly collector: Collector;
  readonly log: (msg: string) => void;
}

const runPhase = async (
  phase: Phase,
  opts: RunOptions,
  ctx: ActionContext
): Promise<Record<string, unknown> | undefined> => {
  let result: Record<string, unknown> | undefined;
  if (phase.offender) {
    const { status, body } = await kbn<Record<string, unknown>>(
      opts.target,
      'POST',
      `${API}/offender`,
      { ...phase.offender, runId: ctx.runId },
      Math.max(120000, phase.offender.doseMs * 3)
    ).catch((e) => ({ status: 0, body: { error: String(e) } as Record<string, unknown> }));
    result = { status, ...body };
    if (status !== 200)
      throw new Error(`offender request failed: ${status} ${JSON.stringify(body).slice(0, 300)}`);
    if (phase.offender.mode === 'task') {
      if (phase.offender.kind === 'infinite_loop') {
        // Non-terminating by design: it never completes; wait its safety cap (documented).
        await sleep(phase.offender.doseMs + 5000);
      } else {
        // Phase completion: await the task by id (fail on timeout) before the recovery tail.
        const done = await awaitTasks(
          opts.target,
          [String(body.task_id)],
          phase.offender.doseMs * 3 + 120000
        );
        result.completed_at = done.completedAt;
      }
    } else {
      result.completed_at = Date.now();
    }
  }
  if (phase.action) {
    const action = opts.actions?.[phase.action];
    if (!action) throw new Error(`unknown action ${phase.action}`);
    result = await action(phase.actionParams ?? {}, ctx);
    if (result && result.completed_at === undefined) result.completed_at = Date.now();
  }
  await sleep(phase.durationS * 1000);
  return result;
};

/** Executes one scenario run end to end and writes a self-contained run directory. */
export const runScenario = async (opts: RunOptions): Promise<{ runId: string; dir: string }> => {
  const { target, scenario } = opts;
  const stamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 17);
  const runId = `${opts.lane}-${scenario.name}-${opts.variant}-${stamp}-${Math.random()
    .toString(16)
    .slice(2, 6)}`.toLowerCase();
  const dir = path.join(opts.runsDir, runId);
  fs.mkdirSync(dir, { recursive: true });
  const log = (msg: string) => {
    const line = `${new Date().toISOString()} ${msg}`;
    fs.appendFileSync(path.join(dir, 'driver.log'), line + '\n');
    // eslint-disable-next-line no-console
    console.log(line);
  };

  const collector = new Collector(target, path.join(dir, 'samples.ndjson'));
  const ctx: ActionContext = { target, runId, collector, log };

  const health = await kbn<Record<string, any>>(target, 'GET', '/api/task_manager/_health').catch(
    () => ({ status: 0, body: {} as Record<string, any> })
  );
  const tmConfig = health.body?.stats?.configuration?.value ?? {};

  const manifest: RunManifest = {
    run_id: runId,
    '@timestamp': new Date().toISOString(),
    lane: opts.lane,
    hypothesis: opts.hypothesis,
    expected: opts.expected,
    variant: opts.variant,
    source_commit: git('rev-parse HEAD', opts.repoDir),
    source_dirty: git('status --porcelain', opts.repoDir).length > 0,
    baseline_commit: opts.baselineCommit,
    image_digest: opts.imageDigest,
    qaf_project_id: opts.qafProjectId,
    target: { kind: opts.targetKind, url: target.url },
    workload_params: scenario,
    utc_start: new Date().toISOString(),
    driver_version: DRIVER_VERSION,
    config_overrides: opts.configOverrides,
    tm_poll_interval_ms: tmConfig.poll_interval ?? null,
    tm_claim_strategy: tmConfig.claim_strategy ?? null,
    pods: [],
    host: {
      hostname_hash: Buffer.from(os.hostname()).toString('base64').slice(0, 8),
      loadavg_start: os.loadavg(),
      cpus: os.cpus().length,
      platform: os.platform(),
      node: process.version,
    },
    phases: [],
    notes: [],
    invalid_reasons: [],
    status: 'running',
  };
  const writeManifest = () =>
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  writeManifest();
  log(`run ${runId} start target=${opts.targetKind} poll_interval=${manifest.tm_poll_interval_ms}`);

  // Drain any pre-existing buffered samples so the run only contains its own window.
  for (let i = 0; i < Math.max(3, opts.expectedPods * 4); i++) {
    const res = await collector.pullOnce();
    if (res)
      collector.cursors[res.boot_id] = { main: res.main.last_seq, worker: res.worker.last_seq };
  }
  fs.writeFileSync(path.join(dir, 'samples.ndjson'), '');
  collector.count = 0;

  // Contract tracer baseline (cumulative since boot); the run stores the delta.
  const edgesAtStart = await kbn<{ enabled: boolean; edges: Array<Record<string, any>> }>(
    target,
    'GET',
    `${API}/edges`
  ).catch(() => undefined);
  const edgeKey = (e: Record<string, any>) =>
    [e.direction, e.caller, e.callee, e.lifecycle, e.path].join('|');
  const startEdges = new Map((edgesAtStart?.body?.edges ?? []).map((e) => [edgeKey(e), e]));

  // Start in-pod probes; repeat so the load balancer reaches every pod.
  const probeBodies: Array<Record<string, unknown>> = [];
  for (let i = 0; i < Math.max(2, opts.expectedPods * 4); i++) {
    const res = await kbn<Record<string, unknown>>(target, 'POST', `${API}/probe/_start`, {
      rps: scenario.probe.rps,
      path: scenario.probe.path,
      ...(scenario.probe.timeoutMs ? { timeoutMs: scenario.probe.timeoutMs } : {}),
      runId,
    });
    probeBodies.push({ status: res.status, ...res.body });
    if (scenario.superviseKillAfterMs) {
      await kbn(target, 'POST', `${API}/supervise`, {
        killAfterMs: scenario.superviseKillAfterMs,
        signal: 'SIGKILL',
      });
    }
  }
  const totalS =
    scenario.phases.reduce(
      (s, p) => s + p.durationS + (p.offender ? p.offender.doseMs / 1000 + 10 : 0),
      0
    ) + 120;
  await kbn(target, 'POST', `${API}/ticks/_start`, {
    intervalMs: scenario.ticks.intervalMs,
    durationS: Math.ceil(totalS) + 3600,
    seriesId: runId.slice(-40),
  });

  const laptop = new LaptopProbe(
    target,
    scenario.laptopProbe.rps,
    scenario.laptopProbe.path,
    collector
  );
  laptop.start();
  const loop = collector.loop(1000);

  try {
    for (const phase of scenario.phases) {
      const start = now();
      log(
        `phase ${phase.name} start ${
          phase.offender ? JSON.stringify(phase.offender) : phase.action ?? ''
        }`
      );
      const result = await runPhase(phase, opts, ctx);
      const end = now();
      manifest.phases.push({
        name: phase.name,
        start,
        end,
        action: phase.action,
        completed_at: result?.completed_at,
        offender_result: result,
      });
      writeManifest();
    }
    manifest.status = 'complete';
  } catch (e) {
    manifest.status = 'failed';
    manifest.invalid_reasons.push(`driver error: ${String(e)}`);
    manifest.notes.push(`driver error: ${String(e)}`);
    log(`ERROR ${String(e)}`);
  } finally {
    laptop.stop();
    await kbn(target, 'POST', `${API}/ticks/_stop`).catch(() => undefined);
    for (let i = 0; i < Math.max(2, opts.expectedPods * 4); i++) {
      await kbn(target, 'POST', `${API}/probe/_stop`).catch(() => undefined);
    }
    collector.stop();
    await loop;
    // Final drains (multiple, to reach every pod behind the load balancer).
    for (let i = 0; i < Math.max(3, opts.expectedPods * 6); i++) await collector.pullOnce();
    await sleep(2000);
    // Pushed samples from the project ES: covers unroutable pods (serverless background-tasks)
    // and pods killed before their last pull. Deduplicated against pulled samples.
    let added = 0;
    const exportFrom = new Date(manifest.utc_start).getTime() - 5000;
    const exportTo = Date.now() + 5000;
    await sleep(Math.max(3000, 0));
    let searchAfter: unknown[] | null = null;
    for (let page = 0; page < 500; page++) {
      interface EsPage {
        hits: Array<Record<string, unknown>>;
        last_sort: unknown[] | null;
      }
      const res: { status: number; body: EsPage } | undefined = await kbn<EsPage>(
        target,
        'POST',
        `${API}/samples_es`,
        { from: exportFrom, to: exportTo, size: 5000, ...(searchAfter ? { searchAfter } : {}) }
      ).catch(() => undefined);
      if (!res || res.status !== 200 || !res.body.hits.length) break;
      for (const doc of res.body.hits) {
        const key = `${doc.boot_id}|${doc.thread}|${doc.seq}`;
        if (collector.seen.has(key)) continue;
        const { '@timestamp': _ts, ...rest } = doc;
        collector.write({ ...rest, via: 'es_push' });
        added++;
      }
      searchAfter = res.body.last_sort;
      if (!searchAfter) break;
    }
    manifest.notes.push(`es_push_export_added=${added}`);
    // Tick audit: every scheduled tick (denominator) with its TM status. Ticks scheduled beyond
    // the stop time were removed by ticks/_stop and are excluded; pending ticks are not "lost".
    const stopAt = now();
    const scheduled = collector.tickScheduled.flatMap((t) =>
      ((t.ids as string[]) ?? []).map((id, i) => ({
        id,
        runAt: (t.run_ats as number[])[i],
        series_id: t.series_id,
      }))
    );
    const auditable = scheduled.filter((t) => t.runAt <= stopAt - 1000);
    const statuses: Record<string, string> = {};
    for (let i = 0; i < auditable.length; i += 1000) {
      const res = await taskStatus(
        target,
        auditable.slice(i, i + 1000).map((t) => t.id)
      ).catch((e) => {
        manifest.invalid_reasons.push(`tick audit failed: ${String(e)}`);
        return { statuses: {} as Record<string, string> };
      });
      Object.assign(statuses, res.statuses);
    }
    for (const t of auditable) {
      collector.write({
        source: 'tick_audit',
        thread: 'driver',
        pod: 'driver',
        ts: t.runAt,
        id: t.id,
        index: Number(t.id.split('-').at(-1)),
        series_id: t.series_id,
        status: statuses[t.id] ?? 'unknown',
      });
    }
    manifest.notes.push(`tick_audit scheduled=${scheduled.length} auditable=${auditable.length}`);
    await collector.close();
    const info = await kbn<Record<string, unknown>>(target, 'GET', `${API}/info`).catch(() => ({
      status: 0,
      body: {},
    }));
    const edges = await kbn<{
      enabled: boolean;
      wrap_errors: number;
      edges: Array<Record<string, unknown>>;
    }>(target, 'GET', `${API}/edges`).catch(() => undefined);
    if (edges?.body?.enabled) {
      fs.writeFileSync(
        path.join(dir, 'edges.ndjson'),
        edges.body.edges
          .map((e) => {
            const s = startEdges.get(edgeKey(e)) as Record<string, number> | undefined;
            const delta = {
              ...e,
              calls: (e.calls as number) - (s?.calls ?? 0),
              bytes_in: (e.bytes_in as number) - (s?.bytes_in ?? 0),
              bytes_out: (e.bytes_out as number) - (s?.bytes_out ?? 0),
              cumulative_calls: e.calls,
            };
            return delta;
          })
          .filter((e) => e.calls > 0)
          .map((e) => JSON.stringify(e))
          .join('\n') + '\n'
      );
      manifest.notes.push(
        `tracer: edges=${edges.body.edges.length} wrap_errors=${edges.body.wrap_errors}`
      );
    }
    manifest.pods = [...collector.pods.values()].map((p) => ({ ...p }));
    manifest.notes.push(
      `probe_start_responses=${JSON.stringify(
        probeBodies.map((b) => ({
          pod: b.pod,
          boot_id: b.boot_id,
          has_auth: b.has_auth,
          status: b.status,
        }))
      )}`
    );
    manifest.config_overrides = {
      ...manifest.config_overrides,
      research_plugin_config: (info.body as Record<string, unknown>).config,
    };
    (manifest.host as Record<string, unknown>).loadavg_end = os.loadavg();
    (manifest as unknown as Record<string, unknown>).kibana_info = info.body;
    (manifest as unknown as Record<string, unknown>).collector = {
      samples: collector.count,
      pull_errors: collector.pullErrors,
    };
    manifest.utc_end = new Date().toISOString();
    writeManifest();
    log(
      `run ${runId} ${manifest.status} samples=${collector.count} pull_errors=${collector.pullErrors} pods=${collector.pods.size}`
    );
  }
  return { runId, dir };
};
