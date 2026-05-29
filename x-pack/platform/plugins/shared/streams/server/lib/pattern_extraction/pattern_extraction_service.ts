/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Piscina from 'piscina';
import type { Logger } from '@kbn/logging';
import type { PatternExtractionWorkerConfig } from '../../../common/config';
import type {
  GrokExtractionPayload,
  GrokExtractionResult,
  DissectExtractionPayload,
  DissectExtractionResult,
} from './types';
import { executeTask } from './pattern_extraction_task';

export interface IPatternExtractionService {
  extractGrokPatterns(messages: string[]): Promise<GrokExtractionResult>;
  extractDissectPattern(messages: string[]): Promise<DissectExtractionResult>;
  stop(): Promise<void>;
}

export class PatternExtractionService implements IPatternExtractionService {
  private readonly enabled: boolean;
  private worker?: Piscina;
  private readonly config: PatternExtractionWorkerConfig;

  constructor(config: PatternExtractionWorkerConfig, private readonly logger: Logger) {
    this.config = config;
    this.enabled = config.enabled;

    if (this.enabled) {
      this.worker = this.createWorkerPool();
    }
  }

  private createWorkerPool(): Piscina {
    this.logger.debug(
      `Initializing pattern extraction worker pool (min=${this.config.minThreads} | max=${
        this.config.maxThreads
      } | idle=${this.config.idleTimeout.asMilliseconds()}ms)`
    );

    return new Piscina({
      filename: require.resolve('./pattern_extraction_wrapper.js'),
      minThreads: this.config.minThreads,
      maxThreads: this.config.maxThreads,
      maxQueue: this.config.maxQueue,
      idleTimeout: this.config.idleTimeout.asMilliseconds(),
    });
  }

  private async run(payload: GrokExtractionPayload): Promise<GrokExtractionResult>;
  private async run(payload: DissectExtractionPayload): Promise<DissectExtractionResult>;
  private async run(
    payload: GrokExtractionPayload | DissectExtractionPayload
  ): Promise<GrokExtractionResult | DissectExtractionResult> {
    if (!this.enabled) {
      return executeTask(payload);
    }
    if (!this.worker) {
      throw new Error('Pattern extraction worker pool was not initialized');
    }

    // Capture the pool reference at task-submission time. If the field is
    // swapped out from under us by another timed-out call (see catch
    // block below), we must still operate on the pool we actually
    // submitted to — and we must NOT destroy the new pool on the
    // current task's failure.
    const worker = this.worker;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.taskTimeout.asMilliseconds());

    try {
      return await worker.run(payload, { signal: controller.signal });
    } catch (err: unknown) {
      // Two failure modes need to surface as the canonical timeout:
      //  1. OUR timer fired and aborted the task (`AbortError` from
      //     Piscina) — recover the pool if it's still the active one.
      //  2. ANOTHER concurrent task's timer fired first, swapped the
      //     pool, and called `destroy()` on the pool WE submitted to.
      //     Piscina kills queued / in-flight tasks on a destroyed pool
      //     with `Error('Terminating worker thread')` — NOT an
      //     `AbortError`. Without normalization that message would
      //     leak to the caller, even though the root cause is exactly
      //     the same as case 1 (the slow-regex timeout).
      const ourTimerFired = controller.signal.aborted;
      const poolWasReplaced = this.worker !== worker;

      if (err instanceof Error && err.name === 'AbortError') {
        if (ourTimerFired && !poolWasReplaced) {
          this.worker = this.createWorkerPool();
          // Fire-and-forget: don't make the caller wait for the slow
          // worker thread to finish its CPU-bound loop before we can
          // surface the timeout. Errors from `destroy()` are logged but
          // not propagated — the new pool is already live.
          worker.destroy().catch((destroyErr: unknown) => {
            this.logger.warn(
              `Failed to destroy tainted pattern extraction worker pool: ${
                destroyErr instanceof Error ? destroyErr.message : String(destroyErr)
              }`
            );
          });
        }
        throw new Error('Pattern extraction task timed out');
      }

      if (poolWasReplaced) {
        throw new Error('Pattern extraction task timed out');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async extractGrokPatterns(messages: string[]): Promise<GrokExtractionResult> {
    this.logger.debug(`Queuing grok extraction for ${messages.length} messages`);
    const result = await this.run({ type: 'grok', messages });
    this.logger.debug(
      `Grok extraction completed: ${result.patternGroups.length} pattern group(s) found`
    );
    return result;
  }

  async extractDissectPattern(messages: string[]): Promise<DissectExtractionResult> {
    this.logger.debug(`Queuing dissect extraction for ${messages.length} messages`);
    const result = await this.run({ type: 'dissect', messages });
    this.logger.debug(
      `Dissect extraction completed: ${result.dissectPattern.fields.length} field(s) extracted`
    );
    return result;
  }

  async stop(): Promise<void> {
    await this.worker?.destroy();
  }
}
