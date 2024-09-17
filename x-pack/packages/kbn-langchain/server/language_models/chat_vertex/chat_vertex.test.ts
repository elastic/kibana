/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';

import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ActionsClientChatVertexAI } from './chat_vertex';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';

const connectorId = 'mock-connector-id';

const mockExecute = jest.fn();
const actionsClient = actionsClientMock.create();

const mockLogger = loggerMock.create();

const mockStreamExecute = jest.fn().mockImplementation(() => {
  const passThrough = new PassThrough();

  // Write the data chunks to the stream
  setTimeout(() => {
    passThrough.write(
      Buffer.from(
        `data: {"candidates": [{"content": {"role": "model","parts": [{"text": "token1"}]}}],"modelVersion": "gemini-1.5-pro-001"}`
      )
    );
  });
  setTimeout(() => {
    passThrough.write(
      Buffer.from(
        `data: {"candidates": [{"content": {"role": "model","parts": [{"text": "token2"}]}}],"modelVersion": "gemini-1.5-pro-001"}`
      )
    );
  });
  setTimeout(() => {
    passThrough.write(
      Buffer.from(
        `data: {"candidates": [{"content": {"role": "model","parts": [{"text": "token3"}]}}],"modelVersion": "gemini-1.5-pro-001"}`
      )
    );
    // End the stream
    passThrough.end();
  });

  return {
    data: passThrough, // PassThrough stream will act as the async iterator
    status: 'ok',
  };
});

const callMessages = [
  new SystemMessage('Answer the following questions truthfully and as best you can.'),
  new HumanMessage('Question: Do you know my name?\n\n'),
] as unknown as BaseMessage[];

const callOptions = {
  stop: ['\n'],
  recursionLimit: 0,
  /** Maximum number of parallel calls to make. */
  maxConcurrency: 0,
};
const handleLLMNewToken = jest.fn();
const callRunManager = {
  handleLLMNewToken,
} as unknown as CallbackManagerForLLMRun;
const onFailedAttempt = jest.fn();
const defaultArgs = {
  actionsClient,
  connectorId,
  logger: mockLogger,
  streaming: false,
  maxRetries: 0,
  onFailedAttempt,
};

const testMessage = 'Yes, your name is Andrew. How can I assist you further, Andrew?';

export const mockActionResponse = {
  candidates: [
    {
      content: {
        role: 'model',
        parts: [
          {
            text: testMessage,
          },
        ],
      },
      finishReason: 'STOP',
    },
  ],
  usageMetadata: { input_tokens: 4, output_tokens: 10, total_tokens: 14 },
};

describe('ActionsClientChatVertexAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    actionsClient.execute.mockImplementation(
      jest.fn().mockImplementation(() => ({
        data: mockActionResponse,
        status: 'ok',
      }))
    );
    mockExecute.mockImplementation(() => ({
      data: mockActionResponse,
      status: 'ok',
    }));
  });

  describe('_generate streaming: false', () => {
    it('returns the expected content when _generate is invoked', async () => {
      const actionsClientChatVertexAI = new ActionsClientChatVertexAI(defaultArgs);

      const result = await actionsClientChatVertexAI._generate(
        callMessages,
        callOptions,
        callRunManager
      );
      const subAction = actionsClient.execute.mock.calls[0][0].params.subAction;
      expect(subAction).toEqual('invokeAIRaw');

      expect(result.generations[0].text).toEqual(testMessage);
    });

    it('rejects with the expected error when the action result status is error', async () => {
      const hasErrorStatus = jest.fn().mockImplementation(() => {
        throw new Error(
          'ActionsClientChatVertexAI: action result status is error: action-result-message - action-result-service-message'
        );
      });

      actionsClient.execute.mockRejectedValueOnce(hasErrorStatus);

      const actionsClientChatVertexAI = new ActionsClientChatVertexAI({
        ...defaultArgs,
        actionsClient,
      });

      await expect(
        actionsClientChatVertexAI._generate(callMessages, callOptions, callRunManager)
      ).rejects.toThrowError();
      expect(onFailedAttempt).toHaveBeenCalled();
    });

    it('rejects with the expected error the message has invalid content', async () => {
      actionsClient.execute.mockImplementation(
        jest.fn().mockResolvedValue({
          data: {
            Bad: true,
            finishReason: 'badness',
          },
          status: 'ok',
        })
      );

      const actionsClientChatVertexAI = new ActionsClientChatVertexAI(defaultArgs);

      await expect(
        actionsClientChatVertexAI._generate(callMessages, callOptions, callRunManager)
      ).rejects.toThrowError("Cannot read properties of undefined (reading 'text')");
    });
  });

  describe('*_streamResponseChunks', () => {
    it('iterates over gemini chunks', async () => {
      actionsClient.execute.mockImplementationOnce(mockStreamExecute);

      const actionsClientChatVertexAI = new ActionsClientChatVertexAI({
        ...defaultArgs,
        actionsClient,
        streaming: true,
      });

      const gen = actionsClientChatVertexAI._streamResponseChunks(
        callMessages,
        callOptions,
        callRunManager
      );

      const chunks = [];

      for await (const chunk of gen) {
        chunks.push(chunk);
      }

      expect(chunks.map((c) => c.text)).toEqual(['token1', 'token2', 'token3']);
      expect(handleLLMNewToken).toHaveBeenCalledTimes(3);
      expect(handleLLMNewToken).toHaveBeenCalledWith('token1');
      expect(handleLLMNewToken).toHaveBeenCalledWith('token2');
      expect(handleLLMNewToken).toHaveBeenCalledWith('token3');
    });
  });
});
