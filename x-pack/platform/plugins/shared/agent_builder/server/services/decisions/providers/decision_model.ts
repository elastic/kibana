/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DecisionAnswer, DecisionQuestion } from '@kbn/inference-common';
import { isInferenceRequestError } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { BaseDecisionProviderOptions } from './base_decision_provider';
import { BaseDecisionProvider } from './base_decision_provider';
import type { DecisionProviderParams, DecisionProviderResult } from './types';
import { DecisionProviderUnavailableError } from './types';

/**
 * Answers through the inference client's `decide()`, which calls the Elasticsearch `decision`
 * task as the requesting user. Uses `inferenceId` when configured, else the cluster's first
 * `decision` endpoint.
 */
export class DecisionModelProvider extends BaseDecisionProvider {
  readonly id = 'decision_model';

  private readonly inference: InferenceServerStart;
  private readonly inferenceId?: string;

  constructor({
    inference,
    inferenceId,
    ...options
  }: BaseDecisionProviderOptions & {
    inference: InferenceServerStart;
    inferenceId?: string;
  }) {
    super(options);
    this.inference = inference;
    this.inferenceId = inferenceId;
  }

  protected async ask({
    request,
    input,
    questions,
    signal,
  }: DecisionProviderParams): Promise<DecisionProviderResult> {
    const client = this.inference.getClient({ request });
    const options = { input, inferenceId: this.inferenceId, abortSignal: signal };
    const [first, ...rest] = questions;

    try {
      if (rest.length === 0) {
        const { inferenceId, answer } = await client.decide(options, first);
        return { inferenceId, answers: [answer] };
      }

      const { inferenceId, answers } = await client.decide(
        options,
        first,
        ...(rest as [DecisionQuestion, ...DecisionQuestion[]])
      );

      return { inferenceId, answers: answers as DecisionAnswer[] };
    } catch (error) {
      // `decide()` reports a missing endpoint or task type as a 404: it won't answer until the cluster changes.
      if (isInferenceRequestError(error) && error.meta.status === 404) {
        throw new DecisionProviderUnavailableError(error.message);
      }

      throw error;
    }
  }
}
