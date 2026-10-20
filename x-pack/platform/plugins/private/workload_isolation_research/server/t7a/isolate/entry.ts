/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY (Track 7.A). Kit module entry for the `alerting` class. One island (real plugin
 * set) is booted lazily per slot and kept warm; each dispatched TM task builds its runner from
 * the island's captured task definitions — the same `createTaskRunner` main would have used. */

import { setFlagsFromString } from 'v8';
import { runInNewContext } from 'vm';
import { decode } from '../../capability_kit/codecs';
import type { CodecInput } from '../../capability_kit/codecs';
import type { TaskEntry, WorkerContext } from '../../capability_kit/protocol';
import type { ResearchEsCapability } from '@kbn/core-elasticsearch-client-server-internal';
import type { IslandSnapshot } from '../snapshot';
import { decodeFakeRequest } from '../request_codec';
import type { FakeRequestDescriptor } from '../request_codec';
import { encodeRunResult, encodeTaskError } from '../task_codec';
import { bootIsland } from './island';
import type { Island } from './island';
import { edgeStats, fenceStats, missStats, runContext } from './bridge';

let island: Promise<Island> | undefined;
let bootStartedAt: number | undefined;
const slotStartedAt = performance.now();
let runs = 0;

interface RunInput {
  readonly phase: 'run' | 'cleanup' | 'stats' | 'boot';
  readonly taskType: string;
  readonly taskInstance: Record<string, unknown>;
  readonly executionUuid?: string;
  readonly fakeRequest?: FakeRequestDescriptor;
}

const memory = () => {
  const m = process.memoryUsage();
  return { heapUsed: m.heapUsed, heapTotal: m.heapTotal, rss: m.rss, external: m.external };
};

const getIsland = (context: WorkerContext): Promise<Island> => {
  if (!island) {
    const data = (context.bundle.data ? decode(context.bundle.data) : {}) as {
      snapshot: IslandSnapshot;
      elasticsearch: ResearchEsCapability;
      localSo?: boolean;
    };
    bootStartedAt = performance.now();
    island = bootIsland(data.snapshot, data.elasticsearch, Boolean(data.localSo));
    island.then((i) => (islandTaskTypes = [...i.taskCapture.definitions.keys()])).catch(() => undefined);
    island.catch(() => {
      island = undefined;
    });
  }
  return island;
};

/** Measurement only: full GC (twice) so heap numbers are retained, not garbage. */
const forceGc = () => {
  setFlagsFromString('--expose_gc');
  const gc = runInNewContext('gc') as () => void;
  gc();
  gc();
};

let islandTaskTypes: string[] = [];
const stats = () => ({
  taskTypes: islandTaskTypes,
  edges: Object.fromEntries(edgeStats),
  fences: Object.fromEntries(fenceStats),
  misses: Object.fromEntries(missStats),
  memory: memory(),
  runs,
  slotAgeMs: performance.now() - slotStartedAt,
});

/** Runs one TM task phase with the island's real runner. */
export const runTask: TaskEntry = async (rawInput: CodecInput, context: WorkerContext) =>
  runContext.run(context, async () => {
    const input = rawInput as RunInput;
    if (input.phase === 'stats') {
      if (input.taskType === 'gc') forceGc();
      return stats() as CodecInput;
    }
    if (input.phase === 'boot') {
      const t = performance.now();
      const current = await getIsland(context);
      return { bootMs: current.bootMs, waitedMs: performance.now() - t, slotAgeMs: performance.now() - slotStartedAt, memory: memory() } as CodecInput;
    }
    const t0 = performance.now();
    const wasCold = !island;
    const current = await getIsland(context);
    const bootMs = wasCold ? current.bootMs : 0;
    const definition = current.taskCapture.definitions.get(input.taskType);
    if (!definition) throw new Error(`t7a: task type ${input.taskType} not registered in island`);
    const customFields: Record<string, unknown> = {};
    const abortController = new AbortController();
    const runner = definition.createTaskRunner({
      taskInstance: input.taskInstance,
      signal: abortController.signal,
      executionUuid: input.executionUuid,
      setCustomTaskRunEventFields: (fields: Record<string, unknown>) =>
        Object.assign(customFields, fields),
      ...(input.fakeRequest ? { fakeRequest: decodeFakeRequest(input.fakeRequest) } : {}),
    } as never) as {
      run: () => Promise<unknown>;
      cancel?: () => Promise<unknown>;
      cleanup?: () => Promise<void>;
    };
    // Cooperative cancel (kit 0.1.1): TM's cancel on main aborts the dispatch signal.
    const onAbort = () => {
      abortController.abort();
      void runner.cancel?.();
    };
    context.signal.addEventListener('abort', onAbort, { once: true });
    runs++;
    try {
      if (input.phase === 'cleanup') {
        await runner.cleanup?.();
        return { phase: 'cleanup', customFields, coldBootMs: bootMs } as CodecInput;
      }
      try {
        const result = await runner.run();
        return {
          phase: 'run',
          wire: encodeRunResult(result),
          customFields,
          coldBootMs: bootMs,
          bootQueuedMs: wasCold && bootStartedAt ? 0 : undefined,
          runMs: performance.now() - t0,
          memory: memory(),
        } as unknown as CodecInput;
      } catch (error) {
        return {
          phase: 'run',
          thrown: encodeTaskError(error instanceof Error ? error : new Error(String(error))),
          customFields,
          coldBootMs: bootMs,
          runMs: performance.now() - t0,
          memory: memory(),
        } as unknown as CodecInput;
      }
    } finally {
      context.signal.removeEventListener('abort', onAbort);
    }
  });
