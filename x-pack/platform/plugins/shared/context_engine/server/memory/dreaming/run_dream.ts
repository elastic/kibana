/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import pMap from 'p-map';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isToolValidationError } from '@kbn/inference-common';
import type { InferenceClient } from '@kbn/inference-common';
import { MEMORY_ATTRIBUTES, MEMORY_DREAMING_WRITER_URI } from '../../../common/memory';
import type { StoredMemoryDocument } from '../memory_document';
import { isActiveMemory } from '../memory_document';
import { applyDreamOperations } from './apply_operations';
import type { DreamBatch } from './batches';
import { buildDreamBatches, fitToTokenBudget } from './batches';
import { MAX_CANDIDATES_PER_TYPE, fetchCandidates } from './candidates';
import { proposeLinkOperations } from './link_operations';
import { findLinks } from './links';
import type { DreamOperation, LongTermMemoryTypeDefinition } from './long_term_types';
import { LONG_TERM_MEMORY_TYPE_DEFINITIONS } from './memory_types';
import {
  buildDreamInput,
  buildDreamOutputSchema,
  buildDreamSystemPrompt,
  formatLongTerm,
  formatShortTerm,
} from './prompt';
import { readDreamWindow } from './read_window';
import type { MemoryDreamingTypeRun } from './task_state';

/** Upper bound on the short-term memories one run reads; the rest wait for the next run. */
export const MAX_MEMORIES_PER_RUN = 1000;
/** Short-term memories per model call, in estimated tokens. */
export const MAX_BATCH_INPUT_TOKENS = 30_000;
/** Existing long-term memories per model call, in estimated tokens. */
export const MAX_CANDIDATE_TOKENS = 20_000;
export const MAX_BATCHES_PER_RUN = 20;
/** Stops starting new batches after this long; Task Manager drops the state of a run that times out. */
export const RUN_TIME_BUDGET_MS = 10 * 60 * 1000;
/** Long-term memory types dreamed at the same time. */
export const TYPE_CONCURRENCY = 3;
/** Cursor of a type that has not read anything yet. */
export const FROM_THE_BEGINNING = new Date(0).toISOString();

const NO_SESSION = 'unknown';

export interface RunDreamParams {
  /** Reads and writes the memory stores as the internal user. */
  esClient: ElasticsearchClient;
  /** Scoped to the user who turned dreaming on. */
  inferenceClient: InferenceClient;
  connectorId: string;
  spaceId: string;
  /** Per long-term memory type, the time the type is done up to. Unset before the first dream. */
  cursors?: Record<string, string>;
  runStart: Date;
  logger: Logger;
  signal?: AbortSignal;
  types?: readonly LongTermMemoryTypeDefinition[];
  generateId?: () => string;
  getNow?: () => number;
}

export interface DreamTypeResult extends MemoryDreamingTypeRun {
  cursor: string;
  /** The type has read every short-term memory up to the run start. */
  caughtUp: boolean;
}

export interface RunDreamResult {
  types: Record<string, DreamTypeResult>;
  /** Every type that did not fail is caught up. */
  caughtUp: boolean;
  /** Oldest cursor of a type that is behind and did not fail. */
  behindFrom?: string;
}

const toTime = (timestamp: string) => new Date(timestamp).getTime();

const earliest = (timestamps: string[]) =>
  timestamps.reduce((min, timestamp) => (toTime(timestamp) < toTime(min) ? timestamp : min));

const latest = (a: string, b: string) => (toTime(b) > toTime(a) ? b : a);

const toErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const details = isToolValidationError(error) ? error.meta.errorsText : undefined;
  return details ? `${error.message}: ${details}` : error.message;
};

const groupBySession = (memories: StoredMemoryDocument[]) => {
  const sessions = new Map<string, StoredMemoryDocument[]>();
  for (const memory of memories) {
    const sessionId = String(memory.attributes?.[MEMORY_ATTRIBUTES.sessionId] ?? NO_SESSION);
    sessions.set(sessionId, [...(sessions.get(sessionId) ?? []), memory]);
  }
  return sessions;
};

const toOperations = (output: unknown): DreamOperation[] => {
  const operations = (output as { operations?: unknown } | undefined)?.operations;
  return Array.isArray(operations)
    ? operations.filter(
        (operation): operation is DreamOperation =>
          typeof operation === 'object' &&
          operation !== null &&
          typeof (operation as DreamOperation).op === 'string' &&
          Array.isArray((operation as DreamOperation).source_ids)
      )
    : [];
};

/**
 * One dream: reads the short-term memories written since each long-term memory type's cursor,
 * then, per type and in batches, asks the model how the type should change and applies the
 * answer. Types run in parallel; a type's batches run in order, so later batches see what earlier
 * ones wrote. A failed batch stops its type at the last batch that succeeded. Types that link
 * other types run once those are done, and never get ahead of them.
 */
export const runDream = async ({
  esClient,
  inferenceClient,
  connectorId,
  spaceId,
  cursors,
  runStart,
  logger,
  signal,
  types = LONG_TERM_MEMORY_TYPE_DEFINITIONS,
  generateId = randomUUID,
  getNow = Date.now,
}: RunDreamParams): Promise<RunDreamResult> => {
  const startedAt = getNow();
  const now = runStart.toISOString();
  const hasHistory = cursors !== undefined && Object.keys(cursors).length > 0;
  const startCursors = new Map(
    types.map(({ type }) => [type, cursors?.[type] ?? (hasHistory ? now : FROM_THE_BEGINNING)])
  );

  const window = await readDreamWindow({
    esClient,
    spaceId,
    from: earliest([now, ...startCursors.values()]),
    to: now,
    maxMemories: MAX_MEMORIES_PER_RUN,
    signal,
  });
  const windowEnd = window.truncatedAt ?? now;
  const active = window.memories.filter((memory) => isActiveMemory(memory, runStart));
  const context = {
    now,
    writer: { uri: MEMORY_DREAMING_WRITER_URI, metadata: { space_id: spaceId } },
  };

  const fetchBatchCandidates = async (
    definition: LongTermMemoryTypeDefinition,
    memories: StoredMemoryDocument[]
  ) => {
    const { endpointTypes } = definition;
    const found = await fetchCandidates({
      esClient,
      spaceId,
      types: endpointTypes ?? [definition.type],
      memories,
      now,
      logger,
      signal,
    });
    const links = endpointTypes
      ? await findLinks({
          esClient,
          spaceId,
          ids: found.map(({ id }) => id),
          now,
          size: MAX_CANDIDATES_PER_TYPE,
          signal,
        })
      : [];
    const fitted = fitToTokenBudget({
      items: [...found, ...links.map(({ document }) => document)],
      maxTokens: MAX_CANDIDATE_TOKENS,
      format: formatLongTerm,
    });
    return endpointTypes
      ? {
          candidates: fitted.filter(({ type }) => type !== definition.type),
          links: fitted.filter(({ type }) => type === definition.type),
        }
      : { candidates: fitted };
  };

  const proposeOperations = async (
    definition: LongTermMemoryTypeDefinition,
    sessions: Map<string, StoredMemoryDocument[]>,
    candidates: StoredMemoryDocument[]
  ): Promise<DreamOperation[]> => {
    const response = await inferenceClient.output({
      id: `context_engine_memory_dream_${definition.type}`,
      connectorId,
      system: buildDreamSystemPrompt(definition),
      input: buildDreamInput({ sessions, candidates, definition }),
      schema: buildDreamOutputSchema(definition),
      abortSignal: signal,
      retry: { onValidationError: 1 },
    });
    return toOperations(response.output);
  };

  const dreamBatch = async (definition: LongTermMemoryTypeDefinition, { memories }: DreamBatch) => {
    const { candidates, links } = await fetchBatchCandidates(definition, memories);
    const sessions = groupBySession(memories);
    const { operations, dropped } = definition.endpointTypes
      ? await proposeLinkOperations({
          esClient,
          inferenceClient,
          connectorId,
          spaceId,
          definition,
          sessions,
          candidates,
          links: links ?? [],
          now,
          logger,
          signal,
        })
      : { operations: await proposeOperations(definition, sessions, candidates), dropped: 0 };
    const { applied, skipped } = await applyDreamOperations({
      esClient,
      spaceId,
      definition,
      operations,
      sources: new Map(memories.map((memory) => [memory.id, memory])),
      context,
      logger,
      generateId,
    });
    return { applied, skipped: skipped + dropped };
  };

  /** Dreams one type over the short-term memories after its cursor, up to `end`. */
  const dreamType = async (
    definition: LongTermMemoryTypeDefinition,
    { end, endIsCaughtUp }: { end: string; endIsCaughtUp: boolean }
  ): Promise<DreamTypeResult> => {
    const startCursor = startCursors.get(definition.type) ?? now;
    const batches = buildDreamBatches({
      memories: active.filter((memory) => {
        const time = toTime(memory['@timestamp']);
        return time > toTime(startCursor) && time <= toTime(end);
      }),
      maxTokens: MAX_BATCH_INPUT_TOKENS,
      format: formatShortTerm,
    });
    const result = { memoriesRead: 0, applied: 0, skipped: 0, batches: 0 };
    let cursor = startCursor;

    for (const batch of batches) {
      if (result.batches >= MAX_BATCHES_PER_RUN || getNow() - startedAt >= RUN_TIME_BUDGET_MS) {
        return { ...result, cursor, caughtUp: false };
      }
      try {
        signal?.throwIfAborted();
        const { applied, skipped } = await dreamBatch(definition, batch);
        result.memoriesRead += batch.memories.length;
        result.applied += applied;
        result.skipped += skipped;
        result.batches++;
        cursor = batch.endsAt;
      } catch (error) {
        const message = toErrorMessage(error);
        logger.warn(`Dreaming ${definition.label} in space '${spaceId}' failed: ${message}`);
        return { ...result, cursor, caughtUp: false, error: message };
      }
    }
    return { ...result, cursor: latest(cursor, end), caughtUp: endIsCaughtUp };
  };

  const results = new Map<string, DreamTypeResult>();
  const runStage = async (
    stage: readonly LongTermMemoryTypeDefinition[],
    getEnd: (definition: LongTermMemoryTypeDefinition) => { end: string; endIsCaughtUp: boolean }
  ) => {
    const stageResults = await pMap(
      stage,
      (definition) => dreamType(definition, getEnd(definition)),
      {
        concurrency: TYPE_CONCURRENCY,
      }
    );
    stage.forEach(({ type }, index) => results.set(type, stageResults[index]));
  };

  await runStage(
    types.filter(({ endpointTypes }) => endpointTypes === undefined),
    () => ({ end: windowEnd, endIsCaughtUp: window.truncatedAt === undefined })
  );
  // A linking type waits for a failed end type without counting as behind, so a failure alone
  // never schedules a catch-up run.
  await runStage(
    types.filter(({ endpointTypes }) => endpointTypes !== undefined),
    ({ endpointTypes = [] }) => {
      const ends = endpointTypes.flatMap((type) => {
        const endResult = results.get(type);
        return endResult ? [endResult] : [];
      });
      return {
        end: earliest([windowEnd, ...ends.map(({ cursor }) => cursor)]),
        endIsCaughtUp:
          window.truncatedAt === undefined &&
          ends.every(({ caughtUp, error }) => caughtUp || error !== undefined),
      };
    }
  );

  const behind = [...results.values()].filter(
    ({ caughtUp, error }) => !caughtUp && error === undefined
  );
  return {
    types: Object.fromEntries(results),
    caughtUp: behind.length === 0,
    ...(behind.length > 0 ? { behindFrom: earliest(behind.map(({ cursor }) => cursor)) } : {}),
  };
};
