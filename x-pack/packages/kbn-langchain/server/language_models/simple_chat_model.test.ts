/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';

import { ActionsClientSimpleChatModel, CustomChatModelInput } from './simple_chat_model';
import { mockActionResponse } from './mocks';
import { BaseMessage } from '@langchain/core/messages';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { parseBedrockStream } from '../utils/bedrock';
import { parseGeminiStream } from '../utils/gemini';

const connectorId = 'mock-connector-id';

const mockExecute = jest.fn();

const mockLogger = loggerMock.create();

const mockActions = {
  getActionsClientWithRequest: jest.fn().mockImplementation(() => ({
    execute: mockExecute,
  })),
} as unknown as ActionsPluginStart;

const mockStreamExecute = jest.fn().mockImplementation(() => ({
  data: new PassThrough(),
  status: 'ok',
}));
const mockStreamActions = {
  getActionsClientWithRequest: jest.fn().mockImplementation(() => ({
    execute: mockStreamExecute,
  })),
} as unknown as ActionsPluginStart;

const prompt = 'Do you know my name?';
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

const mockRequest: CustomChatModelInput['request'] = {
  params: { connectorId },
  body: {
    message: prompt,
    subAction: 'invokeAI',
    isEnabledKnowledgeBase: true,
  },
} as CustomChatModelInput['request'];

const defaultArgs = {
  actions: mockActions,
  connectorId,
  logger: mockLogger,
  request: mockRequest,
  streaming: false,
};
jest.mock('../utils/bedrock');
jest.mock('../utils/gemini');

describe('ActionsClientSimpleChatModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      const subAction = mockExecute.mock.calls[0][0].params.subAction;
      expect(subAction).toEqual('invokeAI');

      expect(result).toEqual(mockActionResponse.message);
    });

    it('rejects with the expected error when the action result status is error', async () => {
      const hasErrorStatus = jest.fn().mockImplementation(() => ({
        message: 'action-result-message',
        serviceMessage: 'action-result-service-message',
        status: 'error', // <-- error status
      }));

      const badActions = {
        getActionsClientWithRequest: jest.fn().mockImplementation(() => ({
          execute: hasErrorStatus,
        })),
      } as unknown as ActionsPluginStart;

      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel({
        ...defaultArgs,
        actions: badActions,
      });

      await expect(
        actionsClientSimpleChatModel._call(callMessages, callOptions, callRunManager)
      ).rejects.toThrowError(
        'ActionsClientSimpleChatModel: action result status is error: action-result-message - action-result-service-message'
      );
    });

    it('rejects with the expected error the message has invalid content', async () => {
      const invalidContent = { message: 1234 };

      mockExecute.mockImplementation(() => ({
        data: invalidContent,
        status: 'ok',
      }));

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
      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel({
        ...defaultArgs,
        actions: mockStreamActions,
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
      });

      expect(result).toEqual(mockActionResponse.message);
    });
    it('returns the expected content when _call is invoked with streaming and llmType is Gemini', async () => {
      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel({
        ...defaultArgs,
        actions: mockStreamActions,
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
      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel({
        ...defaultArgs,
        actions: mockStreamActions,
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
      const actionsClientSimpleChatModel = new ActionsClientSimpleChatModel({
        ...defaultArgs,
        actions: mockStreamActions,
        llmType: 'bedrock',
        streaming: true,
      });
      await actionsClientSimpleChatModel._call(callMessages, callOptions, callRunManager);
      expect(handleLLMNewToken).toHaveBeenCalledTimes(1);
      expect(handleLLMNewToken).toHaveBeenCalledWith('token6');
    });
  });
});
