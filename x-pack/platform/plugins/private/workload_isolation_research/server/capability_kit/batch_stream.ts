/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { serialize } from 'v8';
import { encode, decode } from './codecs';
import type { CodecInput } from './codecs';
import type { Binding } from './host';
import type { Bundle, WorkerContext } from './protocol';

export interface BatchLimits {
  readonly maxEvents?: number;
  readonly maxBytes?: number;
  readonly maxPendingBatches?: number;
  readonly maxStreamsPerRun?: number;
}
export interface EventBatch {
  readonly streamId: string;
  readonly sequence: number;
  readonly events: readonly CodecInput[];
  readonly terminal: boolean;
}
interface Limits {
  maxEvents: number;
  maxBytes: number;
  maxPendingBatches: number;
  maxStreamsPerRun: number;
}
const limitsFor = (options: BatchLimits): Limits => {
  const limits = {
    maxEvents: options.maxEvents ?? 64,
    maxBytes: options.maxBytes ?? 65536,
    maxPendingBatches: options.maxPendingBatches ?? 2,
    maxStreamsPerRun: options.maxStreamsPerRun ?? 4,
  };
  if (
    ![limits.maxEvents, limits.maxBytes, limits.maxPendingBatches, limits.maxStreamsPerRun].every(
      (value) => Number.isSafeInteger(value) && value > 0
    )
  )
    throw new Error('Stream limits must be positive integers');
  return limits;
};
const validateBatch = (batch: EventBatch, limits: Limits): void => {
  if (
    !batch ||
    typeof batch.streamId !== 'string' ||
    !batch.streamId ||
    batch.streamId.length > 128 ||
    !Number.isSafeInteger(batch.sequence) ||
    batch.sequence < 0 ||
    typeof batch.terminal !== 'boolean' ||
    !Array.isArray(batch.events) ||
    batch.events.length > limits.maxEvents ||
    serialize(encode(batch.events)).byteLength > limits.maxBytes
  )
    throw new Error('Event batch exceeds bounds or has invalid framing');
};

/** Serializes and acknowledges bounded batches; producers must await writes for backpressure. */
export const createBatchStream = (
  context: WorkerContext,
  capability: string,
  options: BatchLimits = {}
) => {
  const limits = limitsFor(options);
  const streamId = randomUUID();
  let sequence = 0;
  let pending = 0;
  let closed = false;
  let failure: Error | undefined;
  let tail: Promise<void> = Promise.resolve();
  const enqueue = (events: readonly CodecInput[], terminal: boolean): Promise<void> => {
    if (closed || failure) return Promise.reject(failure ?? new Error('Event stream is closed'));
    if (pending >= limits.maxPendingBatches)
      return Promise.reject(new Error('Event stream backpressure: await an outstanding batch'));
    let batch: EventBatch;
    try {
      batch = { streamId, sequence, events: decode(encode(events)) as CodecInput[], terminal };
      validateBatch(batch, limits);
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error('Invalid event batch'));
    }
    if (terminal) closed = true;
    sequence++;
    pending++;
    const result = tail.then(async () => {
      if (failure) throw failure;
      const response = (await context.call(capability, 'batch', batch)) as { ack?: number };
      if (response?.ack !== batch.sequence) throw new Error('Event stream ACK mismatch');
    });
    tail = result.catch((error: Error) => {
      failure = error;
    });
    return result.finally(() => {
      pending--;
    });
  };
  return {
    write: (events: readonly CodecInput[]): Promise<void> => enqueue(events, false),
    close: (): Promise<void> => enqueue([], true),
  };
};

/** Pins ordered delivery to one run; the ACK is sent only after the consumer settles. */
export const bindBatchStream = (
  consume: (batch: EventBatch, bundle: Bundle) => Promise<void>,
  options: BatchLimits = {}
): Binding => {
  const limits = limitsFor(options);
  const states = new Map<
    string,
    { sequence: number; inflight: boolean; ended: boolean; failed: boolean }
  >();
  return {
    lever: 'capability_bundle',
    onRunEnd: (bundle) => {
      for (const key of states.keys()) if (key.startsWith(bundle.runId + ':')) states.delete(key);
    },
    handler: async (operation, args, bundle) => {
      if (operation !== 'batch') throw new Error('Stream operation not allowlisted');
      const batch = args as EventBatch;
      validateBatch(batch, limits);
      const key = bundle.runId + ':' + batch.streamId;
      let state = states.get(key);
      if (!state) {
        if (batch.sequence !== 0) throw new Error('Stream sequence/lifetime violation');
        const count = [...states.keys()].filter((entry) =>
          entry.startsWith(bundle.runId + ':')
        ).length;
        if (count >= limits.maxStreamsPerRun)
          throw new Error('Per-run stream count exceeds bounds');
        state = { sequence: 0, inflight: false, ended: false, failed: false };
        states.set(key, state);
      }
      if (state.inflight || state.ended || state.failed || batch.sequence !== state.sequence)
        throw new Error('Stream sequence/lifetime violation');
      state.inflight = true;
      try {
        await consume(batch, bundle);
        state.sequence++;
        state.ended = batch.terminal;
        return { ack: batch.sequence };
      } catch (error) {
        state.failed = true;
        throw error;
      } finally {
        state.inflight = false;
      }
    },
  };
};
