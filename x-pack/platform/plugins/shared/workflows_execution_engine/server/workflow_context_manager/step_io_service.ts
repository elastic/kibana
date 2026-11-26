/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { JsonValue } from '@kbn/utility-types';
import type { SerializedError } from '@kbn/workflows';
import { executionIoId } from '@kbn/workflows/server';
import { StepIoCache } from './step_io_cache';
import type { WorkflowExecutionState } from './workflow_execution_state';
import type { OutputSizeStats } from '../lib/telemetry/events/workflows_execution/types';
import type { ExecutionsIoClient } from '../repositories/data_access_layer/implementations/executions_io/executions_io_data_client';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import { safeOutputSize } from '../step/errors';

export type { StepIoType } from './step_io_cache';

export type StepIoBatchValue = JsonValue | SerializedError | null;

/** Durable id + accessibility id for a step IO read or write. */
export interface StepIoRef {
  /** Step-execution id used for state / Elasticsearch. */
  executionId: string;
  /** Accessibility id (step + parallel lineage); service composes the LRU key with `type`. */
  contextId: string;
}

export interface StepIoWriteArgs {
  executionId: string;
  contextId: string;
  type: 'input' | 'output';
  value: JsonValue | null;
  sizeBytes?: number;
}

export interface StepIoReadBatchArgs {
  type: 'input' | 'output' | 'error';
  refs: ReadonlyArray<StepIoRef>;
}

export interface StepIoServiceInit {
  stepRepository: StepExecutionRepository;
  /** When set, payloads are stored on the executions IO stream as well as the step record. */
  ioClient?: ExecutionsIoClient;
  state: WorkflowExecutionState;
  /** Maximum total byte size for the output LRU cache. `Infinity` disables eviction entirely. */
  maxBytes?: number;
  /**
   * Maximum byte size of a single output that may enter the LRU
   * (`eviction.minPayloadSize`). `Infinity` admits any size that fits the budget.
   */
  maxEntryBytes?: number;
  logger?: Logger;
}

/**
 * Read-only IO surface used by node implementations and the context manager.
 */
export interface StepIoReader {
  readBatch(args: StepIoReadBatchArgs): Promise<ReadonlyMap<string, StepIoBatchValue>>;
}

/**
 * Reader + write surface used by the per-step runtime.
 */
export interface StepIoWriter extends StepIoReader {
  write(args: StepIoWriteArgs): void;
}

/**
 * Lifecycle surface used by the workflow execution loop and runtime manager only.
 */
export interface StepIoLifecycle {
  getOutputSizeStats(): OutputSizeStats;
  /** Writes queued payloads to the executions IO stream. Returns true when a create failed. */
  flush(): Promise<boolean>;
  hasPendingIo(): boolean;
}

/** Composes the opaque LRU key from IO type and accessibility context id. */
export const composeStepIoCacheKey = (
  type: 'input' | 'output' | 'error',
  contextId: string
): string => `${type}:${contextId}`;

/**
 * Owns the read cache for step outputs and routes IO reads/writes between
 * the LRU cache and `WorkflowExecutionState`.
 *
 * Callers supply `executionId` (storage) and `contextId` (accessibility).
 * The service composes the LRU key as `type` + `contextId` and does not
 * derive `contextId` from metadata. This PR admits outputs only.
 *
 * `readBatch` is the only fetch. `flush` writes queued payloads to the
 * executions IO stream; `WorkflowExecutionState` writes the step record.
 */
export class StepIoService implements StepIoWriter, StepIoLifecycle {
  private readonly stepRepository: StepExecutionRepository;
  private readonly ioClient?: ExecutionsIoClient;
  private readonly state: WorkflowExecutionState;
  private readonly cache: StepIoCache;
  /** Payloads waiting for the executions IO stream. The step record is flushed separately. */
  private pendingIo = new Map<string, { input?: JsonValue; output?: JsonValue | null }>();
  private readonly maxBytes: number;
  private readonly maxEntryBytes: number;
  private readonly logger?: Logger;
  /** Execution-wide sizes of outputs written with a measured byte count, for telemetry. */
  private readonly measuredSizes = new Map<string, number>();
  private measuredTotalBytes = 0;

  constructor({
    stepRepository,
    ioClient,
    state,
    maxBytes = Infinity,
    maxEntryBytes = Infinity,
    logger,
  }: StepIoServiceInit) {
    this.stepRepository = stepRepository;
    this.ioClient = ioClient;
    this.state = state;
    this.maxBytes = maxBytes;
    this.maxEntryBytes = maxEntryBytes;
    this.logger = logger;
    this.cache = new StepIoCache(maxBytes, logger);
  }

  /**
   * Returns every requested value. Resident values come back with no
   * Elasticsearch call: outputs from the live map or LRU, inputs from
   * state, errors from the step execution. One `getStepExecutionsByIds` covers
   * the misses. A value evicted by a later insert in the same batch is still
   * in the returned map. Map keys are `executionId`.
   */
  public async readBatch(
    args: StepIoReadBatchArgs
  ): Promise<ReadonlyMap<string, StepIoBatchValue>> {
    const refs = this.uniqueRefs(args.refs);
    if (args.type === 'error') {
      return this.readErrorBatch(refs);
    }
    if (args.type === 'input') {
      return this.readInputBatch(refs);
    }
    return this.readOutputBatch(refs);
  }

  // ----- IO writes ----------------------------------------------------------

  /**
   * Writes a step's input or output.
   *
   * - Both types are written to `WorkflowExecutionState` for persistence.
   * - Only `output` is admitted to the LRU (key = `type` + `contextId`).
   */
  public hasPendingIo(): boolean {
    return this.pendingIo.size > 0;
  }

  /**
   * Creates queued input and output documents on the executions IO stream.
   * A failed create stays queued. Step metadata, including the compatibility
   * copy of the payload, is flushed by `WorkflowExecutionState`.
   */
  public async flush(): Promise<boolean> {
    const ioClient = this.ioClient;
    if (!ioClient || this.pendingIo.size === 0) {
      return false;
    }

    const batch = this.pendingIo;
    this.pendingIo = new Map();
    const documents: Array<{
      executionId: string;
      type: 'input' | 'output';
      value: JsonValue | null;
      size: number;
    }> = [];

    for (const [executionId, part] of batch) {
      if (part.input !== undefined) {
        const size = safeOutputSize(part.input) ?? 0;
        documents.push({ executionId, type: 'input', value: part.input, size });
        this.recordSize(executionId, 'inputSize', size);
      }
      if ('output' in part) {
        const size = this.measuredSizes.get(executionId) ?? safeOutputSize(part.output) ?? 0;
        documents.push({ executionId, type: 'output', value: part.output ?? null, size });
        this.recordSize(executionId, 'outputSize', size);
      }
    }

    if (documents.length === 0) {
      return false;
    }

    try {
      const response = await ioClient.bulkCreate({ documents });
      if (response.errors) {
        this.restorePending(batch);
        this.recordIoFailure(
          `Failed to create execution IO document(s): ${JSON.stringify(
            response.items.filter((item) => item.error)
          )}`
        );
        return true;
      }
      this.clearIoFailure();
      return false;
    } catch (error) {
      this.restorePending(batch);
      this.recordIoFailure(error instanceof Error ? error.message : String(error));
      return true;
    }
  }

  public write({ executionId, contextId, type, value, sizeBytes }: StepIoWriteArgs): void {
    const current = this.pendingIo.get(executionId) ?? {};
    this.pendingIo.set(executionId, { ...current, [type]: value });
    this.state.setStepIo(executionId, { [type]: value });
    if (type === 'input') {
      return;
    }

    const measuredBytes =
      sizeBytes !== undefined && Number.isFinite(sizeBytes) && sizeBytes >= 0
        ? sizeBytes
        : undefined;
    const sizeForCache = measuredBytes ?? safeOutputSize(value) ?? undefined;
    if (measuredBytes !== undefined) {
      this.measuredTotalBytes += measuredBytes - (this.measuredSizes.get(executionId) ?? 0);
      this.measuredSizes.set(executionId, measuredBytes);
    }
    const cacheKey = composeStepIoCacheKey(type, contextId);
    if (this.outputFitsCache(sizeForCache)) {
      this.cache.set(cacheKey, { value, executionId }, sizeForCache);
    } else {
      this.cache.delete(cacheKey);
    }
  }

  /**
   * True when `bytes` may enter the LRU: at most `eviction.minPayloadSize` and
   * at most the total `eviction.maxCacheSize` budget (when those caps are finite).
   * Rejecting oversized entries here avoids `lru-cache.set` deleting an existing
   * smaller key for the same accessibility id when the entry cannot fit.
   */
  private outputFitsCache(bytes: number | undefined): boolean {
    if (bytes === undefined) {
      return false;
    }
    if (Number.isFinite(this.maxEntryBytes) && bytes > this.maxEntryBytes) {
      return false;
    }
    if (Number.isFinite(this.maxBytes) && bytes > this.maxBytes) {
      return false;
    }
    return true;
  }

  // ----- Telemetry ----------------------------------------------------------

  public getOutputSizeStats(): OutputSizeStats {
    return {
      totalBytes: this.measuredTotalBytes,
      stepCount: this.measuredSizes.size,
    };
  }

  /** Resident outputs: live map + LRU cache (used by memory gauges). */
  public getResidentOutputStats(): {
    liveOutputs: number;
    cacheEntries: number;
    cacheBytes: number;
  } {
    return {
      liveOutputs: this.state.countLiveOutputs(),
      cacheEntries: this.cache.size,
      cacheBytes: this.cache.totalBytes,
    };
  }

  private uniqueRefs(refs: ReadonlyArray<StepIoRef>): StepIoRef[] {
    const seen = new Set<string>();
    const unique: StepIoRef[] = [];
    for (const ref of refs) {
      if (!seen.has(ref.executionId)) {
        seen.add(ref.executionId);
        unique.push(ref);
      }
    }
    return unique;
  }

  /** Cache hit only when the entry was produced by this execution id. */
  private getCachedOutput(contextId: string, executionId: string): JsonValue | null | undefined {
    const entry = this.cache.get(composeStepIoCacheKey('output', contextId));
    if (entry === undefined || entry.executionId !== executionId) {
      return undefined;
    }
    return entry.value;
  }

  private async readOutputBatch(
    refs: readonly StepIoRef[]
  ): Promise<ReadonlyMap<string, JsonValue | null>> {
    const result = new Map<string, JsonValue | null>();
    const missing: StepIoRef[] = [];
    // Live before cache so an unflushed write wins over a stamped LRU entry.
    for (const { executionId, contextId } of refs) {
      const live = this.state.getStepIo(executionId, 'output');
      if (live !== undefined) {
        result.set(executionId, live);
      } else {
        const cached = this.getCachedOutput(contextId, executionId);
        if (cached !== undefined) {
          result.set(executionId, cached);
        } else {
          missing.push({ executionId, contextId });
        }
      }
    }
    if (missing.length === 0) {
      return result;
    }

    // Values already in the map stay there even if this fetch evicts them.
    const captured = new Map(result);
    const contextByExecutionId = new Map(missing.map((ref) => [ref.executionId, ref.contextId]));
    const docs = await this.fetchStoredValues(
      'output',
      missing.map((ref) => ref.executionId)
    );
    const fetched = this.retainFetchedOutputs(docs, contextByExecutionId);

    for (const { executionId, contextId } of refs) {
      const live = this.state.getStepIo(executionId, 'output');
      if (live !== undefined) {
        result.set(executionId, live);
      } else {
        const cached = this.getCachedOutput(contextId, executionId);
        if (cached !== undefined) {
          result.set(executionId, cached);
        } else if (fetched.has(executionId)) {
          result.set(executionId, fetched.get(executionId) ?? null);
        } else if (captured.has(executionId)) {
          result.set(executionId, captured.get(executionId) ?? null);
        }
      }
    }
    return result;
  }

  /**
   * Values to return for this fetch. Cache hits for every requested miss are
   * copied before any insert, so a later insert cannot drop them — including
   * ids Elasticsearch did not return (written during the fetch, then flushed
   * from state). That copy wins over the document: a flush may already have
   * removed a newer write from state.
   */
  private retainFetchedOutputs(
    docs: ReadonlyArray<{ id: string; output?: JsonValue | null }>,
    contextByExecutionId: ReadonlyMap<string, string>
  ): Map<string, JsonValue | null> {
    const fetched = new Map<string, JsonValue | null>();
    for (const [executionId, contextId] of contextByExecutionId) {
      if (this.state.getStepIo(executionId, 'output') === undefined) {
        const cached = this.getCachedOutput(contextId, executionId);
        if (cached !== undefined) {
          fetched.set(executionId, cached);
        }
      }
    }
    for (const doc of docs) {
      if (this.state.getStepIo(doc.id, 'output') === undefined && !fetched.has(doc.id)) {
        const output = doc.output ?? null;
        const size = safeOutputSize(output) ?? undefined;
        if (size !== undefined && !this.measuredSizes.has(doc.id)) {
          this.measuredSizes.set(doc.id, size);
          this.measuredTotalBytes += size;
        }
        const contextId = contextByExecutionId.get(doc.id);
        if (contextId !== undefined && this.outputFitsCache(size)) {
          this.cache.set(
            composeStepIoCacheKey('output', contextId),
            {
              value: output,
              executionId: doc.id,
            },
            size
          );
        }
        fetched.set(doc.id, output);
      }
    }
    return fetched;
  }

  /** Fetches inputs that state dropped after flush (finished steps). */
  private async readInputBatch(
    refs: readonly StepIoRef[]
  ): Promise<ReadonlyMap<string, JsonValue | null>> {
    const result = new Map<string, JsonValue | null>();
    const missing: string[] = [];
    for (const { executionId } of refs) {
      const live = this.state.getStepIo(executionId, 'input');
      if (live !== undefined) {
        result.set(executionId, live);
      } else if (
        this.state.getStepExecution(executionId) !== undefined &&
        this.state.isInputEvicted(executionId)
      ) {
        missing.push(executionId);
      }
    }
    if (missing.length === 0) {
      return result;
    }

    const docs = await this.fetchStoredValues('input', missing);
    const found = new Map(docs.map((doc) => [doc.id, doc.input ?? null]));
    for (const id of missing) {
      const live = this.state.getStepIo(id, 'input');
      result.set(id, live !== undefined ? live : found.get(id) ?? null);
    }
    return result;
  }

  /**
   * Reads a stored payload. The executions IO stream is the source when a client
   * is configured; a missing document falls back to the step record.
   */
  private async fetchStoredValues(
    type: 'input' | 'output',
    ids: string[]
  ): Promise<Array<{ id: string; input?: JsonValue | null; output?: JsonValue | null }>> {
    if (!this.ioClient) {
      return this.stepRepository.getStepExecutionsByIds(ids, ['id', type]);
    }

    const { items } = await this.ioClient.getByIds(ids.map((id) => executionIoId(type, id)));
    const found = new Map<string, JsonValue | null>();
    for (const item of items) {
      found.set(item.document.executionId, item.document.value ?? null);
    }
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length > 0) {
      const docs = await this.stepRepository.getStepExecutionsByIds(missing, ['id', type]);
      for (const doc of docs) {
        const value = type === 'input' ? doc.input : doc.output;
        if (!found.has(doc.id)) {
          found.set(doc.id, value ?? null);
        }
      }
    }
    return ids
      .filter((id) => found.has(id))
      .map((id) => ({ id, [type]: found.get(id) ?? null }));
  }

  private recordSize(executionId: string, field: 'inputSize' | 'outputSize', size: number): void {
    if (!this.state.getStepExecution(executionId)) {
      return;
    }
    this.state.updateStep(executionId, { id: executionId, [field]: size });
  }

  private restorePending(
    batch: ReadonlyMap<string, { input?: JsonValue; output?: JsonValue | null }>
  ): void {
    for (const [executionId, part] of batch) {
      const newer = this.pendingIo.get(executionId);
      this.pendingIo.set(executionId, newer ? { ...part, ...newer } : { ...part });
    }
  }

  private recordIoFailure(message: string): void {
    this.logger?.error(message);
    if (!this.state.getWorkflowExecution().error) {
      this.state.updateWorkflowExecution({
        error: { type: 'ExecutionIoPersistError', message },
      });
    }
  }

  private clearIoFailure(): void {
    if (this.state.getWorkflowExecution().error?.type === 'ExecutionIoPersistError') {
      this.state.updateWorkflowExecution({ error: null });
    }
  }

  /**
   * Errors live on the step execution. A loaded execution answers from memory.
   * Executions that are not loaded are fetched once.
   */
  private async readErrorBatch(
    refs: readonly StepIoRef[]
  ): Promise<ReadonlyMap<string, SerializedError | null>> {
    const result = new Map<string, SerializedError | null>();
    const missing: string[] = [];
    for (const { executionId } of refs) {
      const execution = this.state.getStepExecution(executionId);
      if (execution) {
        result.set(executionId, execution.error ?? null);
      } else {
        missing.push(executionId);
      }
    }
    if (missing.length === 0) {
      return result;
    }

    const docs = await this.stepRepository.getStepExecutionsByIds(missing, ['id', 'error']);
    for (const doc of docs) {
      const execution = this.state.getStepExecution(doc.id);
      result.set(doc.id, execution?.error ?? doc.error ?? null);
    }
    return result;
  }
}
