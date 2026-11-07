/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DecisionAttemptParams,
  DecisionProvider,
  DecisionProviderId,
  DecisionProviderParams,
  DecisionProviderResult,
} from './types';
import { DecisionProviderAbortedError, isDecisionProviderUnavailableError } from './types';

export interface BaseDecisionProviderOptions {
  /** How long the provider gets before the next one is tried. */
  timeoutMs: number;
  /** How long the provider is skipped after it reports it cannot answer. */
  unavailableTtlMs: number;
}

/**
 * Runs a provider's {@link BaseDecisionProvider.ask} with a deadline and the caller's abort
 * signal, and skips the provider for `unavailableTtlMs` after it reports it cannot answer.
 */
export abstract class BaseDecisionProvider implements DecisionProvider {
  abstract readonly id: DecisionProviderId;

  private readonly timeoutMs: number;
  private readonly unavailableTtlMs: number;
  private skipUntil = 0;

  constructor({ timeoutMs, unavailableTtlMs }: BaseDecisionProviderOptions) {
    this.timeoutMs = timeoutMs;
    this.unavailableTtlMs = unavailableTtlMs;
  }

  public get unavailableUntil(): Date | undefined {
    return this.isAvailable() ? undefined : new Date(this.skipUntil);
  }

  isAvailable(): boolean {
    return Date.now() >= this.skipUntil;
  }

  async decide({ abortSignal, ...params }: DecisionAttemptParams): Promise<DecisionProviderResult> {
    if (abortSignal?.aborted) {
      throw new DecisionProviderAbortedError(`Decision provider [${this.id}] aborted`);
    }

    const { timeoutMs } = this;
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    let timer: ReturnType<typeof setTimeout> | undefined;

    abortSignal?.addEventListener('abort', onAbort, { once: true });

    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new DecisionProviderAbortedError(
            `Decision provider [${this.id}] timed out after ${timeoutMs}ms`
          )
        );
        controller.abort();
      }, timeoutMs);

      controller.signal.addEventListener('abort', () =>
        reject(new DecisionProviderAbortedError(`Decision provider [${this.id}] aborted`))
      );
    });

    try {
      return await Promise.race([this.ask({ ...params, signal: controller.signal }), deadline]);
    } catch (error) {
      if (isDecisionProviderUnavailableError(error)) {
        this.skipUntil = Date.now() + this.unavailableTtlMs;
      }

      throw error;
    } finally {
      clearTimeout(timer);
      abortSignal?.removeEventListener('abort', onAbort);
    }
  }

  /**
   * Answers the questions. Throws {@link DecisionProviderUnavailableError} when the provider
   * cannot answer for now, and any other error for a failure worth retrying.
   */
  protected abstract ask(params: DecisionProviderParams): Promise<DecisionProviderResult>;
}
