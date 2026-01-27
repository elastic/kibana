/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Piscina from 'piscina';
import type { Logger } from '@kbn/logging';
import type { AnonymizationRegexWorkerTaskPayload } from './types';
import type { AnonymizationWorkerConfig } from '../../config';
import type { DetectedMatch } from './types';
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
      this.logger.debug(
        `Initializing regex worker pool (min=${this.config.minThreads} | max=${
          this.config.maxThreads
        } | idle=${this.config.idleTimeout.asMilliseconds()}ms)`
      );

      this.worker = new Piscina({
        filename: require.resolve('./regex_worker_wrapper.js'),
        minThreads: this.config.minThreads,
        maxThreads: this.config.maxThreads,
        maxQueue: this.config.maxQueue,
        idleTimeout: this.config.idleTimeout.asMilliseconds(),
      });
    }
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

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.taskTimeout.asMilliseconds());

    try {
      return await this.worker.run(payload, { signal: controller.signal });
    } catch (err) {
      if (err?.name === 'AbortError') {
        if (this.worker.threads.length > 0) {
          // Attempt to terminate stuck threads
          await Promise.all(
            this.worker.threads.map(async (thread) => {
              try {
                await thread.terminate();
              } catch (e) {
                // Ignore termination errors
              }
            })
          );
        }
        throw new Error('Regex anonymization task timed out');
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
