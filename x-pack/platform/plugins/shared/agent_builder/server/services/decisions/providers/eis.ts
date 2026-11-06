/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, ElasticsearchServiceStart } from '@kbn/core/server';
import { parseDecisionResponse } from './parse_decision_response';
import { toKeyedQuestions } from './question_keys';
import type { BaseDecisionProviderOptions } from './base_decision_provider';
import { BaseDecisionProvider } from './base_decision_provider';
import type { DecisionProviderParams, DecisionProviderResult } from './types';
import { DecisionProviderUnavailableError } from './types';

interface DecisionEndpointsResponse {
  endpoints?: Array<{ inference_id: string }>;
}

/**
 * Answers through the Elasticsearch `decision` inference task, as the requesting user. Uses
 * `inferenceId` when configured, else the first `decision` endpoint the cluster lists.
 */
export class EisDecisionProvider extends BaseDecisionProvider {
  readonly id = 'eis';

  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly inferenceId?: string;

  constructor({
    elasticsearch,
    inferenceId,
    ...options
  }: BaseDecisionProviderOptions & {
    elasticsearch: ElasticsearchServiceStart;
    inferenceId?: string;
  }) {
    super(options);
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

    try {
      const inferenceId = await this.resolveInferenceId(esClient, signal);

      const body = await esClient.transport.request(
        {
          method: 'POST',
          path: `/_inference/decision/${encodeURIComponent(inferenceId)}`,
          body: { input, task_settings: { questions: toKeyedQuestions(questions) } },
        },
        { signal }
      );

      return { inferenceId, answers: parseDecisionResponse(body, questions) };
    } catch (error) {
      if (this.isPermanentEsError(error)) {
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

  /** Errors that need a config or cluster change to go away: a missing endpoint or task type. */
  private isPermanentEsError(error: unknown): boolean {
    if (!(error instanceof errors.ResponseError)) {
      return false;
    }

    const { statusCode, body } = error.meta;

    return statusCode === 404 || (statusCode === 400 && JSON.stringify(body).includes('task_type'));
  }
}
