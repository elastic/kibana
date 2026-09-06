/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Piscina from 'piscina';
import type { Logger } from '@kbn/logging';
import type { AnonymizationWorkerConfig } from '../../config';
import type { PiiRegexWorkerTaskPayload, PiiRegexMatch, PiiDetectionFailureMode } from './types';
import { executeRegexRules } from './execute_regex_rules';

function runSync(payload: PiiRegexWorkerTaskPayload): PiiRegexMatch[] {
  return executeRegexRules(payload);
}

/**
 * Manages the Piscina worker pool for the workflow-driven PII regex executor.
 *
 * Separate from the o11y `RegexWorkerService` in `chat_complete/anonymization/`.
 * This pool is exclusively used by the workflow-driven anonymization path.
 */
export class PiiRegexWorkerService {
  private readonly enabled: boolean;
  private worker?: Piscina;
  private readonly config: AnonymizationWorkerConfig;

  constructor(config: AnonymizationWorkerConfig, private readonly logger: Logger) {
    this.config = config;
    this.enabled = config.enabled;

    if (this.enabled) {
      this.worker = this.createWorkerPool();
    }
  }

  private createWorkerPool(): Piscina {
    this.logger.debug(
      `Initializing PII regex worker pool (min=${this.config.minThreads} | max=${
        this.config.maxThreads
      } | idle=${this.config.idleTimeout.asMilliseconds()}ms)`
    );

    return new Piscina({
      filename: require.resolve('./regex_worker_wrapper.js'),
      minThreads: this.config.minThreads,
      maxThreads: this.config.maxThreads,
      maxQueue: this.config.maxQueue,
      idleTimeout: this.config.idleTimeout.asMilliseconds(),
    });
  }

  /**
   * Executes PII regex rules against records.
   *
   * Throws when a rule has an invalid RE2 pattern and `failureMode` is `'block'`
   * (the default). With `'allow_unsafe'`, logs and skips the offending rule.
   *
   * Falls back to synchronous execution when the worker pool is disabled.
   */
  async run(
    payload: PiiRegexWorkerTaskPayload,
    failureMode: PiiDetectionFailureMode = 'block'
  ): Promise<PiiRegexMatch[]> {
    try {
      if (!this.enabled) {
        return runSync(payload);
      }
      if (!this.worker) {
        throw new Error('PII regex worker pool was not initialized');
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.taskTimeout.asMilliseconds());

      try {
        return await this.worker.run(payload, { signal: controller.signal });
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          await this.worker.destroy().catch(() => {});
          this.worker = this.createWorkerPool();
          throw new Error(
            `PII regex detection task timed out after ${this.config.taskTimeout.asMilliseconds()}ms`
          );
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      if (failureMode === 'allow_unsafe') {
        this.logger.error('PII regex detection failed; proceeding without anonymization', {
          error: err,
        });
        return [];
      }
      throw err;
    }
  }

  async stop(): Promise<void> {
    await this.worker?.destroy();
  }
}
