/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ElasticsearchServiceStart } from '@kbn/core/server';
import type { DecisionQuestion } from '@kbn/inference-common';
import { isInferenceRequestError } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { BaseDecisionProviderOptions } from './base_decision_provider';
import { BaseDecisionProvider } from './base_decision_provider';
import type { DecisionProviderParams, DecisionProviderResult } from './types';
import { DecisionProviderUnavailableError } from './types';

interface DecisionEndpointsResponse {
  endpoints?: Array<{ inference_id: string }>;
}

/**
 * Answers through the inference client's `decide()`, as the requesting user. Uses `inferenceId`
 * when configured, else the first `decision` endpoint the cluster lists.
 */
export class DecisionModelProvider extends BaseDecisionProvider {
  readonly id = 'decision_model';

  private readonly inference: InferenceServerStart;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly inferenceId?: string;

  constructor({
    inference,
    elasticsearch,
    inferenceId,
    ...options
  }: BaseDecisionProviderOptions & {
    inference: InferenceServerStart;
    elasticsearch: ElasticsearchServiceStart;
    inferenceId?: string;
  }) {
    super(options);
    this.inference = inference;
    this.elasticsearch = elasticsearch;
    this.inferenceId = inferenceId;
  }

  protected async ask({
    request,
    input,
    questions,
    signal,
  }: DecisionProviderParams): Promise<DecisionProviderResult> {
    const esClient = this.elasticsearch.client.asScoped(request).asCurrentUser;
    const inferenceId = await this.resolveInferenceId(esClient, signal);
    const [first, ...rest] = questions;

    try {
      const { answers } = await this.inference
        .getClient({ request })
        .decide<[DecisionQuestion, ...DecisionQuestion[]]>(
          { input, inferenceId, abortSignal: signal },
          first,
          ...rest
        );

      return { inferenceId, answers };
    } catch (error) {
      // `decide()` reports a missing endpoint as a 404: it won't answer until the cluster changes.
      if (isInferenceRequestError(error) && error.meta.status === 404) {
        throw new DecisionProviderUnavailableError(error.message);
      }

      throw error;
    }
  }

  /** The configured inference id, else the first `decision` endpoint the cluster lists. */
  private async resolveInferenceId(
    esClient: ElasticsearchClient,
    signal: AbortSignal
  ): Promise<string> {
    if (this.inferenceId) {
      return this.inferenceId;
    }

    const { endpoints = [] } = await esClient.transport.request<DecisionEndpointsResponse>(
      { method: 'GET', path: '/_inference/decision/_all' },
      { signal }
    );
    const [first] = endpoints;

    if (!first) {
      throw new DecisionProviderUnavailableError('No decision inference endpoint on the cluster');
    }

    return first.inference_id;
  }
}
