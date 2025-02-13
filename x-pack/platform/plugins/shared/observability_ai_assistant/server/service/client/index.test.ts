/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ActionsClient } from '@kbn/actions-plugin/server/actions_client';
import type { CoreSetup, ElasticsearchClient, IUiSettingsClient, Logger } from '@kbn/core/server';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import { waitFor } from '@testing-library/react';
import { last, merge, repeat } from 'lodash';
import { Subject, Observable } from 'rxjs';
import { EventEmitter, type Readable } from 'stream';
import { finished } from 'stream/promises';
import { ObservabilityAIAssistantClient } from '.';
import { MessageRole, type Message } from '../../../common';
import {
  ChatCompletionChunkEvent,
  MessageAddEvent,
  StreamingChatResponseEventType,
} from '../../../common/conversation_complete';
import {
  ChatCompletionEventType as InferenceChatCompletionEventType,
  ChatCompleteResponse,
} from '@kbn/inference-common';
import { InferenceClient } from '@kbn/inference-plugin/server';
import { createFunctionResponseMessage } from '../../../common/utils/create_function_response_message';
import { CONTEXT_FUNCTION_NAME } from '../../functions/context';
import { ChatFunctionClient } from '../chat_function_client';
import type { KnowledgeBaseService } from '../knowledge_base_service';
import { observableIntoStream } from '../util/observable_into_stream';
import type { ObservabilityAIAssistantConfig } from '../../config';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../../types';

interface ChunkDelta {
  content?: string | undefined;
  function_call?:
    | {
        name?: string | undefined;
        arguments?: string | undefined;
      }
    | undefined;
}

type LlmSimulator = ReturnType<typeof createLlmSimulator>;

const EXPECTED_STORED_SYSTEM_MESSAGE = `system`;

const nextTick = () => {
  return new Promise(process.nextTick);
};

const waitForNextWrite = async (stream: Readable): Promise<any> => {
  // this will fire before the client's internal write() promise is
  // resolved
  const response = await new Promise((resolve) => stream.once('data', resolve));
  // so we wait another tick to let the client move to the next step
  await nextTick();

  return response;
};

function createLlmSimulator(subscriber: any) {
  return {
    next: async (msg: ChunkDelta) => {
      subscriber.next({
        type: InferenceChatCompletionEventType.ChatCompletionMessage,
        content: msg.content,
        toolCalls: msg.function_call ? [{ function: msg.function_call }] : [],
      });
    },
    tokenCount: async ({
      completion,
      prompt,
      total,
    }: {
      completion: number;
      prompt: number;
      total: number;
    }) => {
      subscriber.next({
        type: InferenceChatCompletionEventType.ChatCompletionTokenCount,
        tokens: { completion, prompt, total },
      });
      subscriber.complete();
    },
    chunk: async (msg: ChunkDelta) => {
      subscriber.next({
        type: InferenceChatCompletionEventType.ChatCompletionChunk,
        content: msg.content,
        tool_calls: msg.function_call ? [{ function: msg.function_call }] : [],
      });
    },
    complete: async (chatCompleteResponse?: ChatCompleteResponse) => {
      if (chatCompleteResponse) {
        subscriber.next(chatCompleteResponse);
      }
      subscriber.complete();
    },
    error: (error: Error) => {
      subscriber.error(error);
    },
  };
}

describe('Observability AI Assistant client', () => {
  let client: ObservabilityAIAssistantClient;

  const actionsClientMock: DeeplyMockedKeys<ActionsClient> = {
    execute: jest.fn(),
    get: jest.fn(),
  } as any;

  const inferenceClientMock: DeeplyMockedKeys<InferenceClient> = {
    chatComplete: jest.fn(),
  } as any;

  const uiSettingsClientMock: DeeplyMockedKeys<IUiSettingsClient> = {
    get: jest.fn(),
  } as any;

  const internalUserEsClientMock: DeeplyMockedKeys<ElasticsearchClient> = {
    search: jest.fn(),
    index: jest.fn(),
    update: jest.fn(),
  } as any;

  const currentUserEsClientMock: DeeplyMockedKeys<ElasticsearchClient> = {
    search: jest.fn(),
    fieldCaps: jest.fn(),
  } as any;

  const knowledgeBaseServiceMock: DeeplyMockedKeys<KnowledgeBaseService> = {
    recall: jest.fn(),
    getUserInstructions: jest.fn(),
  } as any;

  let loggerMock: DeeplyMockedKeys<Logger> = {} as any;

  const functionClientMock: DeeplyMockedKeys<ChatFunctionClient> = {
    executeFunction: jest.fn(),
    getFunctions: jest.fn(),
    hasFunction: jest.fn(),
    hasAction: jest.fn(),
    getActions: jest.fn(),
    validate: jest.fn(),
    getInstructions: jest.fn(),
    getAdhocInstructions: jest.fn(),
  } as any;

  let llmSimulator: LlmSimulator;

  function createClient() {
    jest.resetAllMocks();

    // uncomment this line for debugging
    // const consoleOrPassThrough = console.log.bind(console);
    const consoleOrPassThrough = () => {};

    loggerMock = {
      log: jest.fn().mockImplementation(consoleOrPassThrough),
      error: jest.fn().mockImplementation(consoleOrPassThrough),
      debug: jest.fn().mockImplementation(consoleOrPassThrough),
      trace: jest.fn().mockImplementation(consoleOrPassThrough),
      isLevelEnabled: jest.fn().mockReturnValue(true),
    } as any;

    functionClientMock.getFunctions.mockReturnValue([]);
    functionClientMock.hasFunction.mockImplementation((name) => {
      return name !== CONTEXT_FUNCTION_NAME;
    });

    functionClientMock.hasAction.mockReturnValue(false);
    functionClientMock.getActions.mockReturnValue([]);

    currentUserEsClientMock.search.mockResolvedValue({
      hits: {
        hits: [],
      },
    } as any);

    currentUserEsClientMock.fieldCaps.mockResolvedValue({
      fields: [],
    } as any);

    knowledgeBaseServiceMock.getUserInstructions.mockResolvedValue([]);

    functionClientMock.getInstructions.mockReturnValue(['system']);
    functionClientMock.getAdhocInstructions.mockReturnValue([]);

    return new ObservabilityAIAssistantClient({
      config: {} as ObservabilityAIAssistantConfig,
      core: {} as CoreSetup<ObservabilityAIAssistantPluginStartDependencies>,
      actionsClient: actionsClientMock,
      uiSettingsClient: uiSettingsClientMock,
      esClient: {
        asInternalUser: internalUserEsClientMock,
        asCurrentUser: currentUserEsClientMock,
      },
      inferenceClient: inferenceClientMock,
      knowledgeBaseService: knowledgeBaseServiceMock,
      logger: loggerMock,
      namespace: 'default',
      user: {
        name: 'johndoe',
      },
      scopes: ['all'],
    });
  }

  function system(content: string | Omit<Message['message'], 'role'>): Message {
    return merge(
      {
        '@timestamp': new Date().toString(),
        message: {
          role: MessageRole.System,
        },
      },
      typeof content === 'string' ? { message: { content } } : content
    );
  }

  function user(content: string | Omit<Message['message'], 'role'>): Message {
    return merge(
      {
        '@timestamp': new Date().toString(),
        message: {
          role: MessageRole.User,
        },
      },
      typeof content === 'string' ? { message: { content } } : content
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when completing a conversation without an initial conversation id', () => {
    let stream: Readable;

    let titleLlmPromiseResolve: (title: string) => void;
    let titleLlmPromiseReject: Function;

    beforeEach(async () => {
      client = createClient();

      inferenceClientMock.chatComplete
        .mockImplementationOnce(() => {
          return new Observable((subscriber) => {
            titleLlmPromiseResolve = (title: string) => {
              const titleLlmSimulator = createLlmSimulator(subscriber);
              titleLlmSimulator
                .complete({
                  content: '',
                  toolCalls: [
                    {
                      toolCallId: 'test_id',
                      function: {
                        name: 'title_conversation',
                        arguments: {
                          title,
                        },
                      },
                    },
                  ],
                  tokens: {
                    completion: 0,
                    prompt: 0,
                    total: 0,
                  },
                })
                .catch((error) => titleLlmSimulator.error(error));
            };
            titleLlmPromiseReject = (error: Error) => {
              subscriber.error(error);
            };
          });
        })
        .mockImplementationOnce(() => {
          return new Observable((subscriber) => {
            llmSimulator = createLlmSimulator(subscriber);
          });
        });

      stream = observableIntoStream(
        client.complete({
          connectorId: 'foo',
          messages: [system('This is a system message'), user('How many alerts do I have?')],
          functionClient: functionClientMock,
          signal: new AbortController().signal,
          persist: true,
        })
      );
    });

    describe('when streaming the response from the LLM', () => {
      let dataHandler: jest.Mock;

      beforeEach(async () => {
        dataHandler = jest.fn();

        stream.on('data', dataHandler);

        await llmSimulator.chunk({ content: 'Hello' });
        await llmSimulator.next({ content: 'Hello' });

        await nextTick();
      });

      it('calls the llm to generate a new title', () => {
        expect(inferenceClientMock.chatComplete.mock.calls[0]).toEqual([
          expect.objectContaining({
            connectorId: 'foo',
            stream: false,
            functionCalling: 'auto',
            toolChoice: expect.objectContaining({
              function: 'title_conversation',
            }),
            tools: expect.objectContaining({
              title_conversation: {
                description:
                  'Use this function to title the conversation. Do not wrap the title in quotes',
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                  },
                  required: ['title'],
                },
              },
            }),
            messages: expect.arrayContaining([
              {
                role: 'user',
                content:
                  'Generate a title, using the title_conversation_function, based on the following conversation:\n\n user: How many alerts do I have?',
              },
            ]),
          }),
        ]);
      });

      it('calls the llm again with the messages', () => {
        expect(inferenceClientMock.chatComplete.mock.calls[1]).toEqual([
          {
            connectorId: 'foo',
            stream: true,
            messages: expect.arrayContaining([
              { role: 'user', content: 'How many alerts do I have?' },
            ]),
            functionCalling: 'auto',
            toolChoice: undefined,
            tools: undefined,
          },
        ]);
      });

      it('incrementally streams the response to the client', async () => {
        expect(dataHandler).toHaveBeenCalledTimes(2);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        expect(JSON.parse(dataHandler.mock.calls[0])).toEqual({
          id: expect.any(String),
          message: {
            content: 'Hello',
          },
          type: StreamingChatResponseEventType.ChatCompletionChunk,
        });
      });

      describe('after the LLM errors out', () => {
        beforeEach(async () => {
          await llmSimulator.next({ content: ' again' });

          llmSimulator.error(new Error('Unexpected error'));

          await finished(stream);
        });

        it('adds an error to the stream and closes it', () => {
          expect(dataHandler).toHaveBeenCalledTimes(4);

          expect(JSON.parse(dataHandler.mock.lastCall!)).toEqual({
            error: {
              message: 'Unexpected error',
              stack: expect.any(String),
            },
            type: StreamingChatResponseEventType.ChatCompletionError,
          });
        });
      });

      describe('when generating a title fails', () => {
        beforeEach(async () => {
          titleLlmPromiseReject(new Error('Failed generating title'));

          await nextTick();
          await llmSimulator.tokenCount({ completion: 1, prompt: 33, total: 34 });
          await llmSimulator.complete();

          await finished(stream);
        });

        it('falls back to the default title', () => {
          expect(JSON.parse(dataHandler.mock.calls[3])).toEqual({
            conversation: {
              title: 'New conversation',
              id: expect.any(String),
              last_updated: expect.any(String),
              token_count: {
                completion: 1,
                prompt: 33,
                total: 34,
              },
            },
            type: StreamingChatResponseEventType.ConversationCreate,
          });

          expect(loggerMock.error).toHaveBeenCalled();
        });
      });

      describe('after completing the response from the LLM', () => {
        beforeEach(async () => {
          await llmSimulator.chunk({ content: ' again' });

          titleLlmPromiseResolve('An auto-generated title');
          await llmSimulator.tokenCount({ completion: 6, prompt: 210, total: 216 });
          await llmSimulator.complete();

          await finished(stream);
        });

        it('adds the completed message to the stream', () => {
          expect(JSON.parse(dataHandler.mock.calls[2])).toEqual({
            id: expect.any(String),
            message: {
              content: ' again',
            },
            type: StreamingChatResponseEventType.ChatCompletionChunk,
          });

          expect(JSON.parse(dataHandler.mock.calls[3])).toEqual({
            id: expect.any(String),
            message: {
              '@timestamp': expect.any(String),
              message: {
                content: 'Hello again',
                role: MessageRole.Assistant,
                function_call: {
                  arguments: '',
                  name: '',
                  trigger: MessageRole.Assistant,
                },
              },
            },
            type: StreamingChatResponseEventType.MessageAdd,
          });
        });

        it('creates a new conversation with the automatically generated title', () => {
          expect(JSON.parse(dataHandler.mock.calls[4])).toEqual({
            conversation: {
              title: 'An auto-generated title',
              id: expect.any(String),
              last_updated: expect.any(String),
              token_count: {
                completion: 6,
                prompt: 210,
                total: 216,
              },
            },
            type: StreamingChatResponseEventType.ConversationCreate,
          });

          expect(internalUserEsClientMock.index).toHaveBeenCalledWith({
            index: '.kibana-observability-ai-assistant-conversations',
            refresh: true,
            document: {
              '@timestamp': expect.any(String),
              conversation: {
                id: expect.any(String),
                last_updated: expect.any(String),
                title: 'An auto-generated title',
                token_count: {
                  completion: 6,
                  prompt: 210,
                  total: 216,
                },
              },
              labels: {},
              numeric_labels: {},
              public: false,
              namespace: 'default',
              user: {
                name: 'johndoe',
              },
              messages: [
                {
                  '@timestamp': expect.any(String),
                  message: {
                    content: EXPECTED_STORED_SYSTEM_MESSAGE,
                    role: MessageRole.System,
                  },
                },
                {
                  '@timestamp': expect.any(String),
                  message: {
                    content: 'How many alerts do I have?',
                    role: MessageRole.User,
                  },
                },
                {
                  '@timestamp': expect.any(String),
                  message: {
                    content: 'Hello again',
                    role: MessageRole.Assistant,
                    function_call: {
                      name: '',
                      arguments: '',
                      trigger: MessageRole.Assistant,
                    },
                  },
                },
              ],
            },
          });
        });
      });
    });
  });

  describe('when completing a conversation with an initial conversation id', () => {
    let stream: Readable;

    let dataHandler: jest.Mock;

    beforeEach(async () => {
      client = createClient();
      inferenceClientMock.chatComplete.mockImplementationOnce(() => {
        return new Observable((subscriber) => {
          llmSimulator = createLlmSimulator(subscriber);
        });
      });

      internalUserEsClientMock.search.mockImplementation(async () => {
        return {
          hits: {
            hits: [
              {
                _id: 'my-es-document-id',
                _index: '.kibana-observability-ai-assistant-conversations',
                _source: {
                  '@timestamp': new Date().toISOString(),
                  conversation: {
                    id: 'my-conversation-id',
                    title: 'My stored conversation',
                    last_updated: new Date().toISOString(),
                    token_count: {
                      completion: 1,
                      prompt: 78,
                      total: 79,
                    },
                  },
                  labels: {},
                  numeric_labels: {},
                  public: false,
                  messages: [
                    system('This is a system message'),
                    user('How many alerts do I have?'),
                  ],
                },
              },
            ],
          },
        } as any;
      });

      internalUserEsClientMock.update.mockImplementationOnce(async () => {
        return {} as any;
      });

      stream = observableIntoStream(
        await client.complete({
          connectorId: 'foo',
          messages: [system('This is a system message'), user('How many alerts do I have?')],
          functionClient: functionClientMock,
          signal: new AbortController().signal,
          conversationId: 'my-conversation-id',
          persist: true,
        })
      );

      dataHandler = jest.fn();

      stream.on('data', dataHandler);

      await nextTick();

      await llmSimulator.chunk({ content: 'Hello' });
      await llmSimulator.next({ content: 'Hello' });
      await llmSimulator.tokenCount({ completion: 1, prompt: 33, total: 34 });
      await llmSimulator.complete();

      await finished(stream);
    });

    it('updates the conversation', () => {
      expect(JSON.parse(dataHandler.mock.calls[3])).toEqual({
        conversation: {
          title: 'My stored conversation',
          id: expect.any(String),
          last_updated: expect.any(String),
          token_count: {
            completion: 2,
            prompt: 111,
            total: 113,
          },
        },
        type: StreamingChatResponseEventType.ConversationUpdate,
      });

      expect(internalUserEsClientMock.update).toHaveBeenCalledWith({
        refresh: true,
        index: '.kibana-observability-ai-assistant-conversations',
        id: 'my-es-document-id',
        doc: {
          '@timestamp': expect.any(String),
          conversation: {
            id: expect.any(String),
            last_updated: expect.any(String),
            title: 'My stored conversation',
            token_count: {
              completion: 2,
              prompt: 111,
              total: 113,
            },
          },
          labels: {},
          numeric_labels: {},
          public: false,
          namespace: 'default',
          user: {
            name: 'johndoe',
          },
          messages: [
            {
              '@timestamp': expect.any(String),
              message: {
                content: EXPECTED_STORED_SYSTEM_MESSAGE,
                role: MessageRole.System,
              },
            },
            {
              '@timestamp': expect.any(String),
              message: {
                content: 'How many alerts do I have?',
                role: MessageRole.User,
              },
            },
            {
              '@timestamp': expect.any(String),
              message: {
                content: 'Hello',
                role: MessageRole.Assistant,
                function_call: {
                  name: '',
                  arguments: '',
                  trigger: MessageRole.Assistant,
                },
              },
            },
          ],
        },
      });
    });
  });

  describe('when the LLM response fails', () => {
    let stream: Readable;

    let dataHandler: jest.Mock;

    beforeEach(async () => {
      client = createClient();
      inferenceClientMock.chatComplete.mockImplementationOnce(() => {
        return new Observable((subscriber) => {
          llmSimulator = createLlmSimulator(subscriber);
        });
      });

      stream = observableIntoStream(
        await client.complete({
          connectorId: 'foo',
          messages: [system('This is a system message'), user('How many alerts do I have?')],
          functionClient: functionClientMock,
          signal: new AbortController().signal,
          title: 'My predefined title',
          persist: true,
        })
      );

      dataHandler = jest.fn();

      stream.on('data', dataHandler);

      await nextTick();

      await llmSimulator.chunk({ content: 'Hello' });
      await llmSimulator.error(new Error('Connection unexpectedly closed'));
      await llmSimulator.complete();

      await finished(stream);
    });

    it('ends the stream and writes an error', async () => {
      expect(JSON.parse(dataHandler.mock.calls[1])).toEqual({
        error: {
          message: 'Connection unexpectedly closed',
          stack: expect.any(String),
        },
        type: StreamingChatResponseEventType.ChatCompletionError,
      });
    });

    it('does not create or update the conversation', async () => {
      expect(internalUserEsClientMock.index).not.toHaveBeenCalled();
      expect(internalUserEsClientMock.update).not.toHaveBeenCalled();
    });
  });

  describe('when the assistant answers with a function request', () => {
    let stream: Readable;

    let dataHandler: jest.Mock;

    let respondFn: jest.Mock;

    let fnResponseResolve: (data: unknown) => void;

    let fnResponseReject: (error: Error) => void;

    beforeEach(async () => {
      client = createClient();
      inferenceClientMock.chatComplete.mockImplementationOnce(() => {
        return new Observable((subscriber) => {
          llmSimulator = createLlmSimulator(subscriber);
        });
      });

      respondFn = jest.fn();

      functionClientMock.getFunctions.mockImplementation(() => [
        {
          definition: {
            name: 'myFunction',
            contexts: ['core'],
            description: 'my-description',
            descriptionForUser: '',
            parameters: {
              type: 'object',
              properties: {
                foo: {
                  type: 'string',
                  enum: ['bar'],
                },
              },
              required: ['foo'],
            },
          },
          respond: respondFn,
        },
      ]);

      functionClientMock.executeFunction.mockImplementationOnce(() => {
        return new Promise<any>((resolve, reject) => {
          fnResponseResolve = resolve;
          fnResponseReject = reject;
        });
      });

      stream = observableIntoStream(
        await client.complete({
          connectorId: 'foo',
          messages: [system('This is a system message'), user('How many alerts do I have?')],
          functionClient: functionClientMock,
          signal: new AbortController().signal,
          title: 'My predefined title',
          persist: true,
        })
      );

      dataHandler = jest.fn();

      stream.on('data', dataHandler);

      await nextTick();

      await llmSimulator.next({ content: 'Hello' });
      await llmSimulator.chunk({
        content: 'Hello',
        function_call: { name: 'myFunction', arguments: JSON.stringify({ foo: 'bar' }) },
      });

      const prevLlmSimulator = llmSimulator;

      inferenceClientMock.chatComplete.mockImplementationOnce(() => {
        return new Observable((subscriber) => {
          llmSimulator = createLlmSimulator(subscriber);
        });
      });

      await prevLlmSimulator.complete();

      await waitForNextWrite(stream);
    });

    describe('while the function call is pending', () => {
      it('appends the request message', async () => {
        expect(JSON.parse(dataHandler.mock.calls[2])).toEqual({
          type: StreamingChatResponseEventType.MessageAdd,
          id: expect.any(String),
          message: {
            '@timestamp': expect.any(String),
            message: {
              content: 'Hello',
              role: MessageRole.Assistant,
              function_call: {
                name: 'myFunction',
                arguments: JSON.stringify({ foo: 'bar' }),
                trigger: MessageRole.Assistant,
              },
            },
          },
        });
      });

      it('executes the function', () => {
        expect(functionClientMock.executeFunction).toHaveBeenCalledWith({
          name: 'myFunction',
          chat: expect.any(Function),
          args: JSON.stringify({ foo: 'bar' }),
          signal: expect.any(AbortSignal),
          connectorId: 'foo',
          messages: [
            {
              '@timestamp': expect.any(String),
              message: {
                role: MessageRole.System,
                content: EXPECTED_STORED_SYSTEM_MESSAGE,
              },
            },
            {
              '@timestamp': expect.any(String),
              message: {
                role: MessageRole.User,
                content: 'How many alerts do I have?',
              },
            },
            {
              '@timestamp': expect.any(String),
              message: {
                role: MessageRole.Assistant,
                content: 'Hello',
                function_call: {
                  name: 'myFunction',
                  arguments: JSON.stringify({ foo: 'bar' }),
                  trigger: MessageRole.Assistant,
                },
              },
            },
          ],
          simulateFunctionCalling: false,
        });
      });

      afterEach(async () => {
        fnResponseResolve({ content: { my: 'content' } });

        await waitForNextWrite(stream);

        await llmSimulator.complete();
        await finished(stream);
      });
    });

    describe('and the function succeeds', () => {
      beforeEach(async () => {
        fnResponseResolve({ content: { my: 'content' } });
        // await waitForNextWrite(stream);
      });

      it('appends the function response', () => {
        expect(JSON.parse(dataHandler.mock.calls[3])).toEqual({
          type: StreamingChatResponseEventType.MessageAdd,
          id: expect.any(String),
          message: {
            '@timestamp': expect.any(String),
            message: {
              role: MessageRole.User,
              name: 'myFunction',
              content: JSON.stringify({
                my: 'content',
              }),
            },
          },
        });
      });

      it('sends the function response back to the llm', () => {
        expect(inferenceClientMock.chatComplete).toHaveBeenCalledTimes(2);

        expect(inferenceClientMock.chatComplete.mock.lastCall!).toEqual([
          {
            connectorId: 'foo',
            stream: true,
            messages: expect.arrayContaining([
              { role: 'user', content: 'How many alerts do I have?' },
            ]),
            functionCalling: 'auto',
            toolChoice: 'auto',
            tools: expect.any(Object),
          },
        ]);
      });

      describe('and the assistant replies without a function request', () => {
        beforeEach(async () => {
          await llmSimulator.chunk({ content: 'I am done here' });
          await llmSimulator.next({ content: 'I am done here' });
          await llmSimulator.tokenCount({ completion: 0, prompt: 0, total: 0 });
          await llmSimulator.complete();
          await waitForNextWrite(stream);

          await finished(stream);
        });

        it('appends the assistant reply', () => {
          expect(JSON.parse(dataHandler.mock.calls[4])).toEqual({
            type: StreamingChatResponseEventType.ChatCompletionChunk,
            id: expect.any(String),
            message: {
              content: 'I am done here',
            },
          });
          expect(JSON.parse(dataHandler.mock.calls[6])).toEqual({
            type: StreamingChatResponseEventType.MessageAdd,
            id: expect.any(String),
            message: {
              '@timestamp': expect.any(String),
              message: {
                role: MessageRole.Assistant,
                content: 'I am done here',
                function_call: {
                  name: '',
                  arguments: '',
                  trigger: MessageRole.Assistant,
                },
              },
            },
          });
        });

        it('stores the conversation', () => {
          expect(JSON.parse(dataHandler.mock.lastCall!)).toEqual({
            type: StreamingChatResponseEventType.ConversationCreate,
            conversation: {
              id: expect.any(String),
              last_updated: expect.any(String),
              title: 'My predefined title',
              token_count: {
                completion: expect.any(Number),
                prompt: expect.any(Number),
                total: expect.any(Number),
              },
            },
          });

          expect(internalUserEsClientMock.index).toHaveBeenCalled();

          expect(
            (internalUserEsClientMock.index.mock.lastCall![0] as any).document.messages
          ).toEqual([
            {
              '@timestamp': expect.any(String),
              message: {
                content: EXPECTED_STORED_SYSTEM_MESSAGE,
                role: MessageRole.System,
              },
            },
            {
              '@timestamp': expect.any(String),
              message: {
                content: 'How many alerts do I have?',
                role: MessageRole.User,
              },
            },
            {
              '@timestamp': expect.any(String),
              message: {
                content: 'Hello',
                role: MessageRole.Assistant,
                function_call: {
                  name: 'myFunction',
                  arguments: JSON.stringify({ foo: 'bar' }),
                  trigger: MessageRole.Assistant,
                },
              },
            },
            {
              '@timestamp': expect.any(String),
              message: {
                content: JSON.stringify({
                  my: 'content',
                }),
                name: 'myFunction',
                role: MessageRole.User,
              },
            },
            {
              '@timestamp': expect.any(String),
              message: {
                content: 'I am done here',
                role: MessageRole.Assistant,
                function_call: {
                  name: '',
                  arguments: '',
                  trigger: MessageRole.Assistant,
                },
              },
            },
          ]);
        });
      });
    });

    describe('and the function fails', () => {
      beforeEach(async () => {
        fnResponseReject(new Error('Function failed'));
        await waitForNextWrite(stream);
      });

      it('appends the function response', () => {
        const parsed = JSON.parse(dataHandler.mock.lastCall!);

        parsed.message.message.content = JSON.parse(parsed.message.message.content);
        parsed.message.message.data = JSON.parse(parsed.message.message.data);

        expect(parsed).toEqual({
          type: StreamingChatResponseEventType.MessageAdd,
          id: expect.any(String),
          message: {
            '@timestamp': expect.any(String),
            message: {
              role: MessageRole.User,
              name: 'myFunction',
              content: {
                message: 'Function failed',
                error: {
                  name: 'Error',
                  message: 'Function failed',
                },
              },
              data: {
                stack: expect.any(String),
              },
            },
          },
        });
      });

      it('sends the function response back to the llm', () => {
        expect(inferenceClientMock.chatComplete).toHaveBeenCalledTimes(2);
        expect(inferenceClientMock.chatComplete.mock.lastCall!).toEqual([
          {
            connectorId: 'foo',
            stream: true,
            messages: expect.arrayContaining([
              { role: 'user', content: 'How many alerts do I have?' },
            ]),
            functionCalling: 'auto',
            toolChoice: 'auto',
            tools: expect.any(Object),
          },
        ]);
      });
    });

    describe('and the function responds with an observable', () => {
      let response$: Subject<ChatCompletionChunkEvent | MessageAddEvent>;
      beforeEach(async () => {
        response$ = new Subject();
        fnResponseResolve(response$);

        await nextTick();

        response$.next(createFunctionResponseMessage({ name: 'myFunction', content: {} }));
      });

      it('appends the function response', async () => {
        expect(JSON.parse(dataHandler.mock.calls[3]!)).toEqual({
          type: StreamingChatResponseEventType.MessageAdd,
          id: expect.any(String),
          message: {
            '@timestamp': expect.any(String),
            message: {
              role: MessageRole.User,
              name: 'myFunction',
              content: '{}',
            },
          },
        });
      });

      describe('if the observable completes', () => {
        beforeEach(async () => {
          response$.next({
            type: StreamingChatResponseEventType.ChatCompletionChunk,
            message: {
              content: 'Hello',
            },
            id: 'my-id',
          });

          response$.next({
            type: StreamingChatResponseEventType.MessageAdd,
            message: {
              '@timestamp': new Date().toString(),
              message: {
                role: MessageRole.Assistant,
                content: 'Hello',
              },
            },
            id: 'my-id',
          });

          response$.complete();

          await finished(stream);
        });

        it('emits a completion chunk', () => {
          expect(JSON.parse(dataHandler.mock.calls[4])).toEqual({
            type: StreamingChatResponseEventType.ChatCompletionChunk,
            id: expect.any(String),
            message: {
              content: 'Hello',
            },
          });
        });

        it('appends the observable response', () => {
          expect(JSON.parse(dataHandler.mock.calls[5])).toEqual({
            type: StreamingChatResponseEventType.MessageAdd,
            id: expect.any(String),
            message: {
              '@timestamp': expect.any(String),
              message: {
                role: MessageRole.Assistant,
                content: 'Hello',
              },
            },
          });
        });
      });

      describe('if the observable errors out', () => {
        beforeEach(async () => {
          response$.next({
            type: StreamingChatResponseEventType.ChatCompletionChunk,
            message: {
              content: 'Hello',
            },
            id: 'my-id',
          });
          response$.error(new Error('Unexpected error'));

          await finished(stream);
        });

        it('appends an error', () => {
          expect(JSON.parse(dataHandler.mock.lastCall!)).toEqual({
            type: StreamingChatResponseEventType.ChatCompletionError,
            error: {
              message: 'Unexpected error',
              stack: expect.any(String),
            },
          });
        });
      });
    });
  });

  describe('when context is available', () => {
    let stream: Readable;

    let dataHandler: jest.Mock;
    beforeEach(async () => {
      client = createClient();
      inferenceClientMock.chatComplete.mockImplementationOnce(() => {
        return new Observable((subscriber) => {
          llmSimulator = createLlmSimulator(subscriber);
        });
      });

      functionClientMock.hasFunction.mockReturnValue(true);

      functionClientMock.executeFunction.mockImplementationOnce(async (body) => {
        return {
          content: [
            {
              id: 'my_document',
              text: 'My document',
            },
          ],
        };
      });

      stream = observableIntoStream(
        await client.complete({
          connectorId: 'foo',
          messages: [system('This is a system message'), user('How many alerts do I have?')],
          functionClient: functionClientMock,
          signal: new AbortController().signal,
          persist: false,
        })
      );

      dataHandler = jest.fn();

      stream.on('data', dataHandler);

      await waitForNextWrite(stream);

      await llmSimulator.chunk({ content: 'Hello' });
      await llmSimulator.next({ content: 'Hello' });
      await llmSimulator.tokenCount({ completion: 0, prompt: 0, total: 0 });
      await llmSimulator.complete();

      await finished(stream);
    });

    it('appends the context request message', () => {
      expect(JSON.parse(dataHandler.mock.calls[0]!)).toEqual({
        type: StreamingChatResponseEventType.MessageAdd,
        id: expect.any(String),
        message: {
          '@timestamp': expect.any(String),
          message: {
            content: '',
            role: MessageRole.Assistant,
            function_call: {
              name: CONTEXT_FUNCTION_NAME,
              trigger: MessageRole.Assistant,
            },
          },
        },
      });
    });

    it('appends the context response', () => {
      expect(JSON.parse(dataHandler.mock.calls[1]!)).toEqual({
        type: StreamingChatResponseEventType.MessageAdd,
        id: expect.any(String),
        message: {
          '@timestamp': expect.any(String),
          message: {
            content: JSON.stringify([{ id: 'my_document', text: 'My document' }]),
            role: MessageRole.User,
            name: CONTEXT_FUNCTION_NAME,
          },
        },
      });
    });

    it('appends the response from the LLM', () => {
      expect(JSON.parse(dataHandler.mock.calls[2]!)).toEqual({
        type: StreamingChatResponseEventType.ChatCompletionChunk,
        id: expect.any(String),
        message: {
          content: 'Hello',
        },
      });

      expect(JSON.parse(dataHandler.mock.calls[4]!)).toEqual({
        type: StreamingChatResponseEventType.MessageAdd,
        id: expect.any(String),
        message: {
          '@timestamp': expect.any(String),
          message: {
            content: 'Hello',
            function_call: {
              name: '',
              arguments: '',
              trigger: MessageRole.Assistant,
            },
            role: MessageRole.Assistant,
          },
        },
      });
    });
  });

  describe('when the LLM keeps on calling a function and the limit has been exceeded', () => {
    let stream: Readable;

    let dataHandler: jest.Mock;
    const maxFunctionCalls = 8;

    beforeEach(async () => {
      client = createClient();

      const onLlmCall = new EventEmitter();

      function waitForNextLlmCall() {
        return new Promise<void>((resolve) => onLlmCall.addListener('next', resolve));
      }

      inferenceClientMock.chatComplete.mockImplementation(() => {
        return new Observable((subscriber) => {
          onLlmCall.emit('next');
          llmSimulator = createLlmSimulator(subscriber);
        });
      });

      functionClientMock.getFunctions.mockImplementation(() => [
        {
          definition: {
            name: 'get_top_alerts',
            contexts: ['core'],
            description: '',
          },
          respond: async () => {
            return { content: 'Call this function again' };
          },
        },
      ]);

      functionClientMock.hasFunction.mockImplementation((name) => name === 'get_top_alerts');
      functionClientMock.executeFunction.mockImplementation(async () => ({
        content: 'Call this function again',
      }));

      stream = observableIntoStream(
        await client.complete({
          connectorId: 'foo',
          messages: [system('This is a system message'), user('How many alerts do I have?')],
          functionClient: functionClientMock,
          signal: new AbortController().signal,
          title: 'My predefined title',
          persist: true,
        })
      );

      dataHandler = jest.fn();

      stream.on('data', dataHandler);

      async function requestAlertsFunctionCall() {
        const body = inferenceClientMock.chatComplete.mock.lastCall![0];
        let nextLlmCallPromise: Promise<void>;

        if (Object.keys(body.tools ?? {}).length) {
          nextLlmCallPromise = waitForNextLlmCall();
          await llmSimulator.chunk({ function_call: { name: 'get_top_alerts', arguments: '{}' } });
        } else {
          nextLlmCallPromise = Promise.resolve();
          await llmSimulator.chunk({ content: 'Looks like we are done here' });
        }

        await llmSimulator.complete();
        await nextLlmCallPromise;
      }

      await nextTick();

      for (let i = 0; i <= maxFunctionCalls; i++) {
        await requestAlertsFunctionCall();
      }

      await llmSimulator.complete();
      await finished(stream);
    });

    it(`executed the function no more than ${maxFunctionCalls} times`, () => {
      expect(functionClientMock.executeFunction).toHaveBeenCalledTimes(maxFunctionCalls);
    });

    it('asks the LLM to suggest next steps', () => {
      const firstBody = inferenceClientMock.chatComplete.mock.calls[0][0] as any;
      const body = inferenceClientMock.chatComplete.mock.lastCall![0] as any;

      expect(Object.keys(firstBody.tools ?? {}).length).toEqual(1);

      expect(body.tools).toEqual(undefined);
    });
  });

  describe('when context has not been injected since last user message', () => {
    let dataHandler: jest.Mock;

    beforeEach(async () => {
      client = createClient();
      inferenceClientMock.chatComplete.mockImplementationOnce(() => {
        return new Observable((subscriber) => {
          llmSimulator = createLlmSimulator(subscriber);
        });
      });

      functionClientMock.hasFunction.mockReturnValue(true);
      functionClientMock.executeFunction.mockImplementationOnce(async () => {
        return {
          content: [
            {
              id: 'my_document',
              text: 'My document',
            },
          ],
        };
      });

      const stream = observableIntoStream(
        await client.complete({
          connectorId: 'foo',
          messages: [system('This is a system message'), user('How many alerts do I have?')],
          functionClient: functionClientMock,
          signal: new AbortController().signal,
          persist: false,
        })
      );

      dataHandler = jest.fn();

      stream.on('data', dataHandler);

      await waitForNextWrite(stream);

      await llmSimulator.next({
        content: 'Hello',
      });

      await llmSimulator.complete();

      await finished(stream);
    });

    it('executes the context function', async () => {
      expect(functionClientMock.executeFunction).toHaveBeenCalledWith(
        expect.objectContaining({ name: CONTEXT_FUNCTION_NAME })
      );
    });

    it('appends the context request message', async () => {
      expect(JSON.parse(dataHandler.mock.calls[0])).toEqual({
        type: StreamingChatResponseEventType.MessageAdd,
        id: expect.any(String),
        message: {
          '@timestamp': expect.any(String),
          message: {
            content: '',
            role: MessageRole.Assistant,
            function_call: {
              name: CONTEXT_FUNCTION_NAME,
              trigger: MessageRole.Assistant,
            },
          },
        },
      });
    });
  });

  describe('when the function response exceeds the max no of tokens for one', () => {
    let stream: Readable;

    let dataHandler: jest.Mock;

    beforeEach(async () => {
      client = createClient();

      let functionResponsePromiseResolve: Function | undefined;

      inferenceClientMock.chatComplete.mockImplementationOnce(() => {
        return new Observable((subscriber) => {
          llmSimulator = createLlmSimulator(subscriber);
        });
      });

      functionClientMock.getFunctions.mockImplementation(() => [
        {
          definition: {
            name: 'get_top_alerts',
            contexts: ['core'],
            description: '',
            parameters: {},
          },
          respond: async () => {
            return { content: '' };
          },
        },
      ]);

      functionClientMock.hasFunction.mockImplementation((name) => name === 'get_top_alerts');

      functionClientMock.executeFunction.mockImplementation(() => {
        return new Promise((resolve) => {
          functionResponsePromiseResolve = resolve;
        });
      });

      stream = observableIntoStream(
        await client.complete({
          connectorId: 'foo',
          messages: [system('This is a system message'), user('How many alerts do I have?')],
          functionClient: functionClientMock,
          signal: new AbortController().signal,
          title: 'My predefined title',
          persist: true,
        })
      );

      dataHandler = jest.fn();

      stream.on('data', dataHandler);

      await nextTick();

      await llmSimulator.chunk({ function_call: { name: 'get_top_alerts' } });
      await llmSimulator.next({ content: 'done' });
      await llmSimulator.tokenCount({ completion: 0, prompt: 0, total: 0 });
      await llmSimulator.complete();

      await waitFor(() => functionResponsePromiseResolve !== undefined);

      functionResponsePromiseResolve!({
        content: repeat('word ', 10000),
      });

      await waitFor(() => inferenceClientMock.chatComplete.mock.calls.length > 1);

      await llmSimulator.next({ content: 'Looks like this was truncated' });

      await llmSimulator.complete();

      await finished(stream);
    });

    it('truncates the message', () => {
      const body = inferenceClientMock.chatComplete.mock.lastCall![0];
      const parsed = last(body.messages);

      expect(parsed).toEqual({
        name: 'get_top_alerts',
        role: 'tool',
        response: {
          message: 'Function response exceeded the maximum length allowed and was truncated',
          truncated: expect.any(String),
        },
        toolCallId: expect.any(String),
      });

      expect((parsed as any).response.truncated.includes('word ')).toBe(true);
    });
  });

  it('Adds the default language to the system prompt', async () => {
    client = createClient();
    const chatSpy = jest.spyOn(client, 'chat');

    inferenceClientMock.chatComplete.mockImplementationOnce(() => {
      return new Observable((subscriber) => {
        llmSimulator = createLlmSimulator(subscriber);
      });
    });

    client
      .complete({
        connectorId: 'foo',
        messages: [system('This is a system message'), user('A user message to cause completion')],
        functionClient: functionClientMock,
        signal: new AbortController().signal,
        title: 'My predefined title',
        persist: false,
      })
      .subscribe(() => {}); // To trigger call to chat
    await nextTick();

    expect(chatSpy.mock.calls[0][1].messages[0].message.content).toEqual(
      EXPECTED_STORED_SYSTEM_MESSAGE
    );
  });

  describe('when executing an action', () => {
    let completePromise: Promise<Message[]>;

    beforeEach(async () => {
      client = createClient();

      inferenceClientMock.chatComplete.mockImplementationOnce(() => {
        return new Observable((subscriber) => {
          llmSimulator = createLlmSimulator(subscriber);
        });
      });

      const complete$ = await client.complete({
        connectorId: 'foo',
        messages: [
          system('This is a system message'),
          user('Can you call the my_action function?'),
        ],
        functionClient: new ChatFunctionClient([
          {
            actions: [
              {
                name: 'my_action',
                description: 'My action description',
                parameters: {
                  type: 'object',
                  properties: {
                    foo: {
                      type: 'string',
                    },
                  },
                  required: ['foo'],
                },
              },
            ],
          },
        ]),
        signal: new AbortController().signal,
        title: 'My predefined title',
        persist: false,
      });

      const messages: Message[] = [];

      completePromise = new Promise<Message[]>((resolve, reject) => {
        complete$.subscribe({
          next: (event) => {
            if (event.type === StreamingChatResponseEventType.MessageAdd) {
              messages.push(event.message);
            }
          },
          complete: () => resolve(messages),
        });
      });
    });

    describe('and validation succeeds', () => {
      beforeEach(async () => {
        await llmSimulator.chunk({
          function_call: { name: 'my_action', arguments: JSON.stringify({ foo: 'bar' }) },
        });
        await llmSimulator.next({ content: 'content' });
        await llmSimulator.tokenCount({ completion: 0, prompt: 0, total: 0 });
        await llmSimulator.complete();
      });

      it('completes the observable function request being the last event', async () => {
        const messages = await completePromise;
        expect(messages.length).toBe(1);

        expect(messages[0].message.function_call).toEqual({
          name: 'my_action',
          arguments: JSON.stringify({ foo: 'bar' }),
          trigger: MessageRole.Assistant,
        });
      });
    });

    describe.skip('and validation fails', () => {
      beforeEach(async () => {
        await llmSimulator.chunk({
          function_call: { name: 'my_action', arguments: JSON.stringify({ bar: 'foo' }) },
        });

        await waitFor(() =>
          inferenceClientMock.chatComplete.mock.calls.length === 3
            ? Promise.resolve()
            : llmSimulator.error(new Error('Waiting until execute is called again'))
        );

        await llmSimulator.next({
          content: 'Looks like the function call failed',
        });
        await llmSimulator.tokenCount({ completion: 0, prompt: 0, total: 0 });

        await llmSimulator.complete();
      });

      it('appends a function response error and sends it back to the LLM', async () => {
        const messages = await completePromise;
        expect(messages.length).toBe(2);

        expect(messages[0].message.function_call?.name).toBe('my_action');

        expect(messages[1].message.name).toBe('my_action');

        expect(JSON.parse(messages[1].message.content ?? '{}')).toHaveProperty('error');

        expect(messages[2].message.content).toBe('Looks like the function call failed');
      });
    });
  });
});
