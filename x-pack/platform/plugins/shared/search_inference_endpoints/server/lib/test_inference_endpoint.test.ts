/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createInferenceProviderError } from '@kbn/inference-common';
import type { TestableTaskType } from '../../common/types';
import {
  MAX_REASON_LENGTH,
  TEST_TIMEOUT_MS,
  testInferenceEndpoint,
} from './test_inference_endpoint';

describe('testInferenceEndpoint', () => {
  const chatComplete = jest.fn();
  const inference = jest.fn();
  const inferenceClient = { chatComplete };
  const esClient = { inference: { inference } };
  const logger = loggingSystemMock.createLogger();

  const runTest = (taskType: TestableTaskType) =>
    testInferenceEndpoint({
      inferenceClient,
      esClient,
      logger,
      taskType,
      inferenceId: 'my-endpoint',
    } as unknown as Parameters<typeof testInferenceEndpoint>[0]);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('chat_completion', () => {
    it('sends a fixed message through the inference client', async () => {
      chatComplete.mockResolvedValue({ content: 'Hello world', toolCalls: [] });

      await runTest('chat_completion');

      expect(chatComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'my-endpoint',
          maxRetries: 0,
          messages: [{ role: 'user', content: 'Reply "Hello world"' }],
        })
      );
    });

    it('returns the raw response and the latency', async () => {
      chatComplete.mockResolvedValue({ content: 'Hello world', toolCalls: [] });

      const result = await runTest('chat_completion');

      expect(result).toEqual({
        ok: true,
        latencyMs: expect.any(Number),
        raw: { content: 'Hello world', toolCalls: [] },
      });
    });
  });

  describe('completion', () => {
    it('sends a fixed message to the endpoint and returns the raw response', async () => {
      inference.mockResolvedValue({
        body: { completion: [{ result: 'Hello world' }] },
        statusCode: 200,
      });

      const result = await runTest('completion');

      expect(inference).toHaveBeenCalledWith(
        expect.objectContaining({
          task_type: 'completion',
          inference_id: 'my-endpoint',
          input: 'Reply "Hello world"',
        }),
        expect.objectContaining({ signal: expect.any(AbortSignal), meta: true, maxRetries: 0 })
      );
      expect(result.raw).toEqual({ completion: [{ result: 'Hello world' }] });
    });

    it('lets Elasticsearch time out before the abort timer', async () => {
      inference.mockResolvedValue({ body: { completion: [] }, statusCode: 200 });

      await runTest('completion');

      expect(inference).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: `${TEST_TIMEOUT_MS - 5_000}ms` }),
        expect.anything()
      );
    });

    it('returns the status code from the Elasticsearch response', async () => {
      inference.mockResolvedValue({ body: { completion: [] }, statusCode: 201 });

      const result = await runTest('completion');

      expect(result.statusCode).toBe(201);
    });
  });

  describe.each<TestableTaskType>(['text_embedding', 'embedding', 'sparse_embedding'])(
    '%s',
    (taskType) => {
      it('sends a fixed text and returns the raw response', async () => {
        inference.mockResolvedValue({
          body: { embeddings: [{ embedding: [0.1, 0.2] }] },
          statusCode: 200,
        });

        const result = await runTest(taskType);

        expect(inference).toHaveBeenCalledWith(
          expect.objectContaining({ task_type: taskType, input: 'Hello Elastic' }),
          expect.anything()
        );
        expect(result.raw).toEqual({ embeddings: [{ embedding: [0.1, 0.2] }] });
      });
    }
  );

  describe('rerank', () => {
    it('sends a fixed query and documents and returns the raw response', async () => {
      inference.mockResolvedValue({
        body: { rerank: [{ index: 1, relevance_score: 0.9 }] },
        statusCode: 200,
      });

      const result = await runTest('rerank');

      expect(inference).toHaveBeenCalledWith(
        expect.objectContaining({
          task_type: 'rerank',
          query: 'What is the capital of Canada?',
          input: ['Toronto', 'Ottawa', 'Calgary'],
        }),
        expect.anything()
      );
      expect(result.raw).toEqual({ rerank: [{ index: 1, relevance_score: 0.9 }] });
    });
  });

  describe('failures', () => {
    it('returns the reason and status code of a provider failure', async () => {
      chatComplete.mockRejectedValue(
        createInferenceProviderError('provider failed', { status: 401 })
      );

      const result = await runTest('chat_completion');

      expect(result).toEqual({
        ok: false,
        latencyMs: expect.any(Number),
        statusCode: 401,
        error: { reason: 'provider failed' },
      });
      expect(result).not.toHaveProperty('raw');
    });

    it('reports failures from the Elasticsearch inference API', async () => {
      inference.mockRejectedValue(
        new errors.ResponseError({
          statusCode: 429,
          body: { error: { reason: 'too many requests' } },
          headers: {},
          warnings: [],
          meta: {} as never,
        })
      );

      const result = await runTest('text_embedding');

      expect(result).toEqual(
        expect.objectContaining({ statusCode: 429, error: { reason: 'too many requests' } })
      );
    });

    it('truncates a long provider reason', async () => {
      chatComplete.mockRejectedValue(new Error('x'.repeat(MAX_REASON_LENGTH * 2)));

      const result = await runTest('chat_completion');

      expect(result.error?.reason).toHaveLength(MAX_REASON_LENGTH);
      expect(result.error?.reason.endsWith('...')).toBe(true);
    });

    it('logs the failure with the endpoint, task type and status code', async () => {
      chatComplete.mockRejectedValue(
        createInferenceProviderError('secret detail', { status: 401 })
      );

      await runTest('chat_completion');

      expect(logger.warn).toHaveBeenCalledWith(
        'Test of inference endpoint [my-endpoint] (chat_completion) failed with status [401]'
      );
    });

    it('does not read a status code from the text of an error without structured metadata', async () => {
      chatComplete.mockRejectedValue(new Error('job status 503'));

      const result = await runTest('chat_completion');

      expect(result.error).toEqual({ reason: 'job status 503' });
      expect(result).not.toHaveProperty('statusCode');
    });

    it('returns only the reason when no status code can be found', async () => {
      chatComplete.mockRejectedValue(new Error('socket hang up'));

      const result = await runTest('chat_completion');

      expect(result.error).toEqual({ reason: 'socket hang up' });
      expect(result).not.toHaveProperty('statusCode');
    });

    describe('when the endpoint does not answer in time', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('aborts the request and reports the failure', async () => {
        inference.mockImplementation(
          (_params: unknown, { signal }: { signal: AbortSignal }) =>
            new Promise((_, reject) => {
              signal.addEventListener('abort', () => reject(new Error('Request aborted')));
            })
        );

        const resultPromise = runTest('completion');
        jest.advanceTimersByTime(TEST_TIMEOUT_MS);
        const result = await resultPromise;

        expect(result).toEqual({
          ok: false,
          latencyMs: expect.any(Number),
          error: { reason: 'Request aborted' },
        });
      });
    });
  });
});
