/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Transform } from 'stream';
import {
  getTokenCountFromInvokeStream,
  parseGeminiStreamForUsageMetadata,
} from './get_token_count_from_invoke_stream';
import { loggerMock } from '@kbn/logging-mocks';
import { EventStreamCodec } from '@smithy/eventstream-codec';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';

function createStreamMock() {
  const transform: Transform = new Transform({});

  return {
    write: (data: unknown) => {
      transform.push(data);
    },
    fail: () => {
      transform.emit('error', new Error('Stream failed'));
      transform.end();
    },
    transform,
    complete: () => {
      transform.end();
    },
  };
}
const logger = loggerMock.create();
describe('getTokenCountFromInvokeStream', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  let stream: ReturnType<typeof createStreamMock>;
  const body = {
    messages: [
      {
        role: 'system',
        content: 'This is a system message',
      },
      {
        role: 'user',
        content: 'This is a user message',
      },
    ],
  };

  const chunk = {
    object: 'chat.completion.chunk',
    choices: [
      {
        delta: {
          content: 'Single.',
        },
      },
    ],
  };

  const geminiChunk = {
    candidates: [
      {
        content: {
          role: 'model',
          parts: [
            {
              text: '. I be no real-life pirate, but I be mighty good at pretendin!',
            },
          ],
        },
      },
    ],
    usageMetadata: {
      promptTokenCount: 23,
      candidatesTokenCount: 50,
      totalTokenCount: 73,
    },
  };

  const PROMPT_TOKEN_COUNT = 34;
  const COMPLETION_TOKEN_COUNT = 2;

  describe('OpenAI stream', () => {
    beforeEach(() => {
      stream = createStreamMock();
      stream.write(`data: ${JSON.stringify(chunk)}`);
    });

    it('counts the prompt + completion tokens for OpenAI response', async () => {
      stream.complete();
      const tokens = await getTokenCountFromInvokeStream({
        responseStream: stream.transform,
        body,
        logger,
        actionTypeId: '.gen-ai',
      });
      expect(tokens.prompt).toBe(PROMPT_TOKEN_COUNT);
      expect(tokens.completion).toBe(COMPLETION_TOKEN_COUNT);
      expect(tokens.total).toBe(PROMPT_TOKEN_COUNT + COMPLETION_TOKEN_COUNT);
    });
    it('resolves the promise with the correct prompt tokens', async () => {
      const tokenPromise = getTokenCountFromInvokeStream({
        responseStream: stream.transform,
        body,
        logger,
        actionTypeId: '.gen-ai',
      });

      stream.fail();

      await expect(tokenPromise).resolves.toEqual({
        prompt: PROMPT_TOKEN_COUNT,
        total: PROMPT_TOKEN_COUNT + COMPLETION_TOKEN_COUNT,
        completion: COMPLETION_TOKEN_COUNT,
      });
      expect(logger.error).toHaveBeenCalled();
    });
    it('Stops the stream early when the request is aborted', async () => {
      const mockDestroy = jest.spyOn(stream.transform, 'destroy');
      const abortController = new AbortController();

      const tokenPromise = getTokenCountFromInvokeStream({
        responseStream: stream.transform,
        body: {
          ...body,
          signal: abortController.signal,
        },
        logger,
        actionTypeId: '.gen-ai',
      });

      abortController.abort();

      await expect(tokenPromise).resolves.toEqual({
        prompt: PROMPT_TOKEN_COUNT,
        total: PROMPT_TOKEN_COUNT + 0,
        completion: 0,
      });
      expect(logger.error).not.toHaveBeenCalled();
      expect(mockDestroy).toHaveBeenCalled();
    });
  });
  describe('Bedrock stream', () => {
    beforeEach(() => {
      stream = createStreamMock();
      stream.write(encodeBedrockResponse('Simple.'));
    });

    it('calculates from the usage object when latest api is used', async () => {
      stream = createStreamMock();
      stream.write(
        encodeBedrockResponse({
          type: 'message_stop',
          'amazon-bedrock-invocationMetrics': {
            inputTokenCount: 133,
            outputTokenCount: 120,
            invocationLatency: 3464,
            firstByteLatency: 513,
          },
        })
      );
      stream.complete();
      const tokens = await getTokenCountFromInvokeStream({
        responseStream: stream.transform,
        body,
        logger,
        actionTypeId: '.bedrock',
      });
      expect(tokens.prompt).toBe(133);
      expect(tokens.completion).toBe(120);
      expect(tokens.total).toBe(133 + 120);
    });

    it('counts the prompt + completion tokens from response when deprecated API is used', async () => {
      stream.complete();
      const tokens = await getTokenCountFromInvokeStream({
        responseStream: stream.transform,
        body,
        logger,
        actionTypeId: '.bedrock',
      });
      expect(tokens.prompt).toBe(PROMPT_TOKEN_COUNT);
      expect(tokens.completion).toBe(COMPLETION_TOKEN_COUNT);
      expect(tokens.total).toBe(PROMPT_TOKEN_COUNT + COMPLETION_TOKEN_COUNT);
    });
    it('resolves the promise with the correct prompt tokens', async () => {
      const tokenPromise = getTokenCountFromInvokeStream({
        responseStream: stream.transform,
        body,
        logger,
        actionTypeId: '.bedrock',
      });

      stream.fail();

      await expect(tokenPromise).resolves.toEqual({
        prompt: PROMPT_TOKEN_COUNT,
        total: PROMPT_TOKEN_COUNT + COMPLETION_TOKEN_COUNT,
        completion: COMPLETION_TOKEN_COUNT,
      });
      expect(logger.error).toHaveBeenCalled();
    });
    it('Does not stop the stream early when the request is aborted', async () => {
      const abortController = new AbortController();
      const tokenPromise = getTokenCountFromInvokeStream({
        responseStream: stream.transform,
        body: {
          ...body,
          signal: abortController.signal,
        },
        logger,
        actionTypeId: '.bedrock',
      });

      abortController.abort();
      stream.complete();
      await expect(tokenPromise).resolves.toEqual({
        prompt: PROMPT_TOKEN_COUNT,
        total: PROMPT_TOKEN_COUNT + COMPLETION_TOKEN_COUNT,
        completion: COMPLETION_TOKEN_COUNT,
      });
    });
  });
  describe('Gemini stream', () => {
    beforeEach(() => {
      stream = createStreamMock();
      stream.write(`data: ${JSON.stringify(geminiChunk)}`);
    });

    it('counts the prompt, completion & total tokens for Gemini response', async () => {
      stream.complete();
      const tokens = await parseGeminiStreamForUsageMetadata({
        responseStream: stream.transform,
        logger,
      });

      expect(tokens.promptTokenCount).toBe(23);
      expect(tokens.candidatesTokenCount).toBe(50);
      expect(tokens.totalTokenCount).toBe(73);
    });
  });
});

function encodeBedrockResponse(completion: string | Record<string, unknown>) {
  return new EventStreamCodec(toUtf8, fromUtf8).encode({
    headers: {},
    body: Uint8Array.from(
      Buffer.from(
        JSON.stringify({
          bytes: Buffer.from(
            JSON.stringify(typeof completion === 'string' ? { completion } : completion)
          ).toString('base64'),
        })
      )
    ),
  });
}
