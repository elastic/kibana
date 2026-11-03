/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { createInferenceProviderError } from '@kbn/inference-common';
import type { TestableTaskType } from '../../common/types';
import { TEST_TIMEOUT_MS, testInferenceEndpoint } from './test_inference_endpoint';

describe('testInferenceEndpoint', () => {
  const chatComplete = jest.fn();
  const inference = jest.fn();
  const inferenceClient = { chatComplete };
  const esClient = { inference: { inference } };

  const runTest = (
    taskType: TestableTaskType,
    overrides: { message?: string; documents?: string[] } = {}
  ) =>
    testInferenceEndpoint({
      inferenceClient,
      esClient,
      taskType,
      inferenceId: 'my-endpoint',
      message: 'What is Elasticsearch?',
      ...overrides,
    } as unknown as Parameters<typeof testInferenceEndpoint>[0]);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('chat_completion', () => {
    it('sends only the message through the inference client', async () => {
      chatComplete.mockResolvedValue({ content: 'A search engine.', toolCalls: [] });

      await runTest('chat_completion');

      expect(chatComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'my-endpoint',
          maxRetries: 0,
          messages: [{ role: 'user', content: 'What is Elasticsearch?' }],
        })
      );
      expect(chatComplete.mock.calls[0][0]).not.toHaveProperty('tools');
    });

    it('returns the answer and the latency', async () => {
      chatComplete.mockResolvedValue({ content: 'A search engine.', toolCalls: [] });

      const result = await runTest('chat_completion');

      expect(result).toEqual({
        ok: true,
        latencyMs: expect.any(Number),
        result: { type: 'text', content: 'A search engine.' },
        raw: { content: 'A search engine.', toolCalls: [] },
      });
    });
  });

  describe('completion', () => {
    it('sends the message to the endpoint and returns the text', async () => {
      inference.mockResolvedValue({ completion: [{ result: 'A search engine.' }] });

      const result = await runTest('completion');

      expect(inference).toHaveBeenCalledWith(
        expect.objectContaining({
          task_type: 'completion',
          inference_id: 'my-endpoint',
          input: 'What is Elasticsearch?',
        }),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
      expect(result.result).toEqual({ type: 'text', content: 'A search engine.' });
      expect(result.raw).toEqual({ completion: [{ result: 'A search engine.' }] });
    });
  });

  describe.each<TestableTaskType>(['text_embedding', 'embedding'])('%s', (taskType) => {
    it('returns the vector size and a preview of its first values', async () => {
      const embedding = Array.from({ length: 1024 }, (_, index) => index / 1000);
      inference.mockResolvedValue(
        taskType === 'embedding'
          ? { embeddings: [{ embedding }] }
          : { text_embedding: [{ embedding }] }
      );

      const result = await runTest(taskType);

      expect(inference).toHaveBeenCalledWith(
        expect.objectContaining({ task_type: taskType, input: 'What is Elasticsearch?' }),
        expect.anything()
      );
      expect(result.result).toEqual({
        type: 'embedding',
        dimensions: 1024,
        preview: embedding.slice(0, 8),
      });
      expect(result.raw).toEqual(
        taskType === 'embedding'
          ? { embeddings: [{ embedding }] }
          : { text_embedding: [{ embedding }] }
      );
    });
  });

  describe('sparse_embedding', () => {
    it('returns the token count and the heaviest tokens first', async () => {
      inference.mockResolvedValue({
        sparse_embedding: [
          {
            is_truncated: false,
            embedding: { a: 0.1, b: 0.9, c: 0.5, d: 0.3, e: 0.7, f: 0.2, g: 0.8 },
          },
        ],
      });

      const result = await runTest('sparse_embedding');

      expect(result.raw).toEqual({
        sparse_embedding: [
          {
            is_truncated: false,
            embedding: { a: 0.1, b: 0.9, c: 0.5, d: 0.3, e: 0.7, f: 0.2, g: 0.8 },
          },
        ],
      });
      expect(result.result).toEqual({
        type: 'sparse_embedding',
        tokenCount: 7,
        topTokens: [
          { token: 'b', weight: 0.9 },
          { token: 'g', weight: 0.8 },
          { token: 'e', weight: 0.7 },
          { token: 'c', weight: 0.5 },
          { token: 'd', weight: 0.3 },
        ],
      });
    });
  });

  describe('rerank', () => {
    it('sends the query and documents and returns the ranking with document text', async () => {
      inference.mockResolvedValue({
        rerank: [
          { index: 1, relevance_score: 0.9 },
          { index: 0, relevance_score: 0.1, text: 'first doc' },
        ],
      });

      const result = await runTest('rerank', { documents: ['first doc', 'second doc'] });

      expect(inference).toHaveBeenCalledWith(
        expect.objectContaining({
          task_type: 'rerank',
          query: 'What is Elasticsearch?',
          input: ['first doc', 'second doc'],
        }),
        expect.anything()
      );
      expect(result.result).toEqual({
        type: 'rerank',
        ranking: [
          { index: 1, score: 0.9, text: 'second doc' },
          { index: 0, score: 0.1, text: 'first doc' },
        ],
      });
      expect(result.raw).toEqual({
        rerank: [
          { index: 1, relevance_score: 0.9 },
          { index: 0, relevance_score: 0.1, text: 'first doc' },
        ],
      });
    });
  });

  describe('failures', () => {
    it.each([
      [401, 'auth'],
      [403, 'auth'],
      [429, 'quota'],
      [404, 'not_found'],
      [400, 'bad_request'],
      [504, 'timeout'],
      [500, 'provider_error'],
      [503, 'provider_error'],
      [418, 'unknown'],
    ])('maps provider status %s to cause %s', async (status, cause) => {
      chatComplete.mockRejectedValue(createInferenceProviderError('provider failed', { status }));

      const result = await runTest('chat_completion');

      expect(result).toEqual({
        ok: false,
        latencyMs: expect.any(Number),
        error: { cause, reason: 'provider failed', statusCode: status },
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

      expect(result.error).toEqual(expect.objectContaining({ cause: 'quota', statusCode: 429 }));
    });

    it('reads the status code from the error message when there is no structured status', async () => {
      chatComplete.mockRejectedValue(
        new Error(
          'Received an unsuccessful status code for request from inference entity id [x] status [400]'
        )
      );

      const result = await runTest('chat_completion');

      expect(result.error).toEqual(
        expect.objectContaining({ cause: 'bad_request', statusCode: 400 })
      );
    });

    it('reports a missing connector or endpoint as not found', async () => {
      chatComplete.mockRejectedValue(
        createInferenceProviderError("No connector or inference endpoint found for ID 'gone'", {
          status: 400,
        })
      );

      const result = await runTest('chat_completion');

      expect(result.error).toEqual(
        expect.objectContaining({ cause: 'not_found', statusCode: 400 })
      );
    });

    it('returns unknown without a status code when none can be found', async () => {
      chatComplete.mockRejectedValue(new Error('socket hang up'));

      const result = await runTest('chat_completion');

      expect(result.error).toEqual({ cause: 'unknown', reason: 'socket hang up' });
    });

    describe('when the endpoint does not answer in time', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('aborts the request and reports a timeout', async () => {
        inference.mockImplementation(
          (_params: unknown, { signal }: { signal: AbortSignal }) =>
            new Promise((_, reject) => {
              signal.addEventListener('abort', () => reject(new Error('Request aborted')));
            })
        );

        const resultPromise = runTest('completion');
        jest.advanceTimersByTime(TEST_TIMEOUT_MS);
        const result = await resultPromise;

        expect(result.error).toEqual(expect.objectContaining({ cause: 'timeout' }));
      });
    });
  });
});
