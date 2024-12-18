/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGenAiTokenTracking, shouldTrackGenAiToken } from './gen_ai_token_tracking';
import { loggerMock } from '@kbn/logging-mocks';
import { getTokenCountFromBedrockInvoke } from './get_token_count_from_bedrock_invoke';
import { getTokenCountFromInvokeStream } from './get_token_count_from_invoke_stream';
import { getTokenCountFromInvokeAsyncIterator } from './get_token_count_from_invoke_async_iterator';
import { IncomingMessage } from 'http';
import { Socket } from 'net';

jest.mock('./get_token_count_from_bedrock_invoke');
jest.mock('./get_token_count_from_invoke_stream');
jest.mock('./get_token_count_from_invoke_async_iterator');

const logger = loggerMock.create();

describe('getGenAiTokenTracking', () => {
  let mockGetTokenCountFromBedrockInvoke: jest.Mock;
  let mockGetTokenCountFromInvokeStream: jest.Mock;
  let mockGetTokenCountFromInvokeAsyncIterator: jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTokenCountFromBedrockInvoke = (
      getTokenCountFromBedrockInvoke as jest.Mock
    ).mockResolvedValueOnce({
      total: 100,
      prompt: 50,
      completion: 50,
    });
    mockGetTokenCountFromInvokeStream = (
      getTokenCountFromInvokeStream as jest.Mock
    ).mockResolvedValueOnce({
      total: 100,
      prompt: 50,
      completion: 50,
    });

    mockGetTokenCountFromInvokeAsyncIterator = (
      getTokenCountFromInvokeAsyncIterator as jest.Mock
    ).mockResolvedValueOnce({
      total: 100,
      prompt: 50,
      completion: 50,
    });
  });
  it('should return the total, prompt, and completion token counts when given a valid OpenAI response', async () => {
    const actionTypeId = '.gen-ai';

    const result = {
      actionId: '123',
      status: 'ok' as const,
      data: {
        usage: {
          total_tokens: 100,
          prompt_tokens: 50,
          completion_tokens: 50,
        },
      },
    };
    const validatedParams = {};

    const tokenTracking = await getGenAiTokenTracking({
      actionTypeId,
      logger,
      result,
      validatedParams,
    });

    expect(tokenTracking).toEqual({
      total_tokens: 100,
      prompt_tokens: 50,
      completion_tokens: 50,
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should return the total, prompt, and completion token counts when given a valid Bedrock response for run/test subactions', async () => {
    const actionTypeId = '.bedrock';

    const result = {
      actionId: '123',
      status: 'ok' as const,
      data: {
        completion: 'Sample completion',
      },
    };
    const validatedParams = {
      subAction: 'run',
      subActionParams: {
        body: 'Sample body',
      },
    };

    const tokenTracking = await getGenAiTokenTracking({
      actionTypeId,
      logger,
      result,
      validatedParams,
    });

    expect(tokenTracking).toEqual({
      total_tokens: 100,
      prompt_tokens: 50,
      completion_tokens: 50,
    });
    expect(logger.error).not.toHaveBeenCalled();
    expect(mockGetTokenCountFromBedrockInvoke).toHaveBeenCalledWith({
      response: 'Sample completion',
      body: 'Sample body',
    });
  });

  it('should return the total, prompt, and completion token counts when given a valid Bedrock response for invokeAI subaction', async () => {
    const actionTypeId = '.bedrock';

    const result = {
      actionId: '123',
      status: 'ok' as const,
      data: {
        message: 'Sample completion',
        usage: {
          input_tokens: 43,
          output_tokens: 12,
        },
      },
    };
    const validatedParams = {
      subAction: 'invokeAI',
      subActionParams: {
        messages: [
          {
            role: 'user',
            content: 'Sample message',
          },
        ],
      },
    };
    const tokenTracking = await getGenAiTokenTracking({
      actionTypeId,
      logger,
      result,
      validatedParams,
    });

    // does not equal the usage values because mockGetTokenCountFromBedrockInvoke mocks the response
    expect(tokenTracking).toEqual({
      total_tokens: 100,
      prompt_tokens: 50,
      completion_tokens: 50,
    });
    expect(logger.error).not.toHaveBeenCalled();
    expect(mockGetTokenCountFromBedrockInvoke).toHaveBeenCalledWith({
      response: 'Sample completion',
      body: '{"prompt":"Sample message"}',
      usage: {
        input_tokens: 43,
        output_tokens: 12,
      },
    });
  });

  it('should return the total, prompt, and completion token counts when given a valid ConverseResponse for bedrockClientSend subaction', async () => {
    const actionTypeId = '.bedrock';

    const result = {
      actionId: '123',
      status: 'ok' as const,
      data: {
        usage: {
          inputTokens: 50,
          outputTokens: 50,
          totalTokens: 100,
        },
      },
    };
    const validatedParams = {
      subAction: 'bedrockClientSend',
    };

    const tokenTracking = await getGenAiTokenTracking({
      actionTypeId,
      logger,
      result,
      validatedParams,
    });

    expect(tokenTracking).toEqual({
      total_tokens: 100,
      prompt_tokens: 50,
      completion_tokens: 50,
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should return the total, prompt, and completion token counts when given a valid ConverseStreamResponse for bedrockClientSend subaction', async () => {
    const chunkIterable = {
      async *[Symbol.asyncIterator]() {
        await new Promise((resolve) => setTimeout(resolve, 100));
        yield {
          metadata: {
            usage: {
              totalTokens: 100,
              inputTokens: 40,
              outputTokens: 60,
            },
          },
        };
      },
    };
    const actionTypeId = '.bedrock';

    const result = {
      actionId: '123',
      status: 'ok' as const,
      data: {
        tokenStream: chunkIterable,
      },
    };
    const validatedParams = {
      subAction: 'bedrockClientSend',
    };

    const tokenTracking = await getGenAiTokenTracking({
      actionTypeId,
      logger,
      result,
      validatedParams,
    });

    expect(tokenTracking).toEqual({
      total_tokens: 100,
      prompt_tokens: 40,
      completion_tokens: 60,
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should return null when given an invalid Bedrock response for bedrockClientSend subaction', async () => {
    const actionTypeId = '.bedrock';
    const result = {
      actionId: '123',
      status: 'ok' as const,
      data: {},
    };
    const validatedParams = {
      subAction: 'bedrockClientSend',
    };

    const tokenTracking = await getGenAiTokenTracking({
      actionTypeId,
      logger,
      result,
      validatedParams,
    });

    expect(tokenTracking).toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });
  it('should return the total, prompt, and completion token counts when given a valid OpenAI streamed response', async () => {
    const mockReader = new IncomingMessage(new Socket());
    const actionTypeId = '.gen-ai';
    const result = {
      actionId: '123',
      status: 'ok' as const,
      data: mockReader,
    };
    const validatedParams = {
      subAction: 'invokeStream',
      subActionParams: {
        messages: [
          {
            role: 'user',
            content: 'Sample message',
          },
        ],
      },
    };

    const tokenTracking = await getGenAiTokenTracking({
      actionTypeId,
      logger,
      result,
      validatedParams,
    });

    expect(tokenTracking).toEqual({
      total_tokens: 100,
      prompt_tokens: 50,
      completion_tokens: 50,
    });
    expect(logger.error).not.toHaveBeenCalled();

    expect(JSON.stringify(mockGetTokenCountFromInvokeStream.mock.calls[0][0].body)).toStrictEqual(
      JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Sample message',
          },
        ],
      })
    );
  });

  it('should return the total, prompt, and completion token counts when given a valid OpenAI async iterator response', async () => {
    const mockStream = jest.fn();
    const actionTypeId = '.gen-ai';
    const result = {
      actionId: '123',
      status: 'ok' as const,
      data: { consumerStream: mockStream, tokenCountStream: mockStream },
    };
    const validatedParams = {
      subAction: 'invokeAsyncIterator',
      subActionParams: {
        messages: [
          {
            role: 'user',
            content: 'Sample message',
          },
        ],
      },
    };

    const tokenTracking = await getGenAiTokenTracking({
      actionTypeId,
      logger,
      result,
      validatedParams,
    });

    expect(tokenTracking).toEqual({
      total_tokens: 100,
      prompt_tokens: 50,
      completion_tokens: 50,
    });
    expect(logger.error).not.toHaveBeenCalled();

    expect(
      JSON.stringify(mockGetTokenCountFromInvokeAsyncIterator.mock.calls[0][0].body)
    ).toStrictEqual(
      JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Sample message',
          },
        ],
      })
    );
  });

  it('should return 0s for the total, prompt, and completion token counts when given an invalid OpenAI async iterator response', async () => {
    const actionTypeId = '.gen-ai';
    const result = {
      actionId: '123',
      status: 'ok' as const,
      data: ['bad data'],
    };
    const validatedParams = {
      subAction: 'invokeAsyncIterator',
      subActionParams: {
        messages: [
          {
            role: 'user',
            content: 'Sample message',
          },
        ],
      },
    };

    const tokenTracking = await getGenAiTokenTracking({
      actionTypeId,
      logger,
      result,
      validatedParams,
    });

    expect(tokenTracking).toEqual({
      total_tokens: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
    });
    expect(logger.error).toHaveBeenCalled();
  });

  it('should return null when given an invalid OpenAI response', async () => {
    const actionTypeId = '.gen-ai';
    const result = {
      actionId: '123',
      status: 'ok' as const,
      data: {},
    };
    const validatedParams = {};

    const tokenTracking = await getGenAiTokenTracking({
      actionTypeId,
      logger,
      result,
      validatedParams,
    });

    expect(tokenTracking).toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });

  it('should return the total, prompt, and completion token counts when given a valid Gemini response', async () => {
    const actionTypeId = '.gemini';

    const result = {
      actionId: '123',
      status: 'ok' as const,
      data: {
        usageMetadata: {
          promptTokenCount: 50,
          candidatesTokenCount: 50,
          totalTokenCount: 100,
        },
      },
    };
    const validatedParams = {};

    const tokenTracking = await getGenAiTokenTracking({
      actionTypeId,
      logger,
      result,
      validatedParams,
    });

    expect(tokenTracking).toEqual({
      total_tokens: 100,
      prompt_tokens: 50,
      completion_tokens: 50,
    });
  });

  it('should return null when given an invalid Gemini response', async () => {
    const actionTypeId = '.gemini';
    const result = {
      actionId: '123',
      status: 'ok' as const,
      data: {},
    };
    const validatedParams = {};

    const tokenTracking = await getGenAiTokenTracking({
      actionTypeId,
      logger,
      result,
      validatedParams,
    });

    expect(tokenTracking).toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });

  it('should return the total, prompt, and completion token counts when given a valid Gemini streamed response', async () => {
    const actionTypeId = '.gemini';
    const result = {
      actionId: '123',
      status: 'ok' as const,
      data: {
        usageMetadata: {
          promptTokenCount: 50,
          candidatesTokenCount: 50,
          totalTokenCount: 100,
        },
      },
    };
    const validatedParams = {
      subAction: 'invokeStream',
    };

    const tokenTracking = await getGenAiTokenTracking({
      actionTypeId,
      logger,
      result,
      validatedParams,
    });

    expect(tokenTracking).toEqual({
      total_tokens: 100,
      prompt_tokens: 50,
      completion_tokens: 50,
    });
  });

  describe('shouldTrackGenAiToken', () => {
    it('should be true with OpenAI action', () => {
      expect(shouldTrackGenAiToken('.gen-ai')).toEqual(true);
    });
    it('should be true with bedrock action', () => {
      expect(shouldTrackGenAiToken('.bedrock')).toEqual(true);
    });
    it('should be true with gemini action', () => {
      expect(shouldTrackGenAiToken('.gemini')).toEqual(true);
    });
    it('should be false with any other action', () => {
      expect(shouldTrackGenAiToken('.jira')).toEqual(false);
    });
  });
});
