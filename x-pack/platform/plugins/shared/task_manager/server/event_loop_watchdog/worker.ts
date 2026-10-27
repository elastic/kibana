/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Runs in the watchdog worker thread. Detects blocks from the main thread's heartbeat and, once a
 * block is long enough, samples which task the main thread is running through an inspector
 * session: `Runtime.evaluate` commands run on the main thread through V8 interrupts, so they land
 * inside synchronous JavaScript (loops, regexes) while it is blocked. The session exists only for
 * the duration of a block. When the block ends the worker partitions its timeline, decides whether
 * one task deserves a flag and posts a single report to the main thread.
 */

import { writeSync } from 'node:fs';
import { Session } from 'node:inspector';
import type { MessagePort } from 'node:worker_threads';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { BlockDetector, type DetectedBlock } from './block_detector';
import { partitionBlock } from './context_sampler';
import { decideFlag } from './flag_rule';
import { formatStillBlockedNotice } from './report';
import {
  CURRENT_TASK_ACCESSOR,
  DETECT_THRESHOLD_MS,
  MAX_SAMPLES_PER_BLOCK,
  POLL_INTERVAL_MS,
  SAMPLE_AFTER_MS,
  SAMPLE_INTERVAL_MS,
  monotonicUs,
  type ContextSample,
  type CurrentTaskContext,
  type EventLoopBlockReport,
  type WatchdogWorkerData,
  type WorkerToMainMessage,
} from './types';

/** The part of `node:inspector`'s `Session` used here. */
export interface InspectorSession {
  connectToMainThread(): void;
  post(
    method: string,
    params: object,
    callback: (error: Error | null, result?: object) => void
  ): void;
  disconnect(): void;
}

export interface Cadence {
  pollIntervalMs: number;
  detectThresholdMs: number;
  sampleAfterMs: number;
  sampleIntervalMs: number;
}

export const DEFAULT_CADENCE: Cadence = {
  pollIntervalMs: POLL_INTERVAL_MS,
  detectThresholdMs: DETECT_THRESHOLD_MS,
  sampleAfterMs: SAMPLE_AFTER_MS,
  sampleIntervalMs: SAMPLE_INTERVAL_MS,
};

export interface WorkerDeps {
  /** Timing of detection and sampling. Production uses the defaults; tests run faster. */
  cadence?: Cadence;
  createSession?: () => InspectorSession;
  cpuUsage?: (previous?: NodeJS.CpuUsage) => NodeJS.CpuUsage;
  /** Monotonic microseconds. */
  now?: () => number;
  /** Writes a line that must be visible while the main thread is blocked. */
  writeLine?: (line: string) => void;
}

/**
 * Evaluated on the main thread. `at` is the main thread's own clock (process-wide `hrtime`, the
 * same one the heartbeat uses), so the delay between posting and landing is measured where the
 * evaluate actually ran.
 */
export const SAMPLE_EXPRESSION = `(() => {
  const f = globalThis[Symbol.for('${String(CURRENT_TASK_ACCESSOR.description)}')];
  return {
    at: Number(process.hrtime.bigint() / 1000n),
    task: typeof f === 'function' ? f() : null,
    missing: typeof f !== 'function',
  };
})()`;

/**
 * Written straight to the stderr file descriptor: `console.error` and `process.stderr.write` in a
 * worker are routed through the main thread, which is exactly what is blocked.
 */
const writeDirectToStderr = (line: string): void => {
  try {
    writeSync(2, `[event-loop-watchdog] ${line}\n`);
  } catch {
    // best effort: reporting must never throw inside the watchdog loop
  }
};

interface BlockState {
  startUs: number;
  detectedAtUs: number;
  cpuAtDetect: NodeJS.CpuUsage;
  samples: ContextSample[];
  session?: InspectorSession;
  sessionFailed: boolean;
  inFlight: boolean;
  lastLandedUs: number;
  lastLiveReportUs: number;
}

export const runWatchdogWorker = (
  port: MessagePort,
  data: WatchdogWorkerData,
  {
    cadence = DEFAULT_CADENCE,
    createSession = () => new Session(),
    cpuUsage = (previous) => process.cpuUsage(previous),
    now = monotonicUs,
    writeLine = writeDirectToStderr,
  }: WorkerDeps = {}
): void => {
  const shared = new BigInt64Array(data.shared);
  const detector = new BlockDetector(cadence.detectThresholdMs);
  const epochOffsetUs = Math.round((performance.timeOrigin + performance.now()) * 1000) - now();
  const iso = (us: number) => new Date((us + epochOffsetUs) / 1000).toISOString();
  const post = (message: WorkerToMainMessage) => port.postMessage(message);
  const reportError = (context: string, error: unknown) =>
    post({
      type: 'worker-error',
      message: `${context}: ${error instanceof Error ? error.message : String(error)}`,
    });

  let state: BlockState | undefined;

  const latestTask = (current: BlockState): CurrentTaskContext | null => {
    for (let i = current.samples.length - 1; i >= 0; i--) {
      if (current.samples[i].task) return current.samples[i].task;
    }
    return null;
  };

  const postSample = (current: BlockState) => {
    const { session } = current;
    if (!session) return;
    const sample: ContextSample = { postedAtUs: now(), task: null, missing: false };
    current.samples.push(sample);
    current.inFlight = true;
    try {
      session.post(
        'Runtime.evaluate',
        { expression: SAMPLE_EXPRESSION, returnByValue: true, silent: true },
        (error, result) => {
          // The block ended (and the session was disconnected) before this reply: ignore it.
          if (state !== current) return;
          const value = (
            result as
              | { result?: { value?: Record<string, unknown> }; exceptionDetails?: unknown }
              | undefined
          )?.result?.value;
          if (error || !value || typeof value.at !== 'number') {
            sample.landedAtUs = now();
            sample.missing = true;
          } else {
            sample.landedAtUs = value.at;
            sample.task = (value.task as CurrentTaskContext | null) ?? null;
            sample.missing = value.missing === true;
          }
          current.lastLandedUs = sample.landedAtUs;
          current.inFlight = false;
        }
      );
    } catch (error) {
      current.sessionFailed = true;
      current.inFlight = false;
      current.samples.pop();
      reportError('Runtime.evaluate failed', error);
    }
  };

  const openSession = (current: BlockState) => {
    let session: InspectorSession | undefined;
    try {
      session = createSession();
      session.connectToMainThread();
      current.session = session;
    } catch (error) {
      current.sessionFailed = true;
      reportError('connectToMainThread failed', error);
      try {
        session?.disconnect();
      } catch {
        // never connected
      }
    }
  };

  const onBlockEnded = (block: DetectedBlock, nowUs: number) => {
    const current = state;
    state = undefined;
    // `monotonicUs()` is an integer: rounding undoes the millisecond float round trip.
    const startUs = Math.round(block.startedAt * 1000);
    const endUs = Math.round(block.endedAt * 1000);
    const wallUs = Math.max(1, nowUs - (current?.detectedAtUs ?? nowUs));
    const cpu = current ? cpuUsage(current.cpuAtDetect) : { user: 0, system: 0 };
    // Process-wide CPU over the wall time since detection: can exceed 1 with other threads busy.
    const cpuRatio = current ? Math.round(((cpu.user + cpu.system) / wallUs) * 100) / 100 : 0;

    const attribution = partitionBlock(startUs, endUs, current?.samples ?? [], {
      sampleIntervalMs: cadence.sampleIntervalMs,
      pollIntervalMs: cadence.pollIntervalMs,
    });
    const startedAt = iso(startUs);
    const endedAt = iso(endUs);
    const flag = decideFlag(attribution, cpuRatio, startedAt, endedAt, {
      flagThresholdMs: data.flagThresholdMs,
      minCpuRatio: data.minCpuRatio,
      sampleIntervalMs: cadence.sampleIntervalMs,
    });
    const report: EventLoopBlockReport = {
      blockedMs: block.blockedMs,
      startedAtUs: startUs,
      endedAtUs: endUs,
      startedAt,
      endedAt,
      attribution,
      cpuRatio,
      flag,
      reportable: block.report,
      suppressedBlocks: block.suppressedBlocks,
    };
    post({ type: 'block', report });

    try {
      current?.session?.disconnect();
    } catch {
      // already disconnected
    }
  };

  let announcedReady = false;
  const poll = () => {
    if (!announcedReady) {
      announcedReady = true;
      post({ type: 'ready' });
    }
    const nowUs = now();
    const nowMs = nowUs / 1000;
    const block = detector.poll(nowMs, Number(Atomics.load(shared, 0)) / 1000);
    if (block) onBlockEnded(block, nowUs);

    const { blockedSince } = detector;
    if (blockedSince === undefined) return;

    if (!state) {
      state = {
        startUs: blockedSince * 1000,
        detectedAtUs: nowUs,
        cpuAtDetect: cpuUsage(),
        samples: [],
        sessionFailed: false,
        inFlight: false,
        lastLandedUs: 0,
        lastLiveReportUs: nowUs,
      };
    }
    const current = state;

    if (
      !current.session &&
      !current.sessionFailed &&
      nowMs - blockedSince >= cadence.sampleAfterMs
    ) {
      openSession(current);
      if (current.session) postSample(current);
    } else if (
      current.session &&
      !current.sessionFailed &&
      !current.inFlight &&
      current.samples.length < MAX_SAMPLES_PER_BLOCK &&
      nowUs - current.lastLandedUs >= cadence.sampleIntervalMs * 1000
    ) {
      postSample(current);
    }

    if (nowUs - current.lastLiveReportUs >= data.liveReportIntervalMs * 1000) {
      current.lastLiveReportUs = nowUs;
      writeLine(formatStillBlockedNotice(nowMs - blockedSince, latestTask(current)));
    }
  };

  // Referenced on purpose: nothing is ever posted to this worker, so this timer is what keeps it
  // alive. The main thread unrefs the Worker handle itself.
  const timer = setInterval(poll, cadence.pollIntervalMs);
  port.on('close', () => {
    clearInterval(timer);
    try {
      state?.session?.disconnect();
    } catch {
      // already disconnected
    }
  });
};

if (!isMainThread && parentPort) {
  runWatchdogWorker(parentPort, workerData as WatchdogWorkerData);
}
