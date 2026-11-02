/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MIN_TOP_TASK_SHARE,
  SAMPLE_INTERVAL_MS,
  type BlockAttribution,
  type FlagDecision,
} from './types';

export interface FlagRuleOpts {
  flagThresholdMs: number;
  /**
   * Minimum process CPU time over block wall time. Rejects blocks caused by a throttled or starved
   * node instead of by a task. As a side effect it also exempts blocking syscalls (sync fs,
   * `execSync`), which burn little CPU; set to 0 to disable the gate.
   */
  minCpuRatio: number;
  sampleIntervalMs?: number;
}

/**
 * Decides whether a block is evidence enough to flag one task. Accuracy over coverage: opaque,
 * unsampled and context-less time is never credited, so the worst outcome is a missed flag.
 */
export const decideFlag = (
  attribution: BlockAttribution,
  cpuRatio: number,
  startedAt: string,
  endedAt: string,
  { flagThresholdMs, minCpuRatio, sampleIntervalMs = SAMPLE_INTERVAL_MS }: FlagRuleOpts
): FlagDecision => {
  const { blockedMs, unsampledMs, unsampledPrefixMs, unsampledTailMs, opaqueMs, perTask } =
    attribution;
  if (blockedMs < flagThresholdMs) return { flagged: false, reason: 'below-threshold' };
  if (cpuRatio < minCpuRatio) return { flagged: false, reason: 'cpu-starved' };

  if (attribution.samples === 0) return { flagged: false, reason: 'unsampled' };

  const [top] = perTask;
  if (!top || attribution.missingAccessor) {
    // A block that was mostly one uninterruptible call has nothing to name, but is not context-less.
    const opaque =
      !attribution.missingAccessor && opaqueMs > 0 && opaqueMs >= attribution.noContextMs;
    return { flagged: false, reason: opaque ? 'opaque-dominated' : 'no-context' };
  }

  // Time after sampling stopped counts against the flag: it may have belonged to anyone.
  const heldEnough =
    top.observedMs >= flagThresholdMs - unsampledPrefixMs - sampleIntervalMs &&
    top.observedMs >= MIN_TOP_TASK_SHARE * (blockedMs - unsampledPrefixMs);
  if (!heldEnough) {
    if (opaqueMs >= top.observedMs) return { flagged: false, reason: 'opaque-dominated' };
    if (unsampledTailMs >= top.observedMs) return { flagged: false, reason: 'unsampled' };
    return { flagged: false, reason: 'multiple-contexts' };
  }

  return {
    flagged: true,
    taskId: top.taskId,
    taskType: top.taskType,
    executionUuid: top.executionUuid,
    evidence: {
      blockedMs: Math.round(blockedMs),
      observedMs: Math.round(top.observedMs),
      opaqueMs: Math.round(opaqueMs),
      unsampledMs: Math.round(unsampledMs),
      inferredMs: Math.round(attribution.inferredMs),
      samples: attribution.samples,
      cpuRatio: Math.round(cpuRatio * 100) / 100,
      startedAt,
      endedAt,
    },
  };
};
