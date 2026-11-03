/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ElasticsearchServiceStart, Logger } from '@kbn/core/server';
import type { DecideParams, DecideResult, DecisionsStart } from '@kbn/agent-builder-server';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';
import type { AgentBuilderConfig } from '../../config';
import { parseDecisionResponse } from './parse_decision_response';

interface DecisionEndpointsResponse {
  endpoints?: Array<{ inference_id: string }>;
}

/**
 * Resolves the decision endpoint: the configured one, else the first the cluster lists.
 * Not cached, so each call sees the endpoints the calling user can reach.
 */
const resolveInferenceId = async ({
  esClient,
  configuredId,
  signal,
}: {
  esClient: ElasticsearchClient;
  configuredId?: string;
  signal: AbortSignal;
}): Promise<string | undefined> => {
  if (configuredId) {
    return configuredId;
  }

  const { endpoints = [] } = await esClient.transport.request<DecisionEndpointsResponse>(
    { method: 'GET', path: '/_inference/decision' },
    { signal }
  );

  return endpoints[0]?.inference_id;
};

/** Rejects once `timeoutMs` elapses or `signal` aborts, aborting `controller` either way. */
const createDeadline = ({
  timeoutMs,
  signal,
  controller,
}: {
  timeoutMs: number;
  signal?: AbortSignal;
  controller: AbortController;
}): { deadline: Promise<never>; clear: () => void } => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;

  const deadline = new Promise<never>((_, reject) => {
    const fail = (error: Error) => {
      controller.abort();
      reject(error);
    };

    onAbort = () => fail(new Error('Decision aborted'));

    if (signal?.aborted) {
      onAbort();
      return;
    }

    timer = setTimeout(() => fail(new Error(`Decision timed out after ${timeoutMs}ms`)), timeoutMs);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

  return {
    deadline,
    clear: () => {
      clearTimeout(timer);
      if (onAbort) {
        signal?.removeEventListener('abort', onAbort);
      }
    },
  };
};

/**
 * Creates the decision service, which asks the cluster's `decision` inference endpoint bounded
 * questions as the requesting user.
 */
export const createDecisionService = ({
  logger,
  elasticsearch,
  config,
}: {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  config: AgentBuilderConfig['decisionModel'];
}): DecisionsStart => {
  const decide = async ({
    request,
    input,
    questions,
    timeoutMs = config.timeoutMs,
    abortSignal,
  }: DecideParams): Promise<DecideResult> => {
    const questionNames = Object.keys(questions);
    const controller = new AbortController();
    const startedAt = Date.now();

    const run = async (): Promise<DecideResult> => {
      const esClient = elasticsearch.client.asScoped(request).asCurrentUser;

      const inferenceId = await resolveInferenceId({
        esClient,
        configuredId: config.inferenceId,
        signal: controller.signal,
      });

      if (!inferenceId) {
        logger.debug('No decision inference endpoint available');
        return { status: 'unavailable' };
      }

      const body = await esClient.transport.request(
        {
          method: 'POST',
          path: `/_inference/decision/${encodeURIComponent(inferenceId)}`,
          querystring: { timeout: `${timeoutMs}ms` },
          body: { input, task_settings: { questions } },
        },
        { signal: controller.signal, requestTimeout: timeoutMs }
      );

      const answers = parseDecisionResponse(body, questionNames);

      logger.debug(
        () =>
          `Decision from [${inferenceId}] in ${Date.now() - startedAt}ms: ${JSON.stringify(
            answers
          )}`
      );

      return { status: 'decided', answers, inferenceId };
    };

    return withActiveInferenceSpan(
      'decide',
      { attributes: { [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN' } },
      async () => {
        const { deadline, clear } = createDeadline({ timeoutMs, signal: abortSignal, controller });

        try {
          return await Promise.race([run(), deadline]);
        } catch (error) {
          const message = `Decision [${questionNames.join(', ')}] failed after ${
            Date.now() - startedAt
          }ms: ${error.message}`;

          // A timeout or abort is expected under load; anything else may mean a misconfigured endpoint or a changed response shape.
          if (controller.signal.aborted) {
            logger.debug(message);
          } else {
            logger.warn(message);
          }

          return { status: 'failed', error };
        } finally {
          clear();
        }
      }
    );
  };

  return { decide };
};
