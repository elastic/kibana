/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncate } from 'lodash';
import type { InferenceInferenceRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { assertNever } from '@kbn/std';
import type { InferenceServerClient } from '@kbn/inference-plugin/server';
import { MessageRole, isInferenceError } from '@kbn/inference-common';
import type { TestEndpointResponse, TestableTaskType } from '../../common/types';

export const TEST_TIMEOUT_MS = 30_000;
// Elasticsearch gives up before the abort timer so that its own timeout status is reported
const ES_TIMEOUT = `${TEST_TIMEOUT_MS - 5_000}ms`;
export const MAX_REASON_LENGTH = 1_000;

const TEST_MESSAGE = 'Reply "Hello world"';
const TEST_EMBEDDING_TEXT = 'Hello Elastic';
const TEST_RERANK_QUERY = 'What is the capital of Canada?';
const TEST_RERANK_DOCUMENTS = ['Toronto', 'Ottawa', 'Calgary'];

interface TestInferenceEndpointOptions {
  inferenceClient: Pick<InferenceServerClient, 'chatComplete'>;
  esClient: ElasticsearchClient;
  logger: Logger;
  taskType: TestableTaskType;
  inferenceId: string;
}

interface TestRunResult {
  raw: unknown;
  statusCode?: number;
}

const runInference = async (
  esClient: ElasticsearchClient,
  params: InferenceInferenceRequest,
  signal: AbortSignal
): Promise<TestRunResult> => {
  const { body, statusCode } = await esClient.inference.inference(
    { ...params, timeout: ES_TIMEOUT },
    { signal, meta: true, maxRetries: 0 }
  );
  return { raw: body, statusCode };
};

const runTest = async (
  { inferenceClient, esClient, taskType, inferenceId }: TestInferenceEndpointOptions,
  signal: AbortSignal
): Promise<TestRunResult> => {
  switch (taskType) {
    case 'chat_completion':
      return {
        raw: await inferenceClient.chatComplete({
          connectorId: inferenceId,
          messages: [{ role: MessageRole.User, content: TEST_MESSAGE }],
          maxRetries: 0,
          abortSignal: signal,
        }),
        // chatComplete does not expose the HTTP status of the underlying call, so none is reported
      };
    case 'completion':
      return runInference(
        esClient,
        { task_type: taskType, inference_id: inferenceId, input: TEST_MESSAGE },
        signal
      );
    case 'text_embedding':
    case 'embedding':
    case 'sparse_embedding':
      return runInference(
        esClient,
        { task_type: taskType, inference_id: inferenceId, input: TEST_EMBEDDING_TEXT },
        signal
      );
    case 'rerank':
      return runInference(
        esClient,
        {
          task_type: taskType,
          inference_id: inferenceId,
          query: TEST_RERANK_QUERY,
          input: TEST_RERANK_DOCUMENTS,
        },
        signal
      );
    default:
      return assertNever(taskType);
  }
};

const getStatusCode = (error: unknown): number | undefined => {
  if (isInferenceError(error) && typeof error.meta?.status === 'number') {
    return error.meta.status;
  }
  if (isResponseError(error)) {
    return error.statusCode;
  }
  return undefined;
};

const getReason = (error: unknown): string => {
  const reason = isResponseError(error)
    ? (error.body?.error?.reason ?? error.message)
    : error instanceof Error
      ? error.message
      : String(error);
  return truncate(reason, { length: MAX_REASON_LENGTH });
};

export const testInferenceEndpoint = async (
  options: TestInferenceEndpointOptions
): Promise<TestEndpointResponse> => {
  const { logger, taskType, inferenceId } = options;
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), TEST_TIMEOUT_MS);
  const startedAt = performance.now();
  const getLatencyMs = () => Math.round(performance.now() - startedAt);

  try {
    const { raw, statusCode } = await runTest(options, abortController.signal);
    return {
      ok: true,
      latencyMs: getLatencyMs(),
      ...(statusCode !== undefined && { statusCode }),
      raw,
    };
  } catch (error) {
    const statusCode = getStatusCode(error);
    const statusSuffix = statusCode !== undefined ? ` with status [${statusCode}]` : '';
    logger.warn(`Test of inference endpoint [${inferenceId}] (${taskType}) failed${statusSuffix}`);
    return {
      ok: false,
      latencyMs: getLatencyMs(),
      ...(statusCode !== undefined && { statusCode }),
      error: { reason: getReason(error) },
    };
  } finally {
    clearTimeout(timeout);
  }
};
