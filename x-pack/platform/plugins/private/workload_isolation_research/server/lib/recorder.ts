/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import diagnosticsChannel from 'diagnostics_channel';
import { hostname } from 'os';
import path from 'path';
import type { IntervalHistogram } from 'perf_hooks';
import { PerformanceObserver, monitorEventLoopDelay, performance } from 'perf_hooks';
import { Worker } from 'worker_threads';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { WorkloadIsolationResearchConfig } from '../config';
import { epochNow } from './clock';
import { RingBuffer } from './ring_buffer';

/** diagnostics_channel name published by the research patch in Task Manager. */
export const TM_RESEARCH_CHANNEL = 'kbn:research:task_manager';

export type Sample = Record<string, unknown> & { source: string; ts: number };

/** Versioned: v1 on QAF got `kind` dynamically mapped as long (GC kind) and poisoned pushes. */
export const PUSH_INDEX = '.kibana-research-samples-v3';

interface WorkerSamplesReply {
  entries: Array<{ seq: number; item: Sample }>;
  dropped: number;
  lastSeq: number;
  probing: boolean;
  inFlight: number;
}

export interface ProbeStartParams {
  url: string;
  headers: Record<string, string>;
  rps: number;
  timeoutMs: number;
  maxInFlight: number;
  insecure: boolean;
  runId?: string;
}

/** Main-isolate side of the harness: heartbeat, process/GC/TM samples and worker control. */
export class Recorder {
  public readonly pod = hostname();
  public readonly bootId = randomUUID();
  private readonly ring: RingBuffer<Sample>;
  private readonly sab = new SharedArrayBuffer(8);
  private readonly heartbeat = new Float64Array(this.sab);
  private readonly countSab = new SharedArrayBuffer(4);
  private readonly hbCount = new Int32Array(this.countSab);
  // Push accounting (exposed via /info and periodic push_stats samples).
  // Prefixed names: push_stats samples share the push index with `tm` samples, where `ok` is a
  // boolean, so un-prefixed counters were themselves rejected as poison docs.
  public readonly pushStats = {
    push_ok: 0,
    push_duplicate: 0,
    push_dropped: 0,
    push_ring_overflow: 0,
    push_batches: 0,
    push_failed_batches: 0,
  };
  private worker?: Worker;
  private timers: NodeJS.Timeout[] = [];
  private gcObserver?: PerformanceObserver;
  private eld?: IntervalHistogram;
  private reqId = 0;
  private readonly pending = new Map<number, (msg: unknown) => void>();
  private readonly onTmEvent = (message: unknown) => {
    this.push({ source: 'tm', ts: epochNow(), ...(message as Record<string, unknown>) });
  };

  constructor(
    private readonly config: WorkloadIsolationResearchConfig,
    private readonly logger: Logger
  ) {
    this.ring = new RingBuffer<Sample>(config.ringCapacity);
  }

  /** Node roles of this process (e.g. 'ui,background_tasks'), stamped on coverage samples. */
  public roles = 'unknown';

  public push(sample: Sample): void {
    this.ring.push(sample);
  }

  public start(): void {
    this.heartbeat[0] = epochNow();
    this.startMainGapAccounting();

    this.worker = new Worker(path.join(__dirname, 'research_worker.js'), {
      workerData: {
        sab: this.sab,
        countSab: this.countSab,
        samplerIntervalMs: this.config.samplerIntervalMs,
        stallThresholdMs: this.config.stallThresholdMs,
        ringCapacity: this.config.ringCapacity,
      },
      name: 'workload-isolation-research',
    });
    this.worker.unref();
    this.worker.on('message', (msg: { reqId?: number }) => {
      if (msg.reqId === undefined) return;
      const resolve = this.pending.get(msg.reqId);
      this.pending.delete(msg.reqId);
      resolve?.(msg);
    });
    this.worker.on('error', (err) => this.logger.error(`research worker error: ${err.message}`));

    this.startProcSampler();

    if (this.config.collectGc) this.startGcObserver();

    diagnosticsChannel.subscribe(TM_RESEARCH_CHANNEL, this.onTmEvent);
    this.logger.info(
      `workload isolation research recorder started pod=${this.pod} boot=${this.bootId}`
    );
  }

  private startGcObserver(): void {
    this.gcObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const detail = (entry as unknown as { detail?: { kind?: number; flags?: number } }).detail;
        this.push({
          source: 'gc',
          ts: performance.timeOrigin + entry.startTime,
          duration_ms: entry.duration,
          gc_kind: detail?.kind,
          gc_flags: detail?.flags,
        });
      }
    });
    this.gcObserver.observe({ entryTypes: ['gc'] });
  }

  /**
   * Main-side heartbeat-gap accounting (the post-hoc slice proxy). Each heartbeat measures the
   * time since the previous one on main's own monotonic clock, so worker descheduling cannot
   * inflate it. A gap ≈ uninterrupted main-thread time + timer granularity: it is a proxy for
   * the longest uninterrupted slice, calibrated against Tier A known doses (Track 0 report).
   */
  private startMainGapAccounting(): void {
    const interval = this.config.heartbeatIntervalMs;
    let last = performance.now();
    let windowStart = epochNow();
    let windowMax = 0;
    let ticks = 0;
    this.timers.push(
      setInterval(() => {
        const nowMono = performance.now();
        const now = performance.timeOrigin + nowMono;
        const gap = nowMono - last;
        last = nowMono;
        this.heartbeat[0] = now;
        Atomics.add(this.hbCount, 0, 1);
        ticks++;
        if (gap > windowMax) windowMax = gap;
        if (gap > this.config.stallThresholdMs) {
          this.push({ source: 'main_gap', ts: now - gap, start: now - gap, end: now, gap_ms: gap });
        }
        if (now - windowStart >= 1000) {
          this.push({
            source: 'main_gap_window',
            ts: windowStart,
            end: now,
            max_gap_ms: windowMax,
            ticks,
            expected_ticks: Math.floor((now - windowStart) / interval),
            roles: this.roles,
          });
          windowStart = now;
          windowMax = 0;
          ticks = 0;
        }
      }, interval)
    );
  }

  private startProcSampler(): void {
    this.eld = monitorEventLoopDelay({ resolution: 10 });
    this.eld.enable();
    let lastElu = performance.eventLoopUtilization();
    let lastCpu = process.cpuUsage();
    let lastThreadCpu = process.threadCpuUsage();
    let lastTs = epochNow();
    this.timers.push(
      setInterval(() => {
        const now = epochNow();
        const elu = performance.eventLoopUtilization(lastElu);
        lastElu = performance.eventLoopUtilization();
        const cpu = process.cpuUsage(lastCpu);
        lastCpu = process.cpuUsage();
        const threadCpu = process.threadCpuUsage(lastThreadCpu);
        lastThreadCpu = process.threadCpuUsage();
        const mem = process.memoryUsage();
        const eld = this.eld as IntervalHistogram;
        this.push({
          source: 'proc',
          // Timestamped at acquisition: heap/RSS are point samples (sampled lower bounds of
          // the window's peak), CPU/ELU/ELD are deltas over [window_start, ts].
          ts: now,
          window_start: lastTs,
          rss: mem.rss,
          heap_used: mem.heapUsed,
          heap_total: mem.heapTotal,
          external: mem.external,
          array_buffers: mem.arrayBuffers,
          elu: elu.utilization,
          process_cpu_ms: (cpu.user + cpu.system) / 1000,
          main_thread_cpu_ms: (threadCpu.user + threadCpu.system) / 1000,
          eld_p50_ms: eld.percentile(50) / 1e6,
          eld_p99_ms: eld.percentile(99) / 1e6,
          eld_max_ms: eld.max / 1e6,
        });
        eld.reset();
        lastTs = now;
      }, 1000)
    );
  }

  private request<T>(msg: Record<string, unknown>): Promise<T> {
    const reqId = ++this.reqId;
    return new Promise<T>((resolve, reject) => {
      if (!this.worker) return reject(new Error('research worker not started'));
      const timer = setTimeout(() => {
        this.pending.delete(reqId);
        reject(new Error(`research worker timeout for ${String(msg.type)}`));
      }, 10000);
      this.pending.set(reqId, (reply) => {
        clearTimeout(timer);
        resolve(reply as T);
      });
      this.worker.postMessage({ ...msg, reqId });
    });
  }

  public startProbe(params: ProbeStartParams): Promise<unknown> {
    return this.request({ type: 'probe:start', ...params });
  }

  public stopProbe(): Promise<unknown> {
    return this.request({ type: 'probe:stop' });
  }

  public supervise(killAfterMs: number, signal: string): Promise<unknown> {
    return this.request({ type: 'supervise', killAfterMs, signal });
  }

  public async samples(mainSince: number, workerSince: number, limit: number) {
    const main = this.ring.since(mainSince, limit);
    const worker = await this.request<WorkerSamplesReply>({
      type: 'samples',
      since: workerSince,
      limit,
    });
    return {
      pod: this.pod,
      boot_id: this.bootId,
      pid: process.pid,
      main: { samples: main.entries, dropped: main.dropped, last_seq: this.ring.lastSeq },
      worker: {
        samples: worker.entries,
        dropped: worker.dropped,
        last_seq: worker.lastSeq,
        probing: worker.probing,
        in_flight: worker.inFlight,
      },
    };
  }

  private pushed = { main: 0, worker: 0 };
  private pushing = false;
  private indexReady = false;
  private lastPushError = 0;
  private lastStatsPush = 0;

  /**
   * Periodically bulk-indexes new samples into the project's ES (internal user). Idempotent:
   * deterministic ids (boot/thread/seq) + `create`, so retries never duplicate and 409s count
   * as already-present. Per-item accounting: rejected docs are counted as dropped and the cursor
   * always advances past them (a poison doc can never stall the stream). Ring overflow before a
   * push is counted too. Any drop makes a run invalid (scorecard coverage check).
   */
  public startPush(getEs: () => Promise<ElasticsearchClient>): void {
    if (!this.config.pushToEs) return;
    const push = async () => {
      if (this.pushing) return;
      this.pushing = true;
      try {
        const es = await getEs();
        if (!this.indexReady) {
          await es.indices
            .create({
              index: PUSH_INDEX,
              settings: { 'index.hidden': true },
              mappings: {
                dynamic: true,
                dynamic_templates: [
                  {
                    numbers_as_double: { match_mapping_type: 'long', mapping: { type: 'double' } },
                  },
                  { doubles: { match_mapping_type: 'double', mapping: { type: 'double' } } },
                ],
                properties: {
                  '@timestamp': { type: 'date' },
                  ts: { type: 'double' },
                  seq: { type: 'long' },
                  pod: { type: 'keyword' },
                  boot_id: { type: 'keyword' },
                  thread: { type: 'keyword' },
                  source: { type: 'keyword' },
                  kind: { type: 'keyword' },
                  mode: { type: 'keyword' },
                  tm_event: { type: 'keyword' },
                  task_type: { type: 'keyword' },
                  task_id: { type: 'keyword' },
                  series_id: { type: 'keyword' },
                  error: { type: 'keyword' },
                  error_code: { type: 'keyword' },
                  detail: { type: 'flattened' },
                  stats: { type: 'flattened' },
                },
              },
            })
            .catch((e) => {
              if (!String(e.message).includes('resource_already_exists')) throw e;
            });
          this.indexReady = true;
        }

        const data = await this.samples(this.pushed.main, this.pushed.worker, 5000);
        this.pushStats.push_ring_overflow += data.main.dropped + data.worker.dropped;
        const docs = [
          ...data.main.samples.map(({ seq, item }) => ({ ...item, thread: 'main', seq })),
          ...data.worker.samples.map(({ seq, item }) => ({ ...item, thread: 'worker', seq })),
        ];
        if (docs.length) {
          this.pushStats.push_batches++;
          const operations = docs.flatMap((d) => [
            { create: { _index: PUSH_INDEX, _id: `${this.bootId}:${d.thread}:${d.seq}` } },
            { ...d, pod: this.pod, boot_id: this.bootId, '@timestamp': Math.round(d.ts as number) },
          ]);
          const res = await es.bulk({ operations, refresh: false });
          let firstError: unknown;
          for (const item of res.items) {
            const status = item.create?.status ?? 0;
            if (status >= 200 && status < 300) this.pushStats.push_ok++;
            else if (status === 409) this.pushStats.push_duplicate++;
            else {
              this.pushStats.push_dropped++;
              firstError = firstError ?? item.create?.error;
            }
          }
          if (firstError && Date.now() - this.lastPushError > 60000) {
            this.lastPushError = Date.now();
            this.logger.warn(`research sample push dropped docs: ${JSON.stringify(firstError)}`);
          }
        }
        // Advance past everything attempted (successes, duplicates and counted drops).
        const lastMain = data.main.samples.at(-1)?.seq;
        const lastWorker = data.worker.samples.at(-1)?.seq;
        if (lastMain) this.pushed.main = lastMain;
        if (lastWorker) this.pushed.worker = lastWorker;
        // Acknowledged accounting watermark: emitted after every batch that had docs (or every
        // 10 s), so a push_stats sample newer than a run's end proves that all samples of that
        // run were acknowledged (or counted as dropped) before it.
        if (docs.length || Date.now() - this.lastStatsPush > 10000) {
          this.lastStatsPush = Date.now();
          this.push({
            source: 'push_stats',
            ts: epochNow(),
            roles: this.roles,
            acked_main_seq: this.pushed.main,
            acked_worker_seq: this.pushed.worker,
            ...this.pushStats,
          });
        }
      } catch (e) {
        // Whole-request failure (network, auth): cursors not advanced; retried next interval
        // with the same deterministic ids, so no duplicates.
        this.pushStats.push_failed_batches++;
        if (Date.now() - this.lastPushError > 60000) {
          this.lastPushError = Date.now();
          this.logger.warn(`research sample push failed: ${e.message}`);
        }
      } finally {
        this.pushing = false;
      }
    };
    this.timers.push(setInterval(() => void push(), this.config.pushIntervalMs));
  }

  public async stop(): Promise<void> {
    diagnosticsChannel.unsubscribe(TM_RESEARCH_CHANNEL, this.onTmEvent);
    this.timers.forEach((t) => clearInterval(t));
    this.timers = [];
    this.gcObserver?.disconnect();
    this.eld?.disable();
    await this.worker?.terminate();
  }
}
