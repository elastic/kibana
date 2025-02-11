/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';

import { ActionsClientSimpleChatModel } from './simple_chat_model';
import { mockActionResponse } from './mocks';
import { BaseMessage } from '@langchain/core/messages';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { parseBedrockStream, parseBedrockStreamAsAsyncIterator } from '../utils/bedrock';
import { parseGeminiStream, parseGeminiStreamAsAsyncIterator } from '../utils/gemini';

const connectorId = 'mock-connector-id';

const mockExecute = jest.fn();
const actionsClient = actionsClientMock.create();

const mockLogger = loggerMock.create();

const mockStreamExecute = jest.fn().mockImplementation(() => ({
  data: new PassThrough(),
  status: 'ok',
}));

const callMessages = [
  {
    lc_serializable: true,
    lc_kwargs: {
      content: 'Answer the following questions truthfully and as best you can.',
      additional_kwargs: {},
      response_metadata: {},
    },
    lc_namespace: ['langchain_core', 'messages'],
    content: 'Answer the following questions truthfully and as best you can.',
    name: undefined,
    additional_kwargs: {},
    response_metadata: {},
    _getType: () => 'system',
  },
  {
    lc_serializable: true,
    lc_kwargs: {
      content: 'Question: Do you know my name?\n\n',
      additional_kwargs: {},
      response_metadata: {},
    },
    lc_namespace: ['langchain_core', 'messages'],
    content: 'Question: Do you know my name?\n\n',
    name: undefined,
    additional_kwargs: {},
    response_metadata: {},
    _getType: () => 'human',
  },
] as unknown as BaseMessage[];

const callOptions = {
  stop: ['\n'],
};
const handleLLMNewToken = jest.fn();
const callRunManager = {
  handleLLMNewToken,
} as unknown as CallbackManagerForLLMRun;

const defaultArgs = {
  actionsClient,
  connectorId,
  logger: mockLogger,
  streaming: false,
};
jest.mock('../utils/bedrock');
jest.mock('../utils/gemini');

describe('ActionsClientSimpleChatModel', () => {
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

  describe('getActionResultData', () => {
    it('returns the expected data', async () => {
      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel(defaultArgs);

      const result = await actionsClientSimpleChatModel._call(
        callMessages,
        callOptions,
        callRunManager
      );

      expect(result).toEqual(mockActionResponse.message);
    });
  });

  describe('_llmType', () => {
    it('returns the expected LLM type', () => {
      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel(defaultArgs);

      expect(actionsClientSimpleChatModel._llmType()).toEqual('ActionsClientSimpleChatModel');
    });

    it('returns the expected LLM type when overridden', () => {
      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel({
        ...defaultArgs,
        llmType: 'special-llm-type',
      });

      expect(actionsClientSimpleChatModel._llmType()).toEqual('special-llm-type');
    });
  });

  describe('_call streaming: false', () => {
    it('returns the expected content when _call is invoked', async () => {
      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel(defaultArgs);

      const result = await actionsClientSimpleChatModel._call(
        callMessages,
        callOptions,
        callRunManager
      );
      const subAction = actionsClient.execute.mock.calls[0][0].params.subAction;
      expect(subAction).toEqual('invokeAI');

      expect(result).toEqual(mockActionResponse.message);
    });

    it('rejects with the expected error when the action result status is error', async () => {
      const hasErrorStatus = jest.fn().mockImplementation(() => {
        throw Error(
          'ActionsClientSimpleChatModel: action result status is error: action-result-message - action-result-service-message'
        );
      });

      actionsClient.execute.mockRejectedValueOnce(hasErrorStatus);

      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel({
        ...defaultArgs,
        actionsClient,
      });

      await expect(
        actionsClientSimpleChatModel._call(callMessages, callOptions, callRunManager)
      ).rejects.toThrowError(
        'ActionsClientSimpleChatModel: action result status is error: action-result-message - action-result-service-message'
      );
    });

    it('rejects with the expected error the message has invalid content', async () => {
      const invalidContent = { message: 1234 };

      actionsClient.execute.mockImplementation(
        jest.fn().mockResolvedValue({
          data: invalidContent,
          status: 'ok',
        })
      );

      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel(defaultArgs);

      await expect(
        actionsClientSimpleChatModel._call(callMessages, callOptions, callRunManager)
      ).rejects.toThrowError(
        'ActionsClientSimpleChatModel: content should be a string, but it had an unexpected type: number'
      );
    });

    it('throws multimodal error', async () => {
      const invalidContent = { message: 1234 };

      mockExecute.mockImplementation(() => ({
        data: invalidContent,
        status: 'ok',
      }));

      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel(defaultArgs);

      await expect(
        actionsClientSimpleChatModel._call(
          // @ts-ignore
          [{ ...callMessages[0], content: null }],
          callOptions,
          callRunManager
        )
      ).rejects.toThrowError('Multimodal messages are not supported');
    });
  });

  describe('_call streaming: true', () => {
    beforeEach(() => {
      (parseBedrockStream as jest.Mock).mockResolvedValue(mockActionResponse.message);
      (parseGeminiStream as jest.Mock).mockResolvedValue(mockActionResponse.message);
    });
    it('returns the expected content when _call is invoked with streaming and llmType is Bedrock', async () => {
      actionsClient.execute.mockImplementationOnce(mockStreamExecute);
      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel({
        ...defaultArgs,
        actionsClient,
        llmType: 'bedrock',
        streaming: true,
        maxTokens: 333,
      });

      const result = await actionsClientSimpleChatModel._call(
        callMessages,
        callOptions,
        callRunManager
      );
      const subAction = mockStreamExecute.mock.calls[0][0].params.subAction;
      expect(subAction).toEqual('invokeStream');

      const { messages, ...rest } = mockStreamExecute.mock.calls[0][0].params.subActionParams;

      expect(rest).toEqual({
        temperature: 0,
        stopSequences: ['\n'],
        maxTokens: 333,
        model: undefined,
        telemetryMetadata: {
          aggregateBy: undefined,
          pluginId: undefined,
        },
      });

      expect(result).toEqual(mockActionResponse.message);
    });
    it('returns the expected content when _call is invoked with streaming and llmType is Gemini', async () => {
      actionsClient.execute.mockImplementationOnce(mockStreamExecute);
      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel({
        ...defaultArgs,
        actionsClient,
        llmType: 'gemini',
        streaming: true,
        maxTokens: 333,
      });

      const result = await actionsClientSimpleChatModel._call(
        callMessages,
        callOptions,
        callRunManager
      );
      const subAction = mockStreamExecute.mock.calls[0][0].params.subAction;
      expect(subAction).toEqual('invokeStream');
      const { messages, ...rest } = mockStreamExecute.mock.calls[0][0].params.subActionParams;

      expect(rest).toEqual({
        temperature: 0,
        model: undefined,
        telemetryMetadata: {
          aggregateBy: undefined,
          pluginId: undefined,
        },
      });

      expect(result).toEqual(mockActionResponse.message);
    });
    it('does not call handleLLMNewToken until the final answer', async () => {
      (parseBedrockStream as jest.Mock).mockImplementation((_1, _2, _3, handleToken) => {
        handleToken('token1');
        handleToken('token2');
        handleToken('token3');
        handleToken('token4');
        handleToken('token5');
        handleToken(`"action":`);
        handleToken(`"Final Answer"`);
        handleToken(`, "action_input": "`);
        handleToken('token6');
      });
      actionsClient.execute.mockImplementationOnce(mockStreamExecute);

      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel({
        ...defaultArgs,
        actionsClient,
        llmType: 'bedrock',
        streaming: true,
      });
      await actionsClientSimpleChatModel._call(callMessages, callOptions, callRunManager);
      expect(handleLLMNewToken).toHaveBeenCalledTimes(1);
      expect(handleLLMNewToken).toHaveBeenCalledWith('token6');
    });
    it('does not call handleLLMNewToken after the final output ends', async () => {
      (parseBedrockStream as jest.Mock).mockImplementation((_1, _2, _3, handleToken) => {
        handleToken('token5');
        handleToken(`"action":`);
        handleToken(`"Final Answer"`);
        handleToken(`, "action_input": "`);
        handleToken('token6');
        handleToken('"');
        handleToken('token7');
      });
      actionsClient.execute.mockImplementationOnce(mockStreamExecute);
      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel({
        ...defaultArgs,
        actionsClient,
        llmType: 'bedrock',
        streaming: true,
      });
      await actionsClientSimpleChatModel._call(callMessages, callOptions, callRunManager);
      expect(handleLLMNewToken).toHaveBeenCalledTimes(1);
      expect(handleLLMNewToken).toHaveBeenCalledWith('token6');
    });
    it('extra tokens in the final answer start chunk get pushed to handleLLMNewToken', async () => {
      (parseBedrockStream as jest.Mock).mockImplementation((_1, _2, _3, handleToken) => {
        handleToken('token1');
        handleToken(`"action":`);
        handleToken(`"Final Answer"`);
        handleToken(`, "action_input": "token5 `);
        handleToken('token6');
      });
      actionsClient.execute.mockImplementationOnce(mockStreamExecute);

      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel({
        ...defaultArgs,
        actionsClient,
        llmType: 'bedrock',
        streaming: true,
      });
      await actionsClientSimpleChatModel._call(callMessages, callOptions, callRunManager);
      expect(handleLLMNewToken).toHaveBeenCalledTimes(2);
      expect(handleLLMNewToken).toHaveBeenCalledWith('token5 ');
      expect(handleLLMNewToken).toHaveBeenCalledWith('token6');
    });
    it('extra tokens in the final answer end chunk get pushed to handleLLMNewToken', async () => {
      (parseBedrockStream as jest.Mock).mockImplementation((_1, _2, _3, handleToken) => {
        handleToken('token5');
        handleToken(`"action":`);
        handleToken(`"Final Answer"`);
        handleToken(`, "action_input": "`);
        handleToken('token6');
        handleToken('token7"');
        handleToken('token8');
      });
      actionsClient.execute.mockImplementationOnce(mockStreamExecute);
      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel({
        ...defaultArgs,
        actionsClient,
        llmType: 'bedrock',
        streaming: true,
      });
      await actionsClientSimpleChatModel._call(callMessages, callOptions, callRunManager);
      expect(handleLLMNewToken).toHaveBeenCalledTimes(2);
      expect(handleLLMNewToken).toHaveBeenCalledWith('token6');
      expect(handleLLMNewToken).toHaveBeenCalledWith('token7');
    });
  });

  describe('*_streamResponseChunks', () => {
    it('iterates over bedrock chunks', async () => {
      function* mockFetchData() {
        yield 'token1';
        yield 'token2';
        yield 'token3';
      }
      (parseBedrockStreamAsAsyncIterator as jest.Mock).mockImplementation(mockFetchData);
      actionsClient.execute.mockImplementationOnce(mockStreamExecute);

      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel({
        ...defaultArgs,
        actionsClient,
        llmType: 'bedrock',
        streaming: true,
      });

      const gen = actionsClientSimpleChatModel._streamResponseChunks(
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
    it('iterates over gemini chunks', async () => {
      function* mockFetchData() {
        yield 'token1';
        yield 'token2';
        yield 'token3';
      }
      (parseGeminiStreamAsAsyncIterator as jest.Mock).mockImplementation(mockFetchData);
      actionsClient.execute.mockImplementationOnce(mockStreamExecute);

      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel({
        ...defaultArgs,
        actionsClient,
        llmType: 'gemini',
        streaming: true,
      });

      const gen = actionsClientSimpleChatModel._streamResponseChunks(
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
