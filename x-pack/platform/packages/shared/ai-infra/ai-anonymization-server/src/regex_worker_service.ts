/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Piscina from 'piscina';
import type { Logger } from '@kbn/logging';
import type {
  AnonymizationRegexWorkerTaskPayload,
  AnonymizationWorkerConfig,
  DetectedMatch,
} from './types';
import { executeRegexRulesTask } from './execute_regex_rule_task';

function runTaskSync(payload: AnonymizationRegexWorkerTaskPayload): DetectedMatch[] {
  return executeRegexRulesTask(payload);
}

export class RegexWorkerService {
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
      `Initializing regex worker pool (min=${this.config.minThreads} | max=${
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

  /** Whether tasks run in isolated worker threads (as opposed to synchronously in-process). */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Execute a task in a worker.  Falls back to synchronous execution when the
   * worker is disabled
   */
  async run(payload: AnonymizationRegexWorkerTaskPayload): Promise<DetectedMatch[]> {
    if (!this.enabled) {
      return runTaskSync(payload);
    }
    if (!this.worker) {
      throw new Error('Regex worker pool was not initialized');
    }

    const timeoutMs = this.config.taskTimeout.asMilliseconds();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await this.worker.run(payload, { signal: controller.signal });
    } catch (err) {
      if (err?.name === 'AbortError') {
        // Piscina runs an abortable task on its own thread and terminates only that thread, so the
        // pool stays usable. Destroying it would reject every other request in flight with
        // "Terminating worker thread".
        throw new Error(`Anonymization patterns timed out after ${Math.round(timeoutMs / 1000)}s`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async stop(): Promise<void> {
    await this.worker?.destroy();
  }
}
