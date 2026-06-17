/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Transform } from 'stream';
import { getTokenCountFromOpenAIStream } from './get_token_count_from_openai_stream';
import { loggerMock } from '@kbn/logging-mocks';

interface StreamMock {
  write: (data: string) => void;
  fail: () => void;
  complete: () => void;
  transform: Transform;
}

function createStreamMock(): StreamMock {
  const transform: Transform = new Transform({});

  return {
    write: (data: string) => {
      transform.push(`${data}\n`);
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
describe('getTokenCountFromOpenAIStream', () => {
  let tokens: Awaited<ReturnType<typeof getTokenCountFromOpenAIStream>>;
  let stream: StreamMock;
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
          content: 'Single',
        },
      },
    ],
  };

  const usageChunk = {
    object: 'chat.completion.chunk',
    choices: [],
    usage: {
      prompt_tokens: 50,
      completion_tokens: 100,
      total_tokens: 150,
    },
  };

  const PROMPT_TOKEN_COUNT = 36;
  const COMPLETION_TOKEN_COUNT = 5;

  beforeEach(() => {
    stream = createStreamMock();
    stream.write(`data: ${JSON.stringify(chunk)}`);
  });

  describe('when a stream completes', () => {
    describe('with usage chunk', () => {
      it('returns the counts from the usage chunk', async () => {
        stream = createStreamMock();
        stream.write(`data: ${JSON.stringify(chunk)}`);
        stream.write(`data: ${JSON.stringify(usageChunk)}`);
        stream.write('data: [DONE]');
        stream.complete();

        tokens = await getTokenCountFromOpenAIStream({
          responseStream: stream.transform,
          logger,
          body: JSON.stringify(body),
        });

        expect(tokens).toEqual({
          prompt: usageChunk.usage.prompt_tokens,
          completion: usageChunk.usage.completion_tokens,
          total: usageChunk.usage.total_tokens,
        });
      });
    });

    describe('without usage chunk', () => {
      beforeEach(async () => {
        stream.write('data: [DONE]');
        stream.complete();
      });

      describe('without function tokens', () => {
        beforeEach(async () => {
          tokens = await getTokenCountFromOpenAIStream({
            responseStream: stream.transform,
            logger,
            body: JSON.stringify(body),
          });
        });

        it('counts the prompt tokens', () => {
          expect(tokens.prompt).toBe(PROMPT_TOKEN_COUNT);
          expect(tokens.completion).toBe(COMPLETION_TOKEN_COUNT);
          expect(tokens.total).toBe(PROMPT_TOKEN_COUNT + COMPLETION_TOKEN_COUNT);
        });
      });

      describe('with function tokens', () => {
        beforeEach(async () => {
          tokens = await getTokenCountFromOpenAIStream({
            responseStream: stream.transform,
            logger,
            body: JSON.stringify({
              ...body,
              functions: [
                {
                  name: 'my_function',
                  description: 'My function description',
                  parameters: {
                    type: 'object',
                    properties: {
                      my_property: {
                        type: 'boolean',
                        description: 'My function property',
                      },
                    },
                  },
                },
              ],
            }),
          });
        });

        it('counts the function tokens', () => {
          expect(tokens.prompt).toBeGreaterThan(PROMPT_TOKEN_COUNT);
        });
      });
    });
  });

  describe('when a stream fails', () => {
    it('resolves the promise with the correct prompt tokens', async () => {
      const tokenPromise = getTokenCountFromOpenAIStream({
        responseStream: stream.transform,
        logger,
        body: JSON.stringify(body),
      });

      stream.fail();

      await expect(tokenPromise).resolves.toEqual({
        prompt: PROMPT_TOKEN_COUNT,
        total: PROMPT_TOKEN_COUNT + COMPLETION_TOKEN_COUNT,
        completion: COMPLETION_TOKEN_COUNT,
      });
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
