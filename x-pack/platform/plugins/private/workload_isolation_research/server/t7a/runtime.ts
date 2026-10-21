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

export interface RuntimeDoc {
  readonly generation: number;
  readonly mode: RuntimeMode;
  readonly childCapMb: number;
  readonly localSo: boolean;
  readonly sampleRequest: number;
}

export interface RuntimeInput {
  readonly mode: RuntimeMode;
  readonly childCapMb?: number;
  readonly localSo?: boolean;
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
  return {
    generation: doc.generation,
    mode: doc.mode,
    childCapMb: doc.childCapMb,
    localSo: doc.localSo !== false,
    sampleRequest: doc.sampleRequest,
  };
};

/** Next config generation. A sample request does not use this and does not restart the island. */
export const buildRuntimeDoc = (previous: RuntimeDoc | null, input: RuntimeInput): RuntimeDoc => {
  const childCapMb = input.childCapMb ?? previous?.childCapMb ?? 384;
  if (!isCap(childCapMb)) throw new Error('child cap must be an integer from 128 to 2048');
  return {
    generation: (previous?.generation ?? 0) + 1,
    mode: input.mode,
    childCapMb,
    localSo: input.localSo ?? previous?.localSo ?? true,
    sampleRequest: previous?.sampleRequest ?? 0,
  };
};

/** Asks the background process for a sample without changing the island generation. */
export const bumpSampleRequest = (previous: RuntimeDoc | null): RuntimeDoc => ({
  generation: previous?.generation ?? 0,
  mode: previous?.mode ?? 'main',
  childCapMb: previous?.childCapMb ?? 384,
  localSo: previous?.localSo ?? true,
  sampleRequest: (previous?.sampleRequest ?? 0) + 1,
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
  if (doc.mode === 'offmain-thread') {
    await controller.configure({
      mode: 'offmain',
      transport: 'thread',
      slots: 1,
      concurrency: 1,
      localSo: doc.localSo,
      processOldSpaceMb: undefined,
      threadOldSpaceMb: doc.childCapMb,
    });
    return;
  }
  await controller.configure({
    mode: 'offmain',
    transport: 'process',
    slots: 1,
    concurrency: 1,
    localSo: doc.localSo,
    processOldSpaceMb: doc.childCapMb,
    threadOldSpaceMb: undefined,
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
      }
      const config = controller?.getConfig();
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
