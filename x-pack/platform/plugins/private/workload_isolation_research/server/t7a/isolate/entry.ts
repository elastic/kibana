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
import type { ResearchEsCapability } from '@kbn/core-elasticsearch-client-server-internal';
import { decode } from '../../capability_kit/codecs';
import type { CodecInput } from '../../capability_kit/codecs';
import type { TaskEntry, WorkerContext } from '../../capability_kit/protocol';
import type { IslandSnapshot } from '../snapshot';
import { decodeFakeRequest } from '../request_codec';
import type { FakeRequestDescriptor } from '../request_codec';
import { encodeRunResult, encodeTaskError } from '../task_codec';
import { bootIsland } from './island';
import type { Island } from './island';
import { diffDefinitionParity } from '@kbn/task-manager-plugin/server/lib/research_runner_override';
import { replicaFingerprint, runWithExecutionContext } from '../../capability_kit/worker_core';
import { edgeStats, fenceStats, missStats, runContext } from './bridge';
import { bindRunnerCancel } from './runner_cancel';

let island: Promise<Island> | undefined;
let bootStartedAt: number | undefined;
const slotStartedAt = performance.now();
let runs = 0;

interface RunInput {
  readonly phase: 'run' | 'cleanup' | 'stats' | 'boot' | 'platform' | 'platform-watch' | 'replicas';
  readonly taskType: string;
  readonly taskInstance: Record<string, unknown>;
  readonly executionUuid?: string;
  readonly fakeRequest?: FakeRequestDescriptor;
  readonly executionContext?: Record<string, unknown>;
  readonly token?: string;
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
    island
      .then((i) => (islandTaskTypes = [...i.taskCapture.definitions.keys()]))
      .catch(() => undefined);
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

const dataSnapshot = (context: WorkerContext): IslandSnapshot => {
  const data = (context.bundle.data ? decode(context.bundle.data) : {}) as { snapshot?: IslandSnapshot };
  return data.snapshot ?? ({} as IslandSnapshot);
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
    if (input.phase === 'replicas') {
      const current = await getIsland(context);
      current.applyReplicas(dataSnapshot(context));
      return { ok: true, generations: current.platform.generation() } as CodecInput;
    }
    if (input.phase === 'platform-watch') {
      const current = await getIsland(context);
      current.applyReplicas(dataSnapshot(context));
      const seen: boolean[] = [];
      const subscription = current.platform
        .booleanFlag$('workerCore.liveProbe', false)
        .subscribe((value) => seen.push(value));
      const licenseSeen: string[] = [];
      const statusSeen: string[] = [];
      const licenseSub = current.platform.license$.subscribe((value) => {
        const raw = value as { type?: string; license?: { type?: string } };
        licenseSeen.push(String(raw.license?.type ?? raw.type ?? ''));
      });
      const statusSub = current.platform.status$.subscribe((value) => statusSeen.push(value.overall));
      try {
        // Status can move on its own. Keep waiting until the flag value changes so a
        // mid-run override is observed on this warm island, not only on the next task.
        const deadline = Date.now() + 20_000;
        let fingerprint = replicaFingerprint(current.platform.generation());
        while (Date.now() < deadline && new Set(seen).size < 2) {
          const next = (await context.call('replica', 'wait', {
            fingerprint,
          })) as IslandSnapshot['replicas'];
          current.applyReplicas({ replicas: next } as IslandSnapshot);
          fingerprint = replicaFingerprint(current.platform.generation());
        }
        return {
          seen,
          licenseSeen,
          statusSeen,
          generations: current.platform.generation(),
          probeFlag: current.platform.booleanFlag('workerCore.liveProbe') ?? null,
          activeProduct: current.platform.activeProduct(),
        } as CodecInput;
      } finally {
        subscription.unsubscribe();
        licenseSub.unsubscribe();
        statusSub.unsubscribe();
      }
    }
    if (input.phase === 'platform') {
      const current = await getIsland(context);
      current.applyReplicas(dataSnapshot(context));
      return (await runWithExecutionContext(input.executionContext, () =>
        current.observePlatform(String(input.token ?? ''))
      )) as CodecInput;
    }
    if (input.phase === 'boot') {
      const t = performance.now();
      const current = await getIsland(context);
      current.applyReplicas(dataSnapshot(context));
      return {
        bootMs: current.bootMs,
        waitedMs: performance.now() - t,
        slotAgeMs: performance.now() - slotStartedAt,
        memory: memory(),
        esWrites: current.esWrites,
        registeredSoTypes: current.registeredSoTypes,
        taskDefinitionMeta: current.taskDefinitionMeta,
        fences: Object.fromEntries(fenceStats),
        misses: Object.fromEntries(missStats),
      } as CodecInput;
    }
    const t0 = performance.now();
    const wasCold = !island;
    const current = await getIsland(context);
    current.applyReplicas(dataSnapshot(context));
    let watchStopped = false;
    const watchAbort = new AbortController();
    const stopWatch = () => {
      watchStopped = true;
      if (!watchAbort.signal.aborted) watchAbort.abort();
    };
    if (context.signal.aborted) stopWatch();
    else context.signal.addEventListener('abort', stopWatch, { once: true });
    const watchReplicas = async () => {
      while (!watchStopped && !watchAbort.signal.aborted) {
        try {
          const next = (await context.call(
            'replica',
            'wait',
            { fingerprint: replicaFingerprint(current.platform.generation()) },
            watchAbort.signal
          )) as IslandSnapshot['replicas'];
          if (watchStopped || !next) return;
          current.applyReplicas({ replicas: next } as IslandSnapshot);
        } catch {
          return;
        }
      }
    };
    const watch = watchReplicas();
    const parity = diffDefinitionParity(
      ((dataSnapshot(context).taskDefinitionMeta as readonly {
        type: string;
        timeout: string;
        maxAttempts?: number;
        cost?: string | number;
        priority?: string | number;
        stateSchemaVersions: readonly number[];
      }[]) ?? []),
      current.taskDefinitionMeta
    );
    if (parity.length > 0) {
      throw new Error(`worker-core task definition parity failed: ${parity.join('; ')}`);
    }
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
    // Cooperative cancel: TM's cancel on main aborts the dispatch signal, including one
    // that aborted while the island was still booting.
    const unbindCancel = bindRunnerCancel(context.signal, abortController, () =>
      runner.cancel?.() ?? Promise.resolve()
    );
    runs++;
    try {
      if (input.phase === 'cleanup') {
        await runner.cleanup?.();
        return { phase: 'cleanup', customFields, coldBootMs: bootMs } as CodecInput;
      }
      try {
        const result = await runWithExecutionContext(input.executionContext, () => runner.run());
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
      unbindCancel();
      stopWatch();
      context.signal.removeEventListener('abort', stopWatch);
      await watch;
    }
  });
