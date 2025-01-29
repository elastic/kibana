/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, Observable } from 'rxjs';
import { z } from '@kbn/zod';
import {
  AIMessage,
  AIMessageChunk,
  HumanMessage,
  isAIMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import {
  ChatCompleteAPI,
  ChatCompleteResponse,
  ChatCompleteStreamResponse,
  ChatCompletionChunkEvent,
  ChatCompletionEvent,
  ChatCompletionEventType,
  ChatCompletionTokenCount,
  InferenceConnector,
  InferenceConnectorType,
  MessageRole,
  createInferenceRequestError,
} from '@kbn/inference-common';
import { InferenceChatModel } from './inference_chat_model';

const createConnector = (parts: Partial<InferenceConnector> = {}): InferenceConnector => {
  return {
    type: InferenceConnectorType.Inference,
    connectorId: 'connector-id',
    name: 'My connector',
    config: {},
    ...parts,
  };
};

const createResponse = (parts: Partial<ChatCompleteResponse> = {}): ChatCompleteResponse => {
  return {
    content: 'content',
    toolCalls: [],
    tokens: undefined,
    ...parts,
  };
};

const createStreamResponse = (
  chunks: ChunkEventInput[],
  tokenCount?: ChatCompletionTokenCount
): ChatCompleteStreamResponse => {
  const events: ChatCompletionEvent[] = chunks.map(createChunkEvent);
  if (tokenCount) {
    events.push({
      type: ChatCompletionEventType.ChatCompletionTokenCount,
      tokens: tokenCount,
    });
  }
  const finalContent = chunks
    .map((chunk) => {
      return typeof chunk === 'string' ? chunk : chunk.content;
    })
    .join('');
  events.push({
    type: ChatCompletionEventType.ChatCompletionMessage,
    content: finalContent,
    toolCalls: [], // final message isn't used anyway so no need to compute this
  });

  return of(...events);
};

type ChunkEventInput = string | Partial<Omit<ChatCompletionChunkEvent, 'type'>>;

const createChunkEvent = (input: ChunkEventInput): ChatCompletionChunkEvent => {
  if (typeof input === 'string') {
    return {
      type: ChatCompletionEventType.ChatCompletionChunk,
      content: input,
      tool_calls: [],
    };
  } else {
    return {
      type: ChatCompletionEventType.ChatCompletionChunk,
      content: '',
      tool_calls: [],
      ...input,
    };
  }
};

describe('InferenceChatModel', () => {
  let chatComplete: ChatCompleteAPI & jest.MockedFn<ChatCompleteAPI>;
  let connector: InferenceConnector;
  let logger: MockedLogger;

  beforeEach(() => {
    logger = loggerMock.create();
    chatComplete = jest.fn();
    connector = createConnector();
  });

  describe('Request conversion', () => {
    it('converts a basic message call', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
      });

      const response = createResponse({ content: 'dummy' });
      chatComplete.mockResolvedValue(response);

      await chatModel.invoke('Some question');

      expect(chatComplete).toHaveBeenCalledTimes(1);
      expect(chatComplete).toHaveBeenCalledWith({
        connectorId: connector.connectorId,
        messages: [
          {
            role: MessageRole.User,
            content: 'Some question',
          },
        ],
        stream: false,
      });
    });

    it('converts a complete conversation call', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
      });

      const response = createResponse({ content: 'dummy' });
      chatComplete.mockResolvedValue(response);

      await chatModel.invoke([
        new SystemMessage({
          content: 'system instructions',
        }),
        new HumanMessage({
          content: 'question',
        }),
        new AIMessage({
          content: 'answer',
        }),
        new HumanMessage({
          content: 'another question',
        }),
      ]);

      expect(chatComplete).toHaveBeenCalledTimes(1);
      expect(chatComplete).toHaveBeenCalledWith({
        connectorId: connector.connectorId,
        system: 'system instructions',
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
          {
            role: MessageRole.Assistant,
            content: 'answer',
          },
          {
            role: MessageRole.User,
            content: 'another question',
          },
        ],
        stream: false,
      });
    });

    it('converts a tool call conversation', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
      });

      const response = createResponse({ content: 'dummy' });
      chatComplete.mockResolvedValue(response);

      await chatModel.invoke([
        new HumanMessage({
          content: 'question',
        }),
        new AIMessage({
          content: '',
          tool_calls: [
            {
              id: 'toolCallId',
              name: 'myFunctionName',
              args: { arg1: 'value1' },
            },
          ],
        }),
        new ToolMessage({
          tool_call_id: 'toolCallId',
          content: '{ "response": 42 }',
        }),
        new AIMessage({
          content: 'answer',
        }),
        new HumanMessage({
          content: 'another question',
        }),
      ]);

      expect(chatComplete).toHaveBeenCalledTimes(1);
      expect(chatComplete).toHaveBeenCalledWith({
        connectorId: connector.connectorId,
        messages: [
          {
            content: 'question',
            role: 'user',
          },
          {
            role: 'assistant',
            content: '',
            toolCalls: [
              {
                toolCallId: 'toolCallId',
                function: {
                  arguments: {
                    arg1: 'value1',
                  },
                  name: 'myFunctionName',
                },
              },
            ],
          },
          {
            role: 'tool',
            name: 'toolCallId',
            response: '{ "response": 42 }',
            toolCallId: 'toolCallId',
          },
          {
            content: 'answer',
            role: 'assistant',
          },
          {
            content: 'another question',
            role: 'user',
          },
        ],
        stream: false,
      });
    });

    it('converts tools', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
      });

      const response = createResponse({ content: 'dummy' });
      chatComplete.mockResolvedValue(response);

      await chatModel.invoke(
        [
          new HumanMessage({
            content: 'question',
          }),
        ],
        {
          tools: [
            {
              name: 'test_tool',
              description: 'Just some test tool',
              schema: z.object({
                city: z.string().describe('The city to get the weather for'),
                zipCode: z.number().optional().describe('The zipCode to get the weather for'),
              }),
            },
          ],
        }
      );

      expect(chatComplete).toHaveBeenCalledTimes(1);
      expect(chatComplete).toHaveBeenCalledWith({
        connectorId: connector.connectorId,
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
        tools: {
          test_tool: {
            description: 'Just some test tool',
            schema: {
              properties: {
                city: {
                  description: 'The city to get the weather for',
                  type: 'string',
                },
                zipCode: {
                  description: 'The zipCode to get the weather for',
                  type: 'number',
                },
              },
              required: ['city'],
              type: 'object',
            },
          },
        },
        stream: false,
      });
    });

    it('uses constructor parameters', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
        temperature: 0.7,
        model: 'super-duper-model',
        functionCallingMode: 'simulated',
      });

      const response = createResponse({ content: 'dummy' });
      chatComplete.mockResolvedValue(response);

      await chatModel.invoke('question');

      expect(chatComplete).toHaveBeenCalledTimes(1);
      expect(chatComplete).toHaveBeenCalledWith({
        connectorId: connector.connectorId,
        messages: [{ role: MessageRole.User, content: 'question' }],
        functionCalling: 'simulated',
        temperature: 0.7,
        modelName: 'super-duper-model',
        stream: false,
      });
    });

    it('uses invocation parameters', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
        temperature: 0.7,
        model: 'super-duper-model',
        functionCallingMode: 'simulated',
      });

      const abortCtrl = new AbortController();

      const response = createResponse({ content: 'dummy' });
      chatComplete.mockResolvedValue(response);

      await chatModel.invoke('question', {
        temperature: 0,
        model: 'some-other-model',
        signal: abortCtrl.signal,
        tool_choice: 'auto',
      });

      expect(chatComplete).toHaveBeenCalledTimes(1);
      expect(chatComplete).toHaveBeenCalledWith({
        connectorId: connector.connectorId,
        messages: [{ role: MessageRole.User, content: 'question' }],
        toolChoice: 'auto',
        functionCalling: 'simulated',
        temperature: 0,
        modelName: 'some-other-model',
        abortSignal: abortCtrl.signal,
        stream: false,
      });
    });
  });

  describe('Response handling', () => {
    it('returns the content', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
      });

      const response = createResponse({
        content: 'response',
      });
      chatComplete.mockResolvedValue(response);

      const output: AIMessage = await chatModel.invoke('Some question');

      expect(isAIMessage(output)).toBe(true);
      expect(output.content).toEqual('response');
    });

    it('returns tool calls', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
      });

      const response = createResponse({
        content: '',
        toolCalls: [
          {
            toolCallId: 'myToolCallId',
            function: {
              name: 'myToolName',
              arguments: {
                arg1: 'val1',
              },
            },
          },
        ],
      });
      chatComplete.mockResolvedValue(response);

      const output: AIMessage = await chatModel.invoke('Some question');

      expect(output.content).toEqual('');
      expect(output.tool_calls).toEqual([
        {
          id: 'myToolCallId',
          name: 'myToolName',
          args: {
            arg1: 'val1',
          },
          type: 'tool_call',
        },
      ]);
    });

    it('returns the token count meta', async () => {
      let rawOutput: Record<string, any>;

      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
        callbacks: [
          {
            handleLLMEnd(_output) {
              rawOutput = _output;
            },
          },
        ],
      });

      const response = createResponse({
        content: 'response',
        tokens: {
          prompt: 5,
          completion: 10,
          total: 15,
        },
      });
      chatComplete.mockResolvedValue(response);

      const output: AIMessage = await chatModel.invoke('Some question');

      expect(output.response_metadata.tokenUsage).toEqual({
        promptTokens: 5,
        completionTokens: 10,
        totalTokens: 15,
      });

      expect(rawOutput!.llmOutput.tokenUsage).toEqual({
        promptTokens: 5,
        completionTokens: 10,
        totalTokens: 15,
      });
    });

    it('throws when the underlying call throws', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
        maxRetries: 0,
      });

      chatComplete.mockImplementation(async () => {
        throw new Error('something went wrong');
      });

      await expect(() =>
        chatModel.invoke('Some question')
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong"`);
    });

    it('respects the maxRetries parameter', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
        maxRetries: 1,
      });

      chatComplete
        .mockImplementationOnce(async () => {
          throw new Error('something went wrong');
        })
        .mockResolvedValueOnce(
          createResponse({
            content: 'response',
          })
        );

      const output = await chatModel.invoke('Some question');

      expect(output.content).toEqual('response');
      expect(chatComplete).toHaveBeenCalledTimes(2);
    });

    it('does not retry unrecoverable errors', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
        maxRetries: 0,
      });

      chatComplete.mockImplementation(async () => {
        throw createInferenceRequestError('bad parameter', 401);
      });

      await expect(() =>
        chatModel.invoke('Some question')
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"bad parameter"`);

      expect(chatComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Streaming response handling', () => {
    it('returns the chunks', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
      });

      const response = createStreamResponse(['hello ', 'there', '.']);
      chatComplete.mockReturnValue(response);

      const output = await chatModel.stream('Some question');

      const allChunks: AIMessageChunk[] = [];
      for await (const chunk of output) {
        allChunks.push(chunk);
      }

      expect(allChunks.length).toBe(3);
      expect(allChunks.map((chunk) => chunk.content)).toEqual(['hello ', 'there', '.']);
    });

    it('returns tool calls', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
      });

      const response = createStreamResponse([
        {
          tool_calls: [
            { toolCallId: 'my-tool-call-id', index: 0, function: { name: '', arguments: '' } },
          ],
        },
        {
          tool_calls: [{ toolCallId: '', index: 0, function: { name: 'myfun', arguments: '' } }],
        },
        {
          tool_calls: [
            { toolCallId: '', index: 0, function: { name: 'ction', arguments: ' { "' } },
          ],
        },
        {
          tool_calls: [{ toolCallId: '', index: 0, function: { name: '', arguments: 'arg1": ' } }],
        },
        {
          tool_calls: [{ toolCallId: '', index: 0, function: { name: '', arguments: '42 }' } }],
        },
      ]);
      chatComplete.mockReturnValue(response);

      const output = await chatModel.stream('Some question');

      const allChunks: AIMessageChunk[] = [];
      let concatChunk: AIMessageChunk | undefined;
      for await (const chunk of output) {
        allChunks.push(chunk);
        concatChunk = concatChunk ? concatChunk.concat(chunk) : chunk;
      }

      expect(allChunks.length).toBe(5);
      expect(concatChunk!.tool_calls).toEqual([
        {
          id: 'my-tool-call-id',
          name: 'myfunction',
          args: {
            arg1: 42,
          },
          type: 'tool_call',
        },
      ]);
    });

    it('returns the token count meta', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
      });

      const response = createStreamResponse(['hello ', 'there', '.'], {
        prompt: 5,
        completion: 20,
        total: 25,
      });
      chatComplete.mockReturnValue(response);

      const output = await chatModel.stream('Some question');

      const allChunks: AIMessageChunk[] = [];
      for await (const chunk of output) {
        allChunks.push(chunk);
      }

      expect(allChunks.length).toBe(4);
      expect(allChunks.map((chunk) => chunk.content)).toEqual(['hello ', 'there', '.', '']);
      expect(allChunks[3].usage_metadata).toEqual({
        input_tokens: 5,
        output_tokens: 20,
        total_tokens: 25,
      });

      const concatChunk = allChunks.reduce((concat, current) => {
        return concat.concat(current);
      });

      expect(concatChunk.usage_metadata).toEqual({
        input_tokens: 5,
        output_tokens: 20,
        total_tokens: 25,
      });
    });

    it('throws when the underlying call throws', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
        maxRetries: 0,
      });

      chatComplete.mockImplementation(async () => {
        throw new Error('something went wrong');
      });

      await expect(() =>
        chatModel.stream('Some question')
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong"`);
    });

    it('throws when the underlying observable errors', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
      });

      const response = new Observable<ChatCompletionEvent>((subscriber) => {
        subscriber.next(createChunkEvent('chunk1'));
        subscriber.next(createChunkEvent('chunk2'));
        subscriber.error(new Error('something went wrong'));
      });
      chatComplete.mockReturnValue(response);

      const output = await chatModel.stream('Some question');

      const allChunks: AIMessageChunk[] = [];
      await expect(async () => {
        for await (const chunk of output) {
          allChunks.push(chunk);
        }
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong"`);

      expect(allChunks.length).toBe(2);
    });
  });

  describe('#bindTools', () => {
    it('bind tools to be used for invocation', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
      });

      const response = createResponse({ content: 'dummy' });
      chatComplete.mockResolvedValue(response);

      const chatModelWithTools = chatModel.bindTools([
        {
          name: 'test_tool',
          description: 'Just some test tool',
          schema: z.object({
            city: z.string().describe('The city to get the weather for'),
            zipCode: z.number().optional().describe('The zipCode to get the weather for'),
          }),
        },
      ]);

      await chatModelWithTools.invoke([
        new HumanMessage({
          content: 'question',
        }),
      ]);

      expect(chatComplete).toHaveBeenCalledTimes(1);
      expect(chatComplete).toHaveBeenCalledWith({
        connectorId: connector.connectorId,
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
        tools: {
          test_tool: {
            description: 'Just some test tool',
            schema: {
              properties: {
                city: {
                  description: 'The city to get the weather for',
                  type: 'string',
                },
                zipCode: {
                  description: 'The zipCode to get the weather for',
                  type: 'number',
                },
              },
              required: ['city'],
              type: 'object',
            },
          },
        },
        stream: false,
      });
    });
  });

  describe('#identifyingParams', () => {
    it('returns connectorId and modelName from the constructor', () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
        model: 'my-super-model',
      });

      const identifyingParams = chatModel.identifyingParams();

      expect(identifyingParams).toEqual({
        connectorId: 'connector-id',
        modelName: 'my-super-model',
        model_name: 'my-super-model',
      });
    });
  });

  describe('#getLsParams', () => {
    it('returns connectorId and modelName from the constructor', () => {
      connector = createConnector({
        config: {
          provider: 'elastic',
          providerConfig: {
            model_id: 'some-default-model-id',
          },
        },
      });

      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
        model: 'my-super-model',
        temperature: 0.7,
      });

      const lsParams = chatModel.getLsParams({});

      expect(lsParams).toEqual({
        ls_model_name: 'my-super-model',
        ls_model_type: 'chat',
        ls_provider: 'inference-elastic',
        ls_temperature: 0.7,
      });
    });
  });

  describe('#withStructuredOutput', () => {
    it('binds the correct parameters', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
      });

      const structuredOutputModel = chatModel.withStructuredOutput(
        z
          .object({
            city: z.string().describe('The city to get the weather for'),
            zipCode: z.number().optional().describe('The zipCode to get the weather for'),
          })
          .describe('Use to get the weather'),
        { name: 'weather_tool' }
      );

      const response = createResponse({
        content: '',
        toolCalls: [
          {
            toolCallId: 'myToolCallId',
            function: {
              name: 'weather_tool',
              arguments: {
                city: 'Paris',
              },
            },
          },
        ],
      });
      chatComplete.mockResolvedValue(response);

      await structuredOutputModel.invoke([
        new HumanMessage({
          content: 'What is the weather like in Paris?',
        }),
      ]);

      expect(chatComplete).toHaveBeenCalledTimes(1);
      expect(chatComplete).toHaveBeenCalledWith({
        connectorId: connector.connectorId,
        messages: [
          {
            role: MessageRole.User,
            content: 'What is the weather like in Paris?',
          },
        ],
        toolChoice: {
          function: 'weather_tool',
        },
        tools: {
          weather_tool: {
            description: 'Use to get the weather',
            schema: {
              properties: {
                city: {
                  description: 'The city to get the weather for',
                  type: 'string',
                },
                zipCode: {
                  description: 'The zipCode to get the weather for',
                  type: 'number',
                },
              },
              required: ['city'],
              type: 'object',
            },
          },
        },
        stream: false,
      });
    });

    it('returns the correct tool call', async () => {
      const chatModel = new InferenceChatModel({
        logger,
        chatComplete,
        connector,
      });

      const structuredOutputModel = chatModel.withStructuredOutput(
        z
          .object({
            city: z.string().describe('The city to get the weather for'),
            zipCode: z.number().optional().describe('The zipCode to get the weather for'),
          })
          .describe('Use to get the weather'),
        { name: 'weather_tool' }
      );

      const response = createResponse({
        content: '',
        toolCalls: [
          {
            toolCallId: 'myToolCallId',
            function: {
              name: 'weather_tool',
              arguments: {
                city: 'Paris',
              },
            },
          },
        ],
      });
      chatComplete.mockResolvedValue(response);

      const output = await structuredOutputModel.invoke([
        new HumanMessage({
          content: 'What is the weather like in Paris?',
        }),
      ]);

      expect(output).toEqual({ city: 'Paris' });
    });
  });
});
