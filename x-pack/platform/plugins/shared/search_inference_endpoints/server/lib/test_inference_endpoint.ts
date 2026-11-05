/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { InferenceServerClient } from '@kbn/inference-plugin/server';
import type { Message } from '@kbn/inference-common';
import { MessageRole, ToolChoiceType, isInferenceError } from '@kbn/inference-common';
import type {
  TestEndpointFailureCause,
  TestEndpointResponse,
  TestEndpointResult,
  TestEndpointToolCheck,
  TestableTaskType,
} from '../../common/types';

export const TEST_TIMEOUT_MS = 30_000;

const EMBEDDING_PREVIEW_SIZE = 8;
const SPARSE_TOP_TOKENS_SIZE = 5;

const TEST_TOOL_NAME = 'get_weather';
const TEST_TOOL_RESULT = 'Sunny';

const TEST_TOOLS = {
  [TEST_TOOL_NAME]: {
    description: 'Get the current weather for a city',
    schema: {
      type: 'object',
      properties: { city: { type: 'string', description: 'City name' } },
      required: ['city'],
    },
  },
} as const;

const NO_FEATURE_ENDPOINT_MESSAGE = 'No endpoint is available for feature';
const NO_CONNECTOR_MESSAGE = 'No connector or inference endpoint found';

const STATUS_IN_MESSAGE_REGEX = /status(?: code)? \[?(\d{3})\]?/i;

const getStatusCode = (error: unknown): number | undefined => {
  if (isInferenceError(error) && typeof error.meta?.status === 'number') {
    return error.meta.status;
  }
  if (isResponseError(error) && typeof error.statusCode === 'number') {
    return error.statusCode;
  }
  const message = error instanceof Error ? error.message : undefined;
  const match = message?.match(STATUS_IN_MESSAGE_REGEX);
  return match ? Number(match[1]) : undefined;
};

const getCause = (statusCode: number | undefined, timedOut: boolean): TestEndpointFailureCause => {
  if (timedOut) {
    return 'timeout';
  }
  switch (statusCode) {
    case 401:
    case 403:
      return 'auth';
    case 429:
      return 'quota';
    case 404:
      return 'not_found';
    case 400:
      return 'bad_request';
    case 408:
    case 504:
      return 'timeout';
    default:
      return statusCode !== undefined && statusCode >= 500 ? 'provider_error' : 'unknown';
  }
};

interface TestOutput {
  result: TestEndpointResult;
  raw: unknown;
  toolCheck?: TestEndpointToolCheck;
}

interface RunChatOptions {
  inferenceClient: Pick<InferenceServerClient, 'chatComplete'>;
  target: { featureId: string } | { connectorId: string };
  message: string;
  checkToolCalling?: boolean;
  signal: AbortSignal;
}

const runChat = async ({
  inferenceClient,
  target,
  message,
  checkToolCalling,
  signal,
}: RunChatOptions): Promise<TestOutput> => {
  const callModel = async (messages: Message[], toolChoice: ToolChoiceType | undefined) =>
    'featureId' in target
      ? await inferenceClient.chatComplete({
          featureId: target.featureId,
          messages,
          tools: checkToolCalling ? TEST_TOOLS : undefined,
          toolChoice,
          maxRetries: 0,
          abortSignal: signal,
        })
      : await inferenceClient.chatComplete({
          connectorId: target.connectorId,
          messages,
          tools: checkToolCalling ? TEST_TOOLS : undefined,
          toolChoice,
          maxRetries: 0,
          abortSignal: signal,
        });

  const messages: Message[] = [{ role: MessageRole.User, content: message }];
  const response = await callModel(
    messages,
    checkToolCalling ? ToolChoiceType.required : undefined
  );

  if (!checkToolCalling) {
    return { result: { type: 'text', content: response.content }, raw: response };
  }

  const toolCall = response.toolCalls.find(({ function: { name } }) => name === TEST_TOOL_NAME);
  if (!toolCall) {
    return {
      result: { type: 'text', content: response.content },
      raw: response,
      toolCheck: { passed: false, toolName: TEST_TOOL_NAME },
    };
  }

  const toolCheck = {
    passed: true,
    toolName: TEST_TOOL_NAME,
    arguments: toolCall.function.arguments,
    toolResult: TEST_TOOL_RESULT,
  };

  try {
    const followUp = await callModel(
      [
        ...messages,
        {
          role: MessageRole.Assistant,
          content: response.content || null,
          toolCalls: response.toolCalls,
        },
        ...response.toolCalls.map(({ toolCallId }) => ({
          role: MessageRole.Tool as const,
          name: TEST_TOOL_NAME,
          toolCallId,
          response: TEST_TOOL_RESULT,
        })),
      ],
      ToolChoiceType.auto
    );
    return {
      result: { type: 'text', content: followUp.content },
      raw: { toolCall: response, followUp },
      toolCheck,
    };
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }
    return {
      result: { type: 'text', content: response.content },
      raw: response,
      toolCheck: {
        ...toolCheck,
        followUpError: error instanceof Error ? error.message : String(error),
      },
    };
  }
};

interface TestInferenceEndpointOptions {
  inferenceClient: Pick<InferenceServerClient, 'chatComplete'>;
  esClient: ElasticsearchClient;
  taskType: TestableTaskType;
  inferenceId: string;
  message: string;
  documents?: string[];
  checkToolCalling?: boolean;
}

const runTest = async (
  {
    inferenceClient,
    esClient,
    taskType,
    inferenceId,
    message,
    documents = [],
    checkToolCalling,
  }: TestInferenceEndpointOptions,
  signal: AbortSignal
): Promise<TestOutput> => {
  const requestOptions = { signal };
  const timeout = `${TEST_TIMEOUT_MS / 1000}s`;

  switch (taskType) {
    case 'chat_completion':
      return runChat({
        inferenceClient,
        target: { connectorId: inferenceId },
        message,
        checkToolCalling,
        signal,
      });
    case 'completion': {
      const response = await esClient.inference.inference(
        { task_type: taskType, inference_id: inferenceId, input: message, timeout },
        requestOptions
      );
      return {
        result: { type: 'text', content: response?.completion?.[0]?.result ?? '' },
        raw: response,
      };
    }
    case 'text_embedding':
    case 'embedding': {
      const response = await esClient.inference.inference(
        { task_type: taskType, inference_id: inferenceId, input: message, timeout },
        requestOptions
      );
      const vectors =
        response?.text_embedding ??
        response?.embeddings ??
        response?.text_embedding_bytes ??
        response?.embeddings_bytes ??
        response?.text_embedding_bits ??
        response?.embeddings_bits;
      const embedding = vectors?.[0]?.embedding ?? [];
      return {
        result: {
          type: 'embedding',
          dimensions: embedding.length,
          preview: embedding.slice(0, EMBEDDING_PREVIEW_SIZE),
        },
        raw: response,
      };
    }
    case 'sparse_embedding': {
      const response = await esClient.inference.inference(
        { task_type: taskType, inference_id: inferenceId, input: message, timeout },
        requestOptions
      );
      const tokens = Object.entries(response?.sparse_embedding?.[0]?.embedding ?? {});
      return {
        result: {
          type: 'sparse_embedding',
          tokenCount: tokens.length,
          topTokens: tokens
            .sort(([, a], [, b]) => b - a)
            .slice(0, SPARSE_TOP_TOKENS_SIZE)
            .map(([token, weight]) => ({ token, weight })),
        },
        raw: response,
      };
    }
    case 'rerank': {
      const response = await esClient.inference.inference(
        {
          task_type: taskType,
          inference_id: inferenceId,
          query: message,
          input: documents,
          timeout,
        },
        requestOptions
      );
      return {
        result: {
          type: 'rerank',
          ranking: (response?.rerank ?? []).map(({ index, relevance_score: score, text }) => ({
            index,
            score,
            text: text ?? documents[index] ?? '',
          })),
        },
        raw: response,
      };
    }
  }
};

const getFailureCause = (
  reason: string,
  statusCode: number | undefined,
  timedOut: boolean
): TestEndpointFailureCause => {
  if (reason.startsWith(NO_FEATURE_ENDPOINT_MESSAGE)) {
    return 'no_endpoint';
  }
  if (reason.startsWith(NO_CONNECTOR_MESSAGE)) {
    return 'not_found';
  }
  return getCause(statusCode, timedOut);
};

const runWithTimeout = async (
  run: (signal: AbortSignal) => Promise<TestOutput>
): Promise<TestEndpointResponse> => {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), TEST_TIMEOUT_MS);
  const startedAt = performance.now();

  try {
    const output = await run(abortController.signal);
    return { ok: true, latencyMs: Math.round(performance.now() - startedAt), ...output };
  } catch (error) {
    const statusCode = getStatusCode(error);
    const reason = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - startedAt),
      error: {
        cause: getFailureCause(reason, statusCode, abortController.signal.aborted),
        reason,
        ...(statusCode !== undefined && { statusCode }),
      },
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const testInferenceEndpoint = (
  options: TestInferenceEndpointOptions
): Promise<TestEndpointResponse> => runWithTimeout((signal) => runTest(options, signal));

export const testChat = ({
  inferenceClient,
  target,
  message,
  checkToolCalling,
}: {
  inferenceClient: Pick<InferenceServerClient, 'chatComplete'>;
  target: { featureId: string } | { connectorId: string };
  message: string;
  checkToolCalling?: boolean;
}): Promise<TestEndpointResponse> =>
  runWithTimeout((signal) =>
    runChat({ inferenceClient, target, message, checkToolCalling, signal })
  );
