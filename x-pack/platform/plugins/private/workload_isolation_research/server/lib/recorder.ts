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
import type { Logger } from '@kbn/core/server';
import type { WorkloadIsolationResearchConfig } from '../config';
import { epochNow } from './clock';
import { RingBuffer } from './ring_buffer';

/** diagnostics_channel name published by the research patch in Task Manager. */
export const TM_RESEARCH_CHANNEL = 'kbn:research:task_manager';

export type Sample = Record<string, unknown> & { source: string; ts: number };

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

  public push(sample: Sample): void {
    this.ring.push(sample);
  }

  public start(): void {
    this.heartbeat[0] = epochNow();
    this.timers.push(
      setInterval(() => {
        this.heartbeat[0] = epochNow();
      }, this.config.heartbeatIntervalMs)
    );

    this.worker = new Worker(path.join(__dirname, 'research_worker.js'), {
      workerData: {
        sab: this.sab,
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

    this.gcObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const detail = (entry as unknown as { detail?: { kind?: number; flags?: number } }).detail;
        this.push({
          source: 'gc',
          ts: performance.timeOrigin + entry.startTime,
          duration_ms: entry.duration,
          kind: detail?.kind,
          flags: detail?.flags,
        });
      }
    });
    this.gcObserver.observe({ entryTypes: ['gc'] });

    diagnosticsChannel.subscribe(TM_RESEARCH_CHANNEL, this.onTmEvent);
    this.logger.info(
      `workload isolation research recorder started pod=${this.pod} boot=${this.bootId}`
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
          ts: lastTs,
          end: now,
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

  public async stop(): Promise<void> {
    diagnosticsChannel.unsubscribe(TM_RESEARCH_CHANNEL, this.onTmEvent);
    this.timers.forEach((t) => clearInterval(t));
    this.timers = [];
    this.gcObserver?.disconnect();
    this.eld?.disable();
    await this.worker?.terminate();
  }
}
