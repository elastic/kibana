/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { DecisionAnswer, DecisionQuestion } from '@kbn/agent-builder-server';

export type DecisionProviderId = 'openrouter' | 'eis' | 'fast_model';

export interface DecisionProviderParams {
  request: KibanaRequest;
  input: string;
  questions: Record<string, DecisionQuestion>;
  signal: AbortSignal;
}

export interface DecisionProviderResult {
  answers: Record<string, DecisionAnswer>;
  /** What answered, for logs: an inference endpoint, a model or a connector. */
  inferenceId: string;
}

/** One way of answering decision questions. */
export interface DecisionProvider {
  id: DecisionProviderId;
  /** Overrides the service's per-provider timeout. */
  timeoutMs?: number;
  /**
   * Answers the questions. Throws {@link DecisionProviderUnavailableError} when the provider can
   * never answer on this Kibana instance, and any other error for a failure worth retrying.
   */
  decide(params: DecisionProviderParams): Promise<DecisionProviderResult>;
}

/** The provider cannot answer until Kibana restarts, e.g. it is not configured or has no model. */
export class DecisionProviderUnavailableError extends Error {
  readonly permanent = true;

  constructor(message: string) {
    super(message);
    this.name = 'DecisionProviderUnavailableError';
  }
}

export const isDecisionProviderUnavailableError = (
  error: unknown
): error is DecisionProviderUnavailableError => error instanceof DecisionProviderUnavailableError;
