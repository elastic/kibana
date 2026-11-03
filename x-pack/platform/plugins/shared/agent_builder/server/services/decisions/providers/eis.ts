/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, ElasticsearchServiceStart } from '@kbn/core/server';
import { parseDecisionResponse } from './parse_decision_response';
import type { DecisionProvider } from './types';
import { DecisionProviderUnavailableError } from './types';

interface DecisionEndpointsResponse {
  endpoints?: Array<{ inference_id: string }>;
}

/** Errors that will not go away without a config or cluster change: a missing endpoint or task type. */
const isPermanentEsError = (error: unknown): boolean => {
  if (!(error instanceof errors.ResponseError)) {
    return false;
  }

  const { statusCode, body } = error.meta;

  return statusCode === 404 || (statusCode === 400 && JSON.stringify(body).includes('task_type'));
};

const resolveInferenceId = async ({
  esClient,
  inferenceId,
  signal,
}: {
  esClient: ElasticsearchClient;
  inferenceId?: string;
  signal: AbortSignal;
}): Promise<string> => {
  if (inferenceId) {
    return inferenceId;
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
};

/**
 * Answers through the Elasticsearch `decision` inference task, as the requesting user. Uses
 * `inferenceId` when configured, else the first `decision` endpoint the cluster lists.
 */
export const createEisDecisionProvider = ({
  elasticsearch,
  inferenceId: configuredId,
}: {
  elasticsearch: ElasticsearchServiceStart;
  inferenceId?: string;
}): DecisionProvider => ({
  id: 'eis',
  decide: async ({ request, input, questions, signal }) => {
    const esClient = elasticsearch.client.asScoped(request).asCurrentUser;

    try {
      const inferenceId = await resolveInferenceId({
        esClient,
        inferenceId: configuredId,
        signal,
      });

      const body = await esClient.transport.request(
        {
          method: 'POST',
          path: `/_inference/decision/${encodeURIComponent(inferenceId)}`,
          body: { input, task_settings: { questions } },
        },
        { signal }
      );

      return { inferenceId, answers: parseDecisionResponse(body, Object.keys(questions)) };
    } catch (error) {
      if (isPermanentEsError(error)) {
        throw new DecisionProviderUnavailableError(error.message);
      }

      throw error;
    }
  },
});
