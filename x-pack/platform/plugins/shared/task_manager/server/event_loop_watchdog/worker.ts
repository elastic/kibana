/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Runs inside a dedicated worker thread. Detects blocks of the *main* thread's event loop
 * by watching a heartbeat timestamp the main thread writes to a `SharedArrayBuffer`, then
 * captures a CPU profile of the main thread (via `Session.connectToMainThread()`) covering
 * the block, and posts a report back naming the tasks that were in flight when it started.
 *
 * Deliberately has no knowledge of async_hooks or task internals: it only reads the
 * heartbeat and the run-start/run-end notifications the main thread sends it, so it cannot
 * miss a block regardless of what kind of work (JS, native, GC, syscall) caused it.
 */

import { isMainThread, parentPort, workerData, threadId } from 'node:worker_threads';
import { Session } from 'node:inspector';
import { writeSync } from 'node:fs';
import type {
  MainToWorkerMessage,
  StillBlockedNotice,
  WorkerData,
  WorkerToMainMessage,
} from './types';
import type { RunRegistryEntry } from './report';
import {
  dedupKeyForSuspects,
  formatStillBlockedNotice,
  isLikelyUnsampled,
  ReportDeduper,
  snapshotSuspects,
  summarizeProfile,
} from './report';
import type { CpuProfile } from './report';

const STDERR_FD = 2;

/**
 * Writes directly to the process's stderr file descriptor rather than `console.error` or
 * `process.stderr.write`, both of which route worker-thread output through the main
 * thread and would never appear while the main thread's event loop is blocked - exactly
 * the case this exists to report on.
 */
const writeDirectToStderr = (line: string): void => {
  try {
    writeSync(STDERR_FD, `[event-loop-watchdog] ${line}\n`);
  } catch {
    // best-effort: never let reporting itself throw inside the watchdog loop.
  }
};

if (!isMainThread && parentPort) {
  runWatchdogWorker(parentPort, workerData as WorkerData);
}

function runWatchdogWorker(
  port: NonNullable<typeof parentPort>,
  { sharedHeartbeatBuffer, opts }: WorkerData
): void {
  const heartbeat = new BigInt64Array(sharedHeartbeatBuffer);
  const registry = new Map<string, RunRegistryEntry>();
  const deduper = new ReportDeduper(opts.dedupWindowMs);

  const session = new Session();

  let blockStartedAt: number | undefined;
  let profiling = false;
  let lastLiveReportAt = 0;

  const post = (message: WorkerToMainMessage): void => port.postMessage(message);

  const reportWorkerError = (context: string, error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error);
    post({ type: 'worker-error', message: `${context}: ${message}` });
  };

  try {
    session.connectToMainThread();
  } catch (error) {
    reportWorkerError('connectToMainThread failed', error);
  }

  port.on('message', (message: MainToWorkerMessage) => {
    if (message.type === 'run-start') {
      registry.set(message.taskId, {
        taskId: message.taskId,
        taskType: message.taskType,
        startedAt: message.startedAt,
      });
    } else if (message.type === 'run-end') {
      registry.delete(message.taskId);
    }
  });

  const startProfiling = (): void => {
    profiling = true;
    session.post('Profiler.enable', (enableErr) => {
      if (enableErr) {
        reportWorkerError('Profiler.enable failed', enableErr);
        return;
      }
      session.post('Profiler.start', (startErr) => {
        if (startErr) reportWorkerError('Profiler.start failed', startErr);
      });
    });
  };

  const stopProfilingAndReport = (blockedMs: number, endedAt: number): void => {
    const startedAt = blockStartedAt ?? endedAt - blockedMs;
    session.post('Profiler.stop', (stopErr, result) => {
      profiling = false;
      if (stopErr || !result) {
        reportWorkerError('Profiler.stop failed', stopErr ?? new Error('no profile returned'));
        return;
      }

      const suspects = snapshotSuspects(registry, startedAt);
      const { topFrames, gcDominant, sampledCoverage } = summarizeProfile(
        result.profile as CpuProfile
      );
      const likelyUnsampled = isLikelyUnsampled(sampledCoverage);

      const dedupKey = dedupKeyForSuspects(suspects);
      const { action, suppressedCount } = deduper.check(dedupKey, endedAt);
      if (action === 'suppress') return;

      post({
        type: 'report',
        report: {
          blockedMs,
          startedAt,
          endedAt,
          suspects,
          topFrames,
          gcDominant,
          likelyUnsampled,
          sampledCoverage,
          suppressedCount,
        },
      });
    });
  };

  const checkHeartbeat = (): void => {
    const now = Date.now();
    const lastHeartbeatMs = Number(Atomics.load(heartbeat, 0));
    const age = now - lastHeartbeatMs;

    if (age >= opts.thresholdMs) {
      if (blockStartedAt === undefined) {
        // Block just started: `age` also covers our own poll latency, so anchor on the
        // heartbeat's own timestamp for the most accurate start time.
        blockStartedAt = lastHeartbeatMs;
        lastLiveReportAt = now;
        if (!profiling) startProfiling();
        return;
      }

      // Still blocked: emit a live notice periodically so a wedged/infinite loop is never
      // silently unreported, then keep waiting for the heartbeat to resume.
      if (now - lastLiveReportAt >= opts.liveReportIntervalMs) {
        lastLiveReportAt = now;
        const notice: StillBlockedNotice = {
          elapsedMs: now - blockStartedAt,
          suspects: snapshotSuspects(registry, blockStartedAt),
        };
        writeDirectToStderr(formatStillBlockedNotice(notice));
      }
      return;
    }

    if (blockStartedAt !== undefined) {
      // Heartbeat resumed: the block ended when the main thread last stamped, which is
      // `lastHeartbeatMs`+one heartbeat interval ago at most; use `now` as a safe upper bound.
      const blockedMs = now - blockStartedAt;
      const endedAt = now;
      blockStartedAt = undefined;
      if (profiling) {
        stopProfilingAndReport(blockedMs, endedAt);
      }
    }
  };

  const timer = setInterval(checkHeartbeat, opts.pollIntervalMs);
  timer.unref?.();

  port.on('close', () => {
    clearInterval(timer);
    session.disconnect();
  });

  process.on('uncaughtException', (error) => {
    reportWorkerError(`uncaught exception in watchdog worker (thread ${threadId})`, error);
  });
}
