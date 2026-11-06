/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { DecisionAnswer, DecisionQuestion } from '@kbn/agent-builder-server';

export type DecisionProviderId = 'eis' | 'fast_model';

export interface DecisionProviderParams {
  request: KibanaRequest;
  input: string;
  questions: readonly DecisionQuestion[];
  signal: AbortSignal;
}

export interface DecisionAttemptParams extends Omit<DecisionProviderParams, 'signal'> {
  abortSignal?: AbortSignal;
}

export interface DecisionProviderResult {
  /** One answer per question, in the questions' order. */
  answers: DecisionAnswer[];
  /** What answered, for logs: an inference endpoint, a model or a connector. */
  inferenceId: string;
}

/** One way of answering decision questions. */
export interface DecisionProvider {
  readonly id: DecisionProviderId;
  /** When a provider that reported it cannot answer is tried again, if it is being skipped. */
  readonly unavailableUntil: Date | undefined;
  isAvailable(): boolean;
  /**
   * Answers the questions within the provider's timeout. Throws
   * {@link DecisionProviderUnavailableError} when the provider cannot answer for now,
   * {@link DecisionProviderAbortedError} on a timeout or abort, and any other error for a failure
   * worth retrying.
   */
  decide(params: DecisionAttemptParams): Promise<DecisionProviderResult>;
}

export {
  DecisionProviderUnavailableError,
  isDecisionProviderUnavailableError,
} from './unavailable_error';
export { DecisionProviderAbortedError, isDecisionProviderAbortedError } from './aborted_error';
