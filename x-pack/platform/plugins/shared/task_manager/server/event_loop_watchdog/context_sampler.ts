/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  POLL_INTERVAL_MS,
  SAMPLE_INTERVAL_MS,
  type BlockAttribution,
  type ContextSample,
  type TaskObservation,
} from './types';

export interface PartitionOpts {
  sampleIntervalMs: number;
  pollIntervalMs: number;
}

const DEFAULT_OPTS: PartitionOpts = {
  sampleIntervalMs: SAMPLE_INTERVAL_MS,
  pollIntervalMs: POLL_INTERVAL_MS,
};

const toMs = (us: number) => us / 1000;

/**
 * Partitions a block's timeline (monotonic microseconds) from the evaluates dispatched while it
 * lasted. A sample is exact about the instant it lands and about nothing before it: an evaluate
 * posted during one long native call lands only when that call returns, and may then name a
 * different task that happens to run next. That interval is therefore opaque and never credited.
 *
 * - `[blockStart, firstPost)` is unsampled.
 * - `[post, landing)` of each sample is opaque. A sample still in flight at the end of the block
 *   contributes `[post, blockEnd)`.
 * - `[landing_i, post_{i+1})` is credited to sample i's task. After the last landing at most one
 *   sample interval (plus one poll) is credited, the window in which a re-post was due; the rest
 *   is unsampled.
 */
export const partitionBlock = (
  startedAtUs: number,
  endedAtUs: number,
  samples: ContextSample[],
  opts: PartitionOpts = DEFAULT_OPTS
): BlockAttribution => {
  const blockedUs = Math.max(0, endedAtUs - startedAtUs);
  const tailCapUs = (opts.sampleIntervalMs + opts.pollIntervalMs) * 1000;
  const clamp = (us: number) => Math.min(Math.max(us, startedAtUs), endedAtUs);

  let prefixUs = 0;
  let tailUs = 0;
  let opaqueUs = 0;
  let inferredUs = 0;
  let noContextUs = 0;
  const perTask = new Map<string, TaskObservation>();

  if (samples.length === 0) {
    prefixUs = blockedUs;
  } else {
    prefixUs = clamp(samples[0].postedAtUs) - startedAtUs;
  }

  let previousLanded: ContextSample | undefined;
  samples.forEach((sample, i) => {
    const postedUs = clamp(sample.postedAtUs);
    if (sample.landedAtUs === undefined) {
      opaqueUs += endedAtUs - postedUs;
      return;
    }
    const landedUs = clamp(sample.landedAtUs);
    const opaqueSpanUs = Math.max(0, landedUs - postedUs);
    opaqueUs += opaqueSpanUs;
    if (
      sample.task &&
      previousLanded?.task &&
      previousLanded.task.executionUuid === sample.task.executionUuid
    ) {
      inferredUs += opaqueSpanUs;
    }
    previousLanded = sample;

    const next = samples[i + 1];
    let creditEndUs: number;
    if (next) {
      creditEndUs = Math.max(landedUs, clamp(next.postedAtUs));
    } else {
      creditEndUs = Math.min(endedAtUs, landedUs + tailCapUs);
      tailUs += endedAtUs - creditEndUs;
    }
    const creditUs = creditEndUs - landedUs;

    if (!sample.task) {
      noContextUs += creditUs;
      return;
    }
    const { executionUuid, taskId, taskType } = sample.task;
    const existing = perTask.get(executionUuid) ?? {
      taskId,
      taskType,
      executionUuid,
      observedMs: 0,
      samples: 0,
    };
    existing.observedMs += toMs(creditUs);
    existing.samples += 1;
    perTask.set(executionUuid, existing);
  });

  return {
    blockedMs: toMs(blockedUs),
    unsampledMs: toMs(prefixUs + tailUs),
    unsampledPrefixMs: toMs(prefixUs),
    unsampledTailMs: toMs(tailUs),
    opaqueMs: toMs(opaqueUs),
    inferredMs: toMs(inferredUs),
    noContextMs: toMs(noContextUs),
    samples: samples.length,
    missingAccessor: samples.some((sample) => sample.missing),
    perTask: [...perTask.values()].sort((a, b) => b.observedMs - a.observedMs),
  };
};
