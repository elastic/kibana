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

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.taskTimeout.asMilliseconds());

    try {
      return await this.worker.run(payload, { signal: controller.signal });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        await this.worker.destroy().catch(() => {});
        this.worker = this.createWorkerPool();
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
