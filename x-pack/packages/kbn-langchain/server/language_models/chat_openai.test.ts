/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type OpenAI from 'openai';
import { Stream } from 'openai/streaming';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';

import { ActionsClientChatOpenAI } from './chat_openai';
import { mockActionResponse, mockChatCompletion } from './mocks';

const connectorId = 'mock-connector-id';

const mockExecute = jest.fn();

const mockLogger = loggerMock.create();

const actionsClient = actionsClientMock.create();

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

export async function* asyncGenerator() {
  // Mock implementation
  yield chunk;
}
const mockStreamExecute = jest.fn();

const prompt = 'Do you know my name?';

const { signal } = new AbortController();

const defaultArgs = {
  actionsClient,
  connectorId,
  logger: mockLogger,
  streaming: false,
  signal,
  timeout: 999999,
  temperature: 0.2,
};

describe('ActionsClientChatOpenAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecute.mockImplementation(() => ({
      data: mockChatCompletion,
      status: 'ok',
    }));
    actionsClient.execute.mockImplementation(mockExecute);
  });

  describe('_llmType', () => {
    it('returns the expected LLM type', () => {
      const actionsClientChatOpenAI = new ActionsClientChatOpenAI(defaultArgs);

      expect(actionsClientChatOpenAI._llmType()).toEqual('ActionsClientChatOpenAI');
    });

    it('returns the expected LLM type when overridden', () => {
      const actionsClientChatOpenAI = new ActionsClientChatOpenAI({
        ...defaultArgs,
        llmType: 'special-llm-type',
      });

      expect(actionsClientChatOpenAI._llmType()).toEqual('special-llm-type');
    });
  });

  describe('completionWithRetry streaming: true', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockStreamExecute.mockImplementation(() => ({
        data: {
          consumerStream: asyncGenerator() as unknown as Stream<OpenAI.ChatCompletionChunk>,
          tokenCountStream: asyncGenerator() as unknown as Stream<OpenAI.ChatCompletionChunk>,
        },
        status: 'ok',
      }));
    });
    const defaultStreamingArgs: OpenAI.ChatCompletionCreateParamsStreaming = {
      messages: [{ content: prompt, role: 'user' }],
      stream: true,
      model: 'gpt-4',
      n: 99,
      stop: ['a stop sequence'],
      functions: [jest.fn()],
    };
    it('returns the expected data', async () => {
      actionsClient.execute.mockImplementation(mockStreamExecute);
      const actionsClientChatOpenAI = new ActionsClientChatOpenAI({
        ...defaultArgs,
        streaming: true,
        actionsClient,
      });

      const result: AsyncIterable<OpenAI.ChatCompletionChunk> =
        await actionsClientChatOpenAI.completionWithRetry(defaultStreamingArgs);
      expect(mockStreamExecute).toHaveBeenCalledWith({
        actionId: connectorId,
        params: {
          subActionParams: {
            model: 'gpt-4',
            messages: [{ role: 'user', content: 'Do you know my name?' }],
            signal,
            timeout: 999999,
            n: defaultStreamingArgs.n,
            stop: defaultStreamingArgs.stop,
            functions: defaultStreamingArgs.functions,
            temperature: 0.2,
          },
          subAction: 'invokeAsyncIterator',
        },
        signal,
      });
      expect(result).toEqual(asyncGenerator());
    });
  });

  describe('completionWithRetry streaming: false', () => {
    const defaultNonStreamingArgs: OpenAI.ChatCompletionCreateParamsNonStreaming = {
      messages: [{ content: prompt, role: 'user' }],
      stream: false,
      model: 'gpt-4',
    };
    it('returns the expected data', async () => {
      const actionsClientChatOpenAI = new ActionsClientChatOpenAI(defaultArgs);

      const result: OpenAI.ChatCompletion = await actionsClientChatOpenAI.completionWithRetry(
        defaultNonStreamingArgs
      );
      expect(mockExecute).toHaveBeenCalledWith({
        actionId: connectorId,
        params: {
          subActionParams: {
            body: '{"temperature":0.2,"model":"gpt-4","messages":[{"role":"user","content":"Do you know my name?"}]}',
            signal,
            timeout: 999999,
          },
          subAction: 'run',
        },
        signal,
      });
      expect(result.choices[0].message.content).toEqual(mockActionResponse.message);
    });

    it('rejects with the expected error when the action result status is error', async () => {
      const hasErrorStatus = jest.fn().mockImplementation(() => ({
        message: 'action-result-message',
        serviceMessage: 'action-result-service-message',
        status: 'error', // <-- error status
      }));
      actionsClient.execute.mockRejectedValueOnce(hasErrorStatus);

      const actionsClientChatOpenAI = new ActionsClientChatOpenAI({
        ...defaultArgs,
        actionsClient,
      });

      expect(actionsClientChatOpenAI.completionWithRetry(defaultNonStreamingArgs))
        .rejects.toThrowError(
          'ActionsClientChatOpenAI: action result status is error: action-result-message - action-result-service-message'
        )
        .catch(() => {
          /* ...handle/report the error (or just suppress it, if that's appropriate
            [which it sometimes, though rarely, is])...
         */
        });
    });
  });
});
