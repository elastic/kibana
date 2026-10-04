/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BlockReport, ProfileFrame, StillBlockedNotice, TaskSuspect } from './types';

/** In-flight task runs tracked by the worker, keyed by task id. */
export interface RunRegistryEntry {
  taskId: string;
  taskType: string;
  startedAt: number;
}

const GC_FUNCTION_NAME = '(garbage collector)';
const TOP_FRAME_COUNT = 5;
/** Below this fraction of block time covered by samples, treat CPU attribution as unreliable. */
const UNSAMPLED_COVERAGE_THRESHOLD = 0.5;

/** Snapshots the currently in-flight runs as suspects for a block that started at `blockStartedAt`. */
export const snapshotSuspects = (
  registry: ReadonlyMap<string, RunRegistryEntry>,
  blockStartedAt: number
): TaskSuspect[] =>
  [...registry.values()]
    .map(
      (entry): TaskSuspect => ({
        taskId: entry.taskId,
        taskType: entry.taskType,
        inFlightMs: Math.max(0, blockStartedAt - entry.startedAt),
      })
    )
    .sort((a, b) => b.inFlightMs - a.inFlightMs);

/** A minimal shape of a V8 `Profiler.stop` result, enough to compute self time per frame. */
export interface CpuProfile {
  startTime: number;
  endTime: number;
  nodes: Array<{
    id: number;
    callFrame: { functionName: string; url: string };
  }>;
  samples: number[];
  timeDeltas: number[];
}

/**
 * Computes self time per frame from raw profile samples. `timeDeltas[i]` is the time (us)
 * between `samples[i]` and `samples[i + 1]`, attributed to the node running at `samples[i]`.
 */
export const summarizeProfile = (
  profile: CpuProfile
): { topFrames: ProfileFrame[]; gcDominant: boolean; sampledCoverage: number } => {
  const nodesById = new Map(profile.nodes.map((node) => [node.id, node.callFrame]));
  const selfTimeUsById = new Map<number, number>();
  let totalSampledUs = 0;

  for (let i = 0; i < profile.samples.length; i++) {
    const delta = profile.timeDeltas[i] ?? 0;
    if (delta <= 0) continue;
    const nodeId = profile.samples[i];
    selfTimeUsById.set(nodeId, (selfTimeUsById.get(nodeId) ?? 0) + delta);
    totalSampledUs += delta;
  }

  const blockDurationUs = Math.max(1, profile.endTime - profile.startTime);
  const sampledCoverage = Math.min(1, totalSampledUs / blockDurationUs);

  const frames = [...selfTimeUsById.entries()]
    .map(([nodeId, selfTimeUs]): ProfileFrame => {
      const callFrame = nodesById.get(nodeId);
      return {
        functionName: callFrame?.functionName || '(anonymous)',
        url: callFrame?.url ?? '',
        selfTimeMs: selfTimeUs / 1000,
        selfTimePercent: totalSampledUs > 0 ? (selfTimeUs / totalSampledUs) * 100 : 0,
      };
    })
    .sort((a, b) => b.selfTimeMs - a.selfTimeMs);

  const topFrames = frames.slice(0, TOP_FRAME_COUNT);
  const gcSelfTimePercent = frames
    .filter((frame) => frame.functionName === GC_FUNCTION_NAME)
    .reduce((sum, frame) => sum + frame.selfTimePercent, 0);

  return { topFrames, gcDominant: gcSelfTimePercent > 50, sampledCoverage };
};

/**
 * A block is "likely unsampled" when profiler samples cover only a small fraction of its
 * duration - the profiler can only sample while V8 is executing JS, so gaps suggest a
 * blocking native/syscall wait, or that the process was preempted by the OS rather than
 * genuinely busy running task code.
 */
export const isLikelyUnsampled = (sampledCoverage: number): boolean =>
  sampledCoverage < UNSAMPLED_COVERAGE_THRESHOLD;

/** Per-task-type dedup: only log a full report once per window, then a suppressed count. */
export class ReportDeduper {
  private readonly lastLoggedAt = new Map<string, number>();
  private readonly suppressedCount = new Map<string, number>();

  constructor(private readonly dedupWindowMs: number) {}

  /**
   * Returns `'log'` for the first occurrence in the window (and resets the window),
   * `'suppress'` for repeats within the window, or `'log-with-suppressed'` when the window
   * has elapsed and there were suppressed occurrences to report alongside the new one.
   */
  public check(
    taskTypeKey: string,
    now: number
  ): { action: 'log' | 'suppress' | 'log-with-suppressed'; suppressedCount: number } {
    const lastLoggedAt = this.lastLoggedAt.get(taskTypeKey);
    if (lastLoggedAt === undefined || now - lastLoggedAt > this.dedupWindowMs) {
      const suppressed = this.suppressedCount.get(taskTypeKey) ?? 0;
      this.lastLoggedAt.set(taskTypeKey, now);
      this.suppressedCount.set(taskTypeKey, 0);
      return {
        action: suppressed > 0 ? 'log-with-suppressed' : 'log',
        suppressedCount: suppressed,
      };
    }
    this.suppressedCount.set(taskTypeKey, (this.suppressedCount.get(taskTypeKey) ?? 0) + 1);
    return { action: 'suppress', suppressedCount: 0 };
  }
}

/** Groups suspects into a dedup key so a group of concurrent tasks shares one window. */
export const dedupKeyForSuspects = (suspects: TaskSuspect[]): string =>
  suspects.length > 0
    ? [...new Set(suspects.map((suspect) => suspect.taskType))].sort().join(',')
    : 'unattributed';

const formatSuspects = (suspects: TaskSuspect[]): string => {
  if (suspects.length === 0) return 'none in-flight (block may be framework/HTTP code)';
  const label = suspects.length === 1 ? 'sole suspect' : `${suspects.length} candidates`;
  return `${label}: ${suspects
    .map(
      (suspect) =>
        `${suspect.taskType} "${suspect.taskId}" (in flight ${Math.round(suspect.inFlightMs)}ms)`
    )
    .join(', ')}`;
};

const formatFrames = (frames: ProfileFrame[]): string =>
  frames.length === 0
    ? 'no samples captured'
    : frames
        .map(
          (frame) =>
            `${frame.functionName || '(anonymous)'}${frame.url ? ` (${frame.url})` : ''} ` +
            `${frame.selfTimeMs.toFixed(1)}ms/${frame.selfTimePercent.toFixed(0)}%`
        )
        .join('; ');

/** Formats a completed block report as a single human-readable log line. */
export const formatReport = (report: BlockReport): string => {
  const suppressedNote =
    report.suppressedCount > 0
      ? ` (${report.suppressedCount} similar block(s) suppressed since the last report)`
      : '';
  const annotations = [
    report.gcDominant ? 'garbage collection dominated the sampled time' : undefined,
    report.likelyUnsampled
      ? `only ${(report.sampledCoverage * 100).toFixed(0)}% of the block was sampled - ` +
        `likely a native/syscall wait or the process being preempted, not necessarily task code`
      : undefined,
  ].filter((note): note is string => Boolean(note));

  return (
    `Event loop blocked for ${Math.round(report.blockedMs)}ms. ${formatSuspects(
      report.suspects
    )}. ` +
    `Top frames: ${formatFrames(report.topFrames)}.${suppressedNote}` +
    (annotations.length > 0 ? ` Note: ${annotations.join('; ')}.` : '')
  );
};

/** Formats a still-ongoing block notice, used for wedged/infinite-loop tasks. */
export const formatStillBlockedNotice = (notice: StillBlockedNotice): string =>
  `Event loop still blocked after ${Math.round(notice.elapsedMs)}ms and counting. ${formatSuspects(
    notice.suspects
  )}.`;
