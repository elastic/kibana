/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Piscina from 'piscina';
import type { Logger } from '@kbn/logging';
import type { WorkflowAnonymizationWorkerConfig } from '../../config';
import type { PiiRegexWorkerTaskPayload, PiiRegexMatch, PiiDetectionFailureMode } from './types';
import { compileRule, executeRegexRules } from './execute_regex_rules';

function runSync(payload: PiiRegexWorkerTaskPayload): PiiRegexMatch[] {
  // On the sync path there is no timeout to contain catastrophic backtracking, so
  // enforce RE2-only patterns. executeRegexRules throws from compileRule on first
  // non-RE2 pattern when re2Only is true.
  return executeRegexRules(payload, { re2Only: true });
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
  private readonly config: WorkflowAnonymizationWorkerConfig;

  constructor(config: WorkflowAnonymizationWorkerConfig, private readonly logger: Logger) {
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
   * Throws when a rule has an invalid pattern and `failureMode` is `'block'` (the default).
   * With `'allow_unsafe'`, invalid rules are logged individually and skipped; the remaining
   * rules still run and return their matches. Infrastructure failures (timeout, queue
   * saturation) return no matches only in `'allow_unsafe'` mode; in `'block'` mode they throw.
   *
   * When the worker pool is disabled, runs synchronously on the main event loop.
   * In that mode only RE2-compilable patterns are accepted; patterns that require
   * native RegExp (lookahead / lookbehind / backreferences) are also skipped (or rejected
   * in `'block'` mode) to prevent unbounded backtracking on the event loop.
   */
  async run(
    payload: PiiRegexWorkerTaskPayload,
    failureMode: PiiDetectionFailureMode = 'block'
  ): Promise<PiiRegexMatch[]> {
    const re2Only = !this.enabled;
    const { effectivePayload, originalRuleIndices } =
      failureMode === 'allow_unsafe'
        ? this.filterRules(payload, re2Only)
        : { effectivePayload: payload, originalRuleIndices: undefined };

    try {
      const results = !this.enabled
        ? runSync(effectivePayload)
        : await this.runInWorker(effectivePayload);

      // filterRules compacts the rules array; remap ruleIndex back to the caller's
      // original payload so precedence and lookups stay correct.
      if (originalRuleIndices === undefined) {
        return results;
      }
      return results.map((match) => ({
        ...match,
        ruleIndex: originalRuleIndices[match.ruleIndex],
      }));
    } catch (err) {
      if (failureMode === 'allow_unsafe') {
        // Only infrastructure failures reach here (timeout, saturation, worker crash).
        // Rule-level errors were already handled by filterRules above.
        this.logger.error('PII regex detection failed; proceeding without anonymization', {
          error: err,
        });
        return [];
      }
      throw err;
    }
  }

  private async runInWorker(payload: PiiRegexWorkerTaskPayload): Promise<PiiRegexMatch[]> {
    if (!this.worker) {
      throw new Error('PII regex worker pool was not initialized');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.taskTimeout.asMilliseconds());

    try {
      return await this.worker.run(payload, { signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(
          `PII regex detection task timed out after ${this.config.taskTimeout.asMilliseconds()}ms`
        );
      }
      // Piscina does not expose a stable error code; match on the message
      // (verified against piscina@5.3.1 dist/errors.js TaskQueueAtLimit).
      if (err instanceof Error && err.message === 'Task queue is at limit') {
        throw new Error(
          `PII regex detection rejected: worker queue at capacity (maxQueue=${this.config.maxQueue})`
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private filterRules(
    payload: PiiRegexWorkerTaskPayload,
    re2Only: boolean
  ): { effectivePayload: PiiRegexWorkerTaskPayload; originalRuleIndices: number[] } {
    const safeRules: PiiRegexWorkerTaskPayload['rules'][number][] = [];
    const originalRuleIndices: number[] = [];

    payload.rules.forEach((rule, index) => {
      try {
        compileRule(rule.pattern, re2Only);
        safeRules.push(rule);
        originalRuleIndices.push(index);
      } catch (err) {
        this.logger.warn('PII regex rule skipped: pattern could not be compiled', {
          entityClass: rule.entityClass,
          error: err,
        });
      }
    });

    return {
      effectivePayload: { ...payload, rules: safeRules },
      originalRuleIndices,
    };
  }

  async stop(): Promise<void> {
    await this.worker?.destroy();
  }
}
