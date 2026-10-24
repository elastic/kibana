/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNativeFunctionCallingSupportedMock } from './inference_adapter.test.mocks';
import type OpenAI from 'openai';
import { v4 } from 'uuid';
import { PassThrough } from 'stream';
import { lastValueFrom, toArray, filter, noop, of } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
import {
  ToolChoiceType,
  ChatCompletionEventType,
  MessageRole,
  isChatCompletionChunkEvent,
  isChatCompletionTokenCountEvent,
  InferenceConnectorType,
} from '@kbn/inference-common';
import { observableIntoEventSourceStream } from '../../../util/observable_into_event_source_stream';
import type { InferenceExecutor } from '../../utils/inference_executor';
import { inferenceAdapter } from './inference_adapter';

function createOpenAIChunk({
  delta,
  usage,
}: {
  delta?: OpenAI.ChatCompletionChunk['choices'][number]['delta'];
  usage?: OpenAI.ChatCompletionChunk['usage'];
}): OpenAI.ChatCompletionChunk {
  return {
    choices: delta
      ? [
          {
            finish_reason: null,
            index: 0,
            delta,
          },
        ]
      : [],
    created: new Date().getTime(),
    id: v4(),
    model: 'gpt-4o',
    object: 'chat.completion.chunk',
    usage,
  };
}

describe('inferenceAdapter', () => {
  const executorMock = {
    getConnector: jest.fn(),
    invoke: jest.fn(),
  } as InferenceExecutor & {
    invoke: jest.MockedFn<InferenceExecutor['invoke']>;
    getConnector: jest.MockedFn<InferenceExecutor['getConnector']>;
  };

  const logger = loggerMock.create();

  beforeEach(() => {
    executorMock.invoke.mockReset();
    isNativeFunctionCallingSupportedMock.mockReset().mockReturnValue(true);
    executorMock.getConnector.mockReset().mockImplementation(() => {
      return {
        type: InferenceConnectorType.Inference,
        name: 'inference connector',
        connectorId: '.id',
        config: {},
        capabilities: {},
        isInferenceEndpoint: false,
        isPreconfigured: false,
      };
    });
  });

  const defaultArgs = {
    executor: executorMock,
    logger,
  };

  describe('when creating the request', () => {
    beforeEach(() => {
      executorMock.invoke.mockImplementation(async () => {
        return {
          actionId: '',
          status: 'ok',
          data: new PassThrough(),
        };
      });
    });

    it('emits chunk events', async () => {
      const source$ = of(
        createOpenAIChunk({
          delta: {
            content: 'First',
          },
        }),
        createOpenAIChunk({
          delta: {
            content: ', second',
          },
        })
      );

      executorMock.invoke.mockImplementation(async () => {
        return {
          actionId: '',
          status: 'ok',
          data: observableIntoEventSourceStream(source$, logger),
        };
      });

      const response$ = inferenceAdapter.chatComplete({
        ...defaultArgs,
        messages: [
          {
            role: MessageRole.User,
            content: 'Hello',
          },
        ],
      });

      const allChunks = await lastValueFrom(
        response$.pipe(filter(isChatCompletionChunkEvent), toArray())
      );

      expect(allChunks).toEqual([
        {
          content: 'First',
          tool_calls: [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
        {
          content: ', second',
          tool_calls: [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
      ]);
    });

    it('recovers a harmony tool call returned as content when tools are declared', async () => {
      const source$ = of(
        createOpenAIChunk({
          delta: {
            content:
              'assistantcommentary to=functions.load_skill json{"skill":"attack-discovery-generator"}',
          },
        })
      );

      executorMock.invoke.mockImplementation(async () => {
        return {
          actionId: '',
          status: 'ok',
          data: observableIntoEventSourceStream(source$, logger),
        };
      });

      const response$ = inferenceAdapter.chatComplete({
        ...defaultArgs,
        messages: [
          {
            role: MessageRole.User,
            content: 'Hello',
          },
        ],
        tools: {
          load_skill: {
            description: 'load a skill',
            schema: { type: 'object', properties: {} },
          },
        },
      });

      const allChunks = await lastValueFrom(
        response$.pipe(filter(isChatCompletionChunkEvent), toArray())
      );

      expect(allChunks).toEqual([
        {
          content: '',
          tool_calls: [
            {
              index: 0,
              toolCallId: 'load_skill-0',
              function: {
                name: 'load_skill',
                arguments: '{"skill":"attack-discovery-generator"}',
              },
            },
          ],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
      ]);
    });

    it('recovers the verbatim call the weekly gpt-oss-120b run leaked as content', async () => {
      const source$ = of(
        createOpenAIChunk({
          delta: {
            content:
              'analysisThe skill loaded; now we need to get status of execution_uuid ' +
              'a1b2c3d4-e5f6-7890-abcd-ef0123456789 using security.attack-discovery.get_status. ' +
              "This advances user's request." +
              'assistantcommentary to=functions.security.attack-discovery.get_status json{\n' +
              '  "execution_uuid": "a1b2c3d4-e5f6-7890-abcd-ef0123456789"\n' +
              '}',
          },
        })
      );

      executorMock.invoke.mockImplementation(async () => {
        return {
          actionId: '',
          status: 'ok',
          data: observableIntoEventSourceStream(source$, logger),
        };
      });

      const response$ = inferenceAdapter.chatComplete({
        ...defaultArgs,
        messages: [
          {
            role: MessageRole.User,
            content: 'Run attack discovery for the provided alerts',
          },
        ],
        tools: {
          'security.attack-discovery.get_status': {
            description: 'get the status of an attack discovery execution',
            schema: { type: 'object', properties: {} },
          },
          load_skill: {
            description: 'load a skill',
            schema: { type: 'object', properties: {} },
          },
        },
      });

      const allChunks = await lastValueFrom(
        response$.pipe(filter(isChatCompletionChunkEvent), toArray())
      );

      expect(allChunks).toEqual([
        {
          content:
            'analysisThe skill loaded; now we need to get status of execution_uuid ' +
            'a1b2c3d4-e5f6-7890-abcd-ef0123456789 using security.attack-discovery.get_status. ' +
            "This advances user's request.",
          tool_calls: [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
        {
          content: '',
          tool_calls: [
            {
              index: 0,
              toolCallId: 'security.attack-discovery.get_status-0',
              function: {
                name: 'security.attack-discovery.get_status',
                arguments: '{\n  "execution_uuid": "a1b2c3d4-e5f6-7890-abcd-ef0123456789"\n}',
              },
            },
          ],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
      ]);
    });

    it('passes a native tool_calls delta through when tools are declared', async () => {
      const source$ = of(
        createOpenAIChunk({
          delta: {
            tool_calls: [
              {
                index: 0,
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'load_skill',
                  arguments: '{"skill":"attack-discovery-generator"}',
                },
              },
            ],
          },
        })
      );

      executorMock.invoke.mockImplementation(async () => {
        return {
          actionId: '',
          status: 'ok',
          data: observableIntoEventSourceStream(source$, logger),
        };
      });

      const response$ = inferenceAdapter.chatComplete({
        ...defaultArgs,
        messages: [
          {
            role: MessageRole.User,
            content: 'Hello',
          },
        ],
        tools: {
          load_skill: {
            description: 'load a skill',
            schema: { type: 'object', properties: {} },
          },
        },
      });

      const allChunks = await lastValueFrom(
        response$.pipe(filter(isChatCompletionChunkEvent), toArray())
      );

      expect(allChunks).toEqual([
        {
          content: '',
          tool_calls: [
            {
              index: 0,
              toolCallId: 'call_1',
              function: {
                name: 'load_skill',
                arguments: '{"skill":"attack-discovery-generator"}',
              },
            },
          ],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
      ]);
    });

    it('passes a refusal through when tools are declared', async () => {
      const source$ = of(
        createOpenAIChunk({
          delta: {
            refusal: 'I cannot help with that.',
          },
        })
      );

      executorMock.invoke.mockImplementation(async () => {
        return {
          actionId: '',
          status: 'ok',
          data: observableIntoEventSourceStream(source$, logger),
        };
      });

      const response$ = inferenceAdapter.chatComplete({
        ...defaultArgs,
        messages: [
          {
            role: MessageRole.User,
            content: 'Hello',
          },
        ],
        tools: {
          load_skill: {
            description: 'load a skill',
            schema: { type: 'object', properties: {} },
          },
        },
      });

      const allChunks = await lastValueFrom(
        response$.pipe(filter(isChatCompletionChunkEvent), toArray())
      );

      expect(allChunks).toEqual([
        {
          content: '',
          refusal: 'I cannot help with that.',
          tool_calls: [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
      ]);
    });

    it('leaves a harmony call to an undeclared tool in the content', async () => {
      const content = 'assistantcommentary to=functions.delete_index json{}';

      const source$ = of(createOpenAIChunk({ delta: { content } }));

      executorMock.invoke.mockImplementation(async () => {
        return {
          actionId: '',
          status: 'ok',
          data: observableIntoEventSourceStream(source$, logger),
        };
      });

      const response$ = inferenceAdapter.chatComplete({
        ...defaultArgs,
        messages: [
          {
            role: MessageRole.User,
            content: 'Hello',
          },
        ],
        tools: {
          load_skill: {
            description: 'load a skill',
            schema: { type: 'object', properties: {} },
          },
        },
      });

      const allChunks = await lastValueFrom(
        response$.pipe(filter(isChatCompletionChunkEvent), toArray())
      );

      expect(allChunks).toEqual([
        {
          content,
          tool_calls: [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
      ]);
    });

    it('emits token count event when provided by the response', async () => {
      const source$ = of(
        createOpenAIChunk({
          delta: {
            content: 'First',
          },
          usage: {
            completion_tokens: 5,
            prompt_tokens: 10,
            total_tokens: 15,
          },
        })
      );

      executorMock.invoke.mockImplementation(async () => {
        return {
          actionId: '',
          status: 'ok',
          data: observableIntoEventSourceStream(source$, logger),
        };
      });

      const response$ = inferenceAdapter.chatComplete({
        ...defaultArgs,
        messages: [
          {
            role: MessageRole.User,
            content: 'Hello',
          },
        ],
      });

      const tokenChunks = await lastValueFrom(
        response$.pipe(filter(isChatCompletionTokenCountEvent), toArray())
      );

      expect(tokenChunks).toEqual([
        {
          type: ChatCompletionEventType.ChatCompletionTokenCount,
          tokens: {
            completion: 5,
            prompt: 10,
            total: 15,
          },
          model: 'gpt-4o', // Model from createOpenAIChunk helper
        },
      ]);
    });

    it('emits token count event when not provided by the response', async () => {
      const source$ = of(
        createOpenAIChunk({
          delta: {
            content: 'First',
          },
        })
      );

      executorMock.invoke.mockImplementation(async () => {
        return {
          actionId: '',
          status: 'ok',
          data: observableIntoEventSourceStream(source$, logger),
        };
      });

      const response$ = inferenceAdapter.chatComplete({
        ...defaultArgs,
        messages: [
          {
            role: MessageRole.User,
            content: 'Hello',
          },
        ],
      });

      const tokenChunks = await lastValueFrom(
        response$.pipe(filter(isChatCompletionTokenCountEvent), toArray())
      );

      expect(tokenChunks).toHaveLength(1);
      expect(tokenChunks[0]).toMatchObject({
        type: ChatCompletionEventType.ChatCompletionTokenCount,
        tokens: {
          completion: expect.any(Number),
          prompt: expect.any(Number),
          total: expect.any(Number),
        },
      });
      // Model field is optional - only present if request.model is set
      // Since no modelName is provided, model should be undefined/not present
    });

    it('propagates the temperature parameter', () => {
      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          temperature: 0.4,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          body: expect.objectContaining({
            temperature: 0.4,
          }),
        }),
      });
    });

    it('forwards only connector-supported telemetry metadata', () => {
      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          metadata: {
            connectorTelemetry: {
              pluginId: 'feature',
              aggregateBy: 'parent',
              productSolution: 'solution',
              productFeature: 'product-feature',
              interactionId: 'interaction-1',
            },
          },
        })
        .subscribe(noop);

      expect(executorMock.invoke.mock.calls[0]?.[0].subActionParams?.telemetryMetadata).toEqual({
        pluginId: 'feature',
        aggregateBy: 'parent',
      });
    });

    it('defaults reasoning effort to none when native tools are present and the model requires it', () => {
      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          modelName: 'gpt-5.4',
          tools: {
            foo: { description: 'my tool' },
          },
          toolChoice: ToolChoiceType.auto,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          body: expect.objectContaining({
            tools: expect.any(Array),
            reasoning: { effort: 'none' },
          }),
        }),
      });
    });

    it('resolves the model from the connector inference endpoint id for the reasoning default', () => {
      executorMock.getConnector.mockImplementation(() => {
        return {
          type: InferenceConnectorType.Inference,
          name: 'inference connector',
          connectorId: '.id',
          config: { provider: 'elastic', inferenceId: '.openai-gpt-5.4-chat_completion' },
          capabilities: {},
          isInferenceEndpoint: false,
          isPreconfigured: false,
        };
      });

      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          tools: {
            foo: { description: 'my tool' },
          },
          toolChoice: ToolChoiceType.auto,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          body: expect.objectContaining({
            tools: expect.any(Array),
            reasoning: { effort: 'none' },
          }),
        }),
      });
    });

    it('omits the reasoning default when the model does not tolerate disabled reasoning', () => {
      executorMock.getConnector.mockImplementation(() => {
        return {
          type: InferenceConnectorType.Inference,
          name: 'inference connector',
          connectorId: '.id',
          config: { provider: 'elastic', inferenceId: '.google-gemini-2.5-pro-chat_completion' },
          capabilities: {},
          isInferenceEndpoint: false,
          isPreconfigured: false,
        };
      });

      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          tools: {
            foo: { description: 'my tool' },
          },
          toolChoice: ToolChoiceType.auto,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          body: expect.not.objectContaining({
            reasoning: expect.anything(),
          }),
        }),
      });
    });

    it('omits the reasoning default when the model is unknown', () => {
      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          tools: {
            foo: { description: 'my tool' },
          },
          toolChoice: ToolChoiceType.auto,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          body: expect.not.objectContaining({
            reasoning: expect.anything(),
          }),
        }),
      });
    });

    it('propagates an explicit reasoning parameter', () => {
      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          tools: {
            foo: { description: 'my tool' },
          },
          toolChoice: ToolChoiceType.auto,
          reasoning: { effort: 'high', summary: 'concise' },
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          body: expect.objectContaining({
            reasoning: { effort: 'high', summary: 'concise' },
          }),
        }),
      });
    });

    it('omits reasoning when tools are absent and reasoning is not provided', () => {
      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          body: expect.not.objectContaining({
            reasoning: expect.anything(),
          }),
        }),
      });
    });

    it('propagates the abort signal when provided', () => {
      const abortController = new AbortController();

      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          abortSignal: abortController.signal,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          signal: abortController.signal,
        }),
      });
    });

    it('uses the right value for functionCalling=auto', () => {
      isNativeFunctionCallingSupportedMock.mockReturnValue(false);

      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          tools: {
            foo: { description: 'my tool' },
          },
          toolChoice: ToolChoiceType.auto,
          functionCalling: 'auto',
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          body: expect.not.objectContaining({
            tools: expect.any(Array),
          }),
        }),
      });
    });

    it('propagates the modelName parameter', () => {
      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          modelName: 'gpt-4o',
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          body: expect.objectContaining({
            model: 'gpt-4o',
          }),
        }),
      });
    });

    it('throws an error if the connector response is in error', async () => {
      executorMock.invoke.mockImplementation(async () => {
        return {
          actionId: 'actionId',
          status: 'error',
          serviceMessage: 'something went wrong',
          data: undefined,
        };
      });

      await expect(
        lastValueFrom(
          inferenceAdapter
            .chatComplete({
              ...defaultArgs,
              messages: [{ role: MessageRole.User, content: 'Hello' }],
            })
            .pipe(toArray())
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Error calling connector: something went wrong"`
      );
    });
  });
});
