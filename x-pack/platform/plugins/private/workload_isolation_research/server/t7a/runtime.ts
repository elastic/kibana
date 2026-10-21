/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. The background Kibana polls one ES doc and writes its own cgroup. */

import { hostname } from 'os';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { sampleProcessMemory } from '../capability_kit/worker_core/memory_sample';
import { accountFromFiles, podName, readCgroupText, readKernelBootId } from './cgroup_sample';
import type { T7aConfig, T7aController } from './main_host';

export const RUNTIME_INDEX = '.kibana-research-t7p-config';
export const CGROUP_INDEX = '.kibana-research-t7p-cgroup';
export const RUNTIME_ID = 'island';
export const CHILD_CAP_MIN = 128;
export const CHILD_CAP_MAX = 2048;

export type RuntimeMode = 'main' | 'offmain-process' | 'offmain-thread';
export type RuntimeBootArm = 'baseline' | 'class';

export interface RuntimeDoc {
  readonly generation: number;
  readonly mode: RuntimeMode;
  readonly childCapMb: number;
  readonly localSo: boolean;
  readonly sampleRequest: number;
  readonly bootArm: RuntimeBootArm;
  /** When true, the background process boots the island as it applies this generation. */
  readonly warm: boolean;
  readonly slots: 1 | 2;
}

export interface RuntimeInput {
  readonly mode: RuntimeMode;
  readonly childCapMb?: number;
  readonly localSo?: boolean;
  readonly bootArm?: RuntimeBootArm;
  readonly warm?: boolean;
  readonly slots?: number;
}

const isCap = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= CHILD_CAP_MIN &&
  value <= CHILD_CAP_MAX;

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** Rejects a stored doc that is not the allowlisted shape. */
export const parseRuntimeDoc = (source: unknown): RuntimeDoc | null => {
  if (!source || typeof source !== 'object') return null;
  const doc = source as Record<string, unknown>;
  if (doc.mode !== 'main' && doc.mode !== 'offmain-process' && doc.mode !== 'offmain-thread') {
    return null;
  }
  if (!isCount(doc.generation) || !isCap(doc.childCapMb) || !isCount(doc.sampleRequest))
    return null;
  if (doc.bootArm !== undefined && doc.bootArm !== 'baseline' && doc.bootArm !== 'class') {
    return null;
  }
  if (doc.warm !== undefined && typeof doc.warm !== 'boolean') return null;
  if (doc.slots !== undefined && doc.slots !== 1 && doc.slots !== 2) return null;
  return {
    generation: doc.generation,
    mode: doc.mode,
    childCapMb: doc.childCapMb,
    localSo: doc.localSo !== false,
    sampleRequest: doc.sampleRequest,
    bootArm: doc.bootArm === 'class' ? 'class' : 'baseline',
    warm: doc.warm === true,
    slots: doc.slots === 2 ? 2 : 1,
  };
};

/** Next config generation. A sample request does not use this and does not restart the island. */
export const buildRuntimeDoc = (previous: RuntimeDoc | null, input: RuntimeInput): RuntimeDoc => {
  const childCapMb = input.childCapMb ?? previous?.childCapMb ?? 384;
  if (!isCap(childCapMb)) throw new Error('child cap must be an integer from 128 to 2048');
  const slots = input.slots ?? previous?.slots ?? 1;
  if (slots !== 1 && slots !== 2) throw new Error('slots must be 1 or 2');
  const bootArm = input.bootArm ?? previous?.bootArm ?? 'baseline';
  if (bootArm !== 'baseline' && bootArm !== 'class') {
    throw new Error('boot arm must be baseline or class');
  }
  return {
    generation: (previous?.generation ?? 0) + 1,
    mode: input.mode,
    childCapMb,
    localSo: input.localSo ?? previous?.localSo ?? true,
    sampleRequest: previous?.sampleRequest ?? 0,
    bootArm,
    warm: input.warm ?? previous?.warm ?? false,
    slots,
  };
};

/** Asks the background process for a sample without changing the island generation. */
export const bumpSampleRequest = (previous: RuntimeDoc | null): RuntimeDoc => ({
  generation: previous?.generation ?? 0,
  mode: previous?.mode ?? 'main',
  childCapMb: previous?.childCapMb ?? 384,
  localSo: previous?.localSo ?? true,
  sampleRequest: (previous?.sampleRequest ?? 0) + 1,
  bootArm: previous?.bootArm ?? 'baseline',
  warm: previous?.warm ?? false,
  slots: previous?.slots ?? 1,
});

/** Applies a doc on the process that owns the island. Main clears both caps. */
export const applyRuntime = async (
  controller: { configure: (next: Partial<T7aConfig>) => Promise<T7aConfig> },
  doc: RuntimeDoc
): Promise<void> => {
  if (doc.mode === 'main') {
    await controller.configure({
      mode: 'main',
      transport: 'thread',
      processOldSpaceMb: undefined,
      threadOldSpaceMb: undefined,
    });
    return;
  }
  const slots = doc.slots === 2 ? 2 : 1;
  const bootArm = doc.bootArm === 'class' ? 'class' : 'baseline';
  if (doc.mode === 'offmain-thread') {
    await controller.configure({
      mode: 'offmain',
      transport: 'thread',
      slots,
      concurrency: 1,
      localSo: doc.localSo,
      processOldSpaceMb: undefined,
      threadOldSpaceMb: doc.childCapMb,
      bootArm,
    });
    return;
  }
  await controller.configure({
    mode: 'offmain',
    transport: 'process',
    slots,
    concurrency: 1,
    localSo: doc.localSo,
    processOldSpaceMb: doc.childCapMb,
    threadOldSpaceMb: undefined,
    bootArm,
  });
};

/** Unset roles are a single local process. A JSON role list must name background_tasks. */
export const runsOnBackgroundTasks = (nodeRoles: string | undefined): boolean => {
  if (!nodeRoles) return true;
  try {
    const parsed: unknown = JSON.parse(nodeRoles);
    if (Array.isArray(parsed)) return parsed.some((role) => role === 'background_tasks');
  } catch {
    return nodeRoles.includes('background_tasks');
  }
  return false;
};

export const parentOldSpaceMb = (nodeOptions: string | undefined): number | null => {
  const match = nodeOptions?.match(/--max-old-space-size(?:=|\s+)(\d+)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) ? value : null;
};

const esStatus = (error: unknown): number | undefined =>
  (error as { meta?: { statusCode?: number } }).meta?.statusCode;

const esType = (error: unknown): string | undefined =>
  (error as { meta?: { body?: { error?: { type?: string } } } }).meta?.body?.error?.type;

const describeEs = (error: unknown): string => {
  const name = error instanceof Error ? error.name : 'Error';
  const status = esStatus(error);
  return `${name}${status == null ? '' : ` ${status}`}`;
};

const ensureIndex = async (es: ElasticsearchClient, index: string): Promise<void> => {
  try {
    await es.indices.create({
      index,
      settings: { 'index.hidden': true },
      mappings: { dynamic: true },
    });
  } catch (error) {
    if (esType(error) === 'resource_already_exists_exception') return;
    throw error;
  }
};

export const readRuntimeDoc = async (es: ElasticsearchClient): Promise<RuntimeDoc | null> => {
  try {
    const response = await es.get({ index: RUNTIME_INDEX, id: RUNTIME_ID });
    return parseRuntimeDoc((response as { _source?: unknown })._source);
  } catch (error) {
    if (esStatus(error) === 404) return null;
    throw error;
  }
};

export const writeRuntimeDoc = async (es: ElasticsearchClient, doc: RuntimeDoc): Promise<void> => {
  await ensureIndex(es, RUNTIME_INDEX);
  await es.index({
    index: RUNTIME_INDEX,
    id: RUNTIME_ID,
    refresh: 'wait_for',
    document: doc,
  });
};

const hitsOf = (response: unknown): unknown[] => {
  const hits = (response as { hits?: { hits?: Array<{ _source?: unknown }> } }).hits?.hits;
  return (hits ?? []).map((hit) => hit._source).filter((source) => source != null);
};

export const readCgroupSamples = async (
  es: ElasticsearchClient,
  size: number
): Promise<unknown[]> => {
  const bounded = Number.isInteger(size) && size >= 1 && size <= 100 ? size : 20;
  try {
    const response = await es.search({
      index: CGROUP_INDEX,
      size: bounded,
      sort: [{ '@timestamp': 'desc' }],
      query: { term: { kind: 'cgroup' } },
    });
    return hitsOf(response);
  } catch (error) {
    if (esStatus(error) === 404) return [];
    throw error;
  }
};

export interface ResearchRuntime {
  stop(): void;
}

/** Polls the config doc and writes this process cgroup. Call it only on background_tasks. */
export const startResearchRuntime = (options: {
  es: ElasticsearchClient;
  getController: () => Promise<T7aController | undefined>;
  logger: Pick<Logger, 'warn'>;
  intervalMs?: number;
  readFile?: (file: string) => string | null;
}): ResearchRuntime => {
  const intervalMs = options.intervalMs ?? 2000;
  const readFile = options.readFile ?? readCgroupText;
  let stopped = false;
  let running = false;
  let cgroupReady = false;
  let appliedGeneration = 0;
  let bootAtStartMs: number | null = null;
  let bootAtStartWallMs: number | null = null;
  let seq = 0;
  const pod = podName(hostname());
  const bootId = readKernelBootId();

  const tick = async () => {
    if (stopped || running) return;
    running = true;
    try {
      const doc = await readRuntimeDoc(options.es).catch((error: unknown) => {
        options.logger.warn(`t7p runtime read ${describeEs(error)}`);
        return null;
      });
      const controller = await options.getController();
      if (controller && doc && doc.generation !== appliedGeneration && doc.generation > 0) {
        await applyRuntime(controller, doc);
        appliedGeneration = doc.generation;
        bootAtStartMs = null;
        bootAtStartWallMs = null;
        if (doc.mode !== 'main' && doc.warm) {
          const started = performance.now();
          const boots = await Promise.all(
            Array.from({ length: doc.slots }, () => controller.probe('boot'))
          );
          bootAtStartWallMs = performance.now() - started;
          const first = boots[0] as { status?: string; value?: { bootMs?: unknown } };
          bootAtStartMs =
            first?.status === 'success' && typeof first.value?.bootMs === 'number'
              ? first.value.bootMs
              : null;
        }
      }
      const config = controller?.getConfig();
      const heaps = controller?.workerHeaps() ?? [];
      const worker = heaps[0];
      const second = heaps[1];
      const memory = sampleProcessMemory();
      const account = accountFromFiles(readFile);
      seq += 1;
      if (!cgroupReady) {
        await ensureIndex(options.es, CGROUP_INDEX);
        cgroupReady = true;
      }
      await options.es.index({
        index: CGROUP_INDEX,
        refresh: false,
        document: {
          '@timestamp': new Date().toISOString(),
          kind: 'cgroup',
          seq,
          pod,
          boot_id: bootId,
          pid: process.pid,
          generation: appliedGeneration,
          sample_request: doc?.sampleRequest ?? 0,
          mode: config?.mode ?? null,
          transport: config?.transport ?? null,
          process_old_space_mb: config?.processOldSpaceMb ?? null,
          thread_old_space_mb: config?.threadOldSpaceMb ?? null,
          boot_arm: config?.bootArm ?? null,
          warm: doc?.warm ?? false,
          slots: doc?.slots ?? config?.slots ?? null,
          boot_at_start_ms: bootAtStartMs,
          boot_at_start_wall_ms: bootAtStartWallMs,
          worker_heap_size_limit: worker?.heapSizeLimit ?? null,
          worker_heap_used: worker?.heapUsed ?? null,
          worker_heap_total: worker?.heapTotal ?? null,
          worker_boot_ms: worker?.bootMs ?? null,
          worker_rule_type_ids: worker?.ruleTypeIds ?? [],
          worker_action_type_ids: worker?.actionTypeIds ?? [],
          worker_slot_count: heaps.length,
          worker_heap_size_limit_2: second?.heapSizeLimit ?? null,
          worker_heap_used_2: second?.heapUsed ?? null,
          parent_old_space_mb: parentOldSpaceMb(process.env.NODE_OPTIONS),
          pointer_compression: memory.pointerCompression,
          jemalloc:
            process.env.KBN_ENABLE_JEMALLOC === 'true' ||
            (process.env.LD_PRELOAD ?? '').includes('jemalloc'),
          rss: memory.rss,
          heap_used: memory.heapUsed,
          heap_total: memory.heapTotal,
          heap_size_limit: memory.heapSizeLimit,
          external: memory.external,
          array_buffers: memory.arrayBuffers,
          cgroup_current: account.current,
          cgroup_anon: account.anon,
          cgroup_file: account.file,
          cgroup_inactive_file: account.inactiveFile,
          cgroup_shmem: account.shmem,
          cgroup_peak: account.peak,
          cgroup_oom: account.oom,
          cgroup_oom_kill: account.oomKill,
          cgroup_working_set: account.workingSet,
        },
      });
    } catch (error) {
      options.logger.warn(`t7p runtime sample ${describeEs(error)}`);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, intervalMs);
  timer.unref();
  void tick();
  return {
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
  };
};
