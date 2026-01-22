/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { processVertexStreamMock, processVertexResponseMock } from './gemini_adapter.test.mocks';
import { PassThrough } from 'stream';
import { noop, tap, lastValueFrom, toArray, of } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
import type { InferenceExecutor } from '../../utils/inference_executor';
import { observableIntoEventSourceStream } from '../../../util/observable_into_event_source_stream';
import { MessageRole, ToolChoiceType, InferenceConnectorType } from '@kbn/inference-common';
import { geminiAdapter } from './gemini_adapter';

describe('geminiAdapter', () => {
  const logger = loggerMock.create();
  const executorMock = {
    invoke: jest.fn(),
    getConnector: jest.fn(),
  } as InferenceExecutor & {
    invoke: jest.MockedFn<InferenceExecutor['invoke']>;
    getConnector: jest.MockedFn<InferenceExecutor['getConnector']>;
  };

  beforeEach(() => {
    executorMock.invoke.mockReset();
    executorMock.getConnector.mockReset();
    executorMock.getConnector.mockReturnValue({
      type: InferenceConnectorType.Gemini,
      name: 'gemini-connector',
      connectorId: 'test-connector-id',
      config: {},
      capabilities: {},
    });
    processVertexStreamMock.mockReset().mockImplementation(() => tap(noop));
    processVertexResponseMock.mockReset().mockImplementation(() => tap(noop));
  });

  function getCallParams() {
    const params = executorMock.invoke.mock.calls[0][0].subActionParams as Record<string, any>;
    return {
      messages: params.messages,
      tools: params.tools,
      toolConfig: params.toolConfig,
      systemInstruction: params.systemInstruction,
      temperature: params.temperature,
    };
  }

  describe('#chatComplete()', () => {
    beforeEach(() => {
      executorMock.invoke.mockImplementation(async () => {
        return {
          actionId: '',
          status: 'ok',
          data: new PassThrough(),
        };
      });
    });

    it('calls `executor.invoke` with the right fixed parameters', () => {
      geminiAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [
            {
              role: MessageRole.User,
              content: 'question',
            },
          ],
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'invokeAIRaw',
        subActionParams: {
          messages: [
            {
              parts: [{ text: 'question' }],
              role: 'user',
            },
          ],
          tools: [],
          temperature: 0,
          stopSequences: ['\n\nHuman:'],
        },
      });
    });

    it('correctly format tools', () => {
      geminiAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [
            {
              role: MessageRole.User,
              content: 'question',
            },
          ],
          tools: {
            myFunction: {
              description: 'myFunction',
            },
            myFunctionWithArgs: {
              description: 'myFunctionWithArgs',
              schema: {
                type: 'object',
                properties: {
                  foo: {
                    type: 'string',
                    description: 'foo',
                  },
                },
                required: ['foo'],
              },
            },
          },
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { tools } = getCallParams();
      expect(tools).toEqual([
        {
          functionDeclarations: [
            {
              description: 'myFunction',
              name: 'myFunction',
              parameters: {
                properties: {},
                type: 'object',
              },
            },
            {
              description: 'myFunctionWithArgs',
              name: 'myFunctionWithArgs',
              parameters: {
                properties: {
                  foo: {
                    description: 'foo',
                    enum: [],
                    format: 'enum',
                    type: 'string',
                  },
                },
                required: ['foo'],
                type: 'object',
              },
            },
          ],
        },
      ]);
    });

    it('correctly format messages', () => {
      geminiAdapter
        .chatComplete({
          logger,
          executor: executorMock,
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
            {
              role: MessageRole.Assistant,
              content: null,
              toolCalls: [
                {
                  function: {
                    name: 'my_function',
                    arguments: {
                      foo: 'bar',
                    },
                  },
                  toolCallId: '0',
                },
              ],
            },
            {
              name: 'my_function',
              role: MessageRole.Tool,
              toolCallId: '0',
              response: {
                bar: 'foo',
              },
            },
          ],
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { messages } = getCallParams();
      expect(messages).toEqual([
        {
          parts: [
            {
              text: 'question',
            },
          ],
          role: 'user',
        },
        {
          parts: [
            {
              text: 'answer',
            },
          ],
          role: 'assistant',
        },
        {
          parts: [
            {
              text: 'another question',
            },
          ],
          role: 'user',
        },
        {
          parts: [
            {
              functionCall: {
                args: {
                  foo: 'bar',
                },
                name: 'my_function',
              },
            },
          ],
          role: 'assistant',
        },
        {
          parts: [
            {
              functionResponse: {
                name: '0',
                response: {
                  bar: 'foo',
                },
              },
            },
          ],
          role: 'user',
        },
      ]);
    });

    it('encapsulates string tool messages', () => {
      geminiAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [
            {
              role: MessageRole.User,
              content: 'question',
            },
            {
              role: MessageRole.Assistant,
              content: null,
              toolCalls: [
                {
                  function: {
                    name: 'my_function',
                    arguments: {
                      foo: 'bar',
                    },
                  },
                  toolCallId: '0',
                },
              ],
            },
            {
              name: 'my_function',
              role: MessageRole.Tool,
              toolCallId: '0',
              response: JSON.stringify({ bar: 'foo' }),
            },
          ],
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { messages } = getCallParams();
      expect(messages[messages.length - 1]).toEqual({
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: '0',
              response: {
                response: JSON.stringify({ bar: 'foo' }),
              },
            },
          },
        ],
      });
    });

    it('correctly formats content parts', () => {
      geminiAdapter
        .chatComplete({
          executor: executorMock,
          logger,
          messages: [
            {
              role: MessageRole.User,
              content: [
                {
                  type: 'text',
                  text: 'question',
                },
              ],
            },
            {
              role: MessageRole.Assistant,
              content: 'answer',
            },
            {
              role: MessageRole.User,
              content: [
                {
                  type: 'image',
                  source: {
                    data: 'aaaaaa',
                    mimeType: 'image/png',
                  },
                },
                {
                  type: 'image',
                  source: {
                    data: 'bbbbbb',
                    mimeType: 'image/png',
                  },
                },
              ],
            },
          ],
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { messages } = getCallParams();
      expect(messages).toEqual([
        {
          parts: [
            {
              text: 'question',
            },
          ],
          role: 'user',
        },
        {
          parts: [
            {
              text: 'answer',
            },
          ],
          role: 'assistant',
        },
        {
          parts: [
            {
              inlineData: {
                data: 'aaaaaa',
                mimeType: 'image/png',
              },
            },
            {
              inlineData: {
                data: 'bbbbbb',
                mimeType: 'image/png',
              },
            },
          ],
          role: 'user',
        },
      ]);
    });

    it('groups messages from the same user', () => {
      geminiAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [
            {
              role: MessageRole.User,
              content: 'question',
            },
            {
              role: MessageRole.User,
              content: 'another question',
            },
            {
              role: MessageRole.Assistant,
              content: 'answer',
            },
            {
              role: MessageRole.Assistant,
              content: null,
              toolCalls: [
                {
                  function: {
                    name: 'my_function',
                    arguments: {
                      foo: 'bar',
                    },
                  },
                  toolCallId: '0',
                },
              ],
            },
          ],
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { messages } = getCallParams();
      expect(messages).toEqual([
        {
          parts: [
            {
              text: 'question',
            },
            {
              text: 'another question',
            },
          ],
          role: 'user',
        },
        {
          parts: [
            {
              text: 'answer',
            },
            {
              functionCall: {
                args: {
                  foo: 'bar',
                },
                name: 'my_function',
              },
            },
          ],
          role: 'assistant',
        },
      ]);
    });

    it('correctly format system message', () => {
      geminiAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          system: 'Some system message',
          messages: [
            {
              role: MessageRole.User,
              content: 'question',
            },
          ],
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { systemInstruction } = getCallParams();
      expect(systemInstruction).toEqual('Some system message');
    });

    it('correctly format tool choice', () => {
      geminiAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [
            {
              role: MessageRole.User,
              content: 'question',
            },
          ],
          toolChoice: ToolChoiceType.required,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { toolConfig } = getCallParams();
      expect(toolConfig).toEqual({ mode: 'ANY' });
    });

    it('correctly format tool choice for named function', () => {
      geminiAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [
            {
              role: MessageRole.User,
              content: 'question',
            },
          ],
          toolChoice: { function: 'foobar' },
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { toolConfig } = getCallParams();
      expect(toolConfig).toEqual({ mode: 'ANY', allowedFunctionNames: ['foobar'] });
    });

    it('propagates the abort signal when provided', () => {
      const abortController = new AbortController();

      geminiAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          abortSignal: abortController.signal,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'invokeAIRaw',
        subActionParams: expect.objectContaining({
          signal: abortController.signal,
        }),
      });
    });

    it('propagates the temperature parameter', () => {
      geminiAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          temperature: 0.6,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'invokeAIRaw',
        subActionParams: expect.objectContaining({
          temperature: 0.6,
        }),
      });
    });

    it('propagates the modelName parameter', () => {
      geminiAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          modelName: 'gemini-1.5',
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'invokeAIRaw',
        subActionParams: expect.objectContaining({
          model: 'gemini-1.5',
        }),
      });
    });

    describe('non-streaming mode', () => {
      it('process response events via processVertexResponse', async () => {
        const response = { dummy: 'response' };

        const tapFn = jest.fn();
        processVertexResponseMock.mockImplementation(() => tap(tapFn));

        executorMock.invoke.mockImplementation(async () => {
          return {
            actionId: '',
            status: 'ok',
            data: response,
          };
        });

        const response$ = geminiAdapter.chatComplete({
          stream: false,
          logger,
          executor: executorMock,
          messages: [
            {
              role: MessageRole.User,
              content: 'question',
            },
          ],
        });

        const events = await lastValueFrom(response$.pipe(toArray()));

        expect(tapFn).toHaveBeenCalledTimes(1);
        expect(tapFn).toHaveBeenCalledWith(response);

        expect(events).toEqual([response]);
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
            geminiAdapter
              .chatComplete({
                stream: false,
                logger,
                executor: executorMock,
                messages: [{ role: MessageRole.User, content: 'Hello' }],
              })
              .pipe(toArray())
          )
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Error calling connector: something went wrong"`
        );
      });
    });

    describe('streaming mode', () => {
      it('process response events via processVertexStream', async () => {
        const source$ = of({ chunk: 1 }, { chunk: 2 });

        const tapFn = jest.fn();
        processVertexStreamMock.mockImplementation(() => tap(tapFn));

        executorMock.invoke.mockImplementation(async () => {
          return {
            actionId: '',
            status: 'ok',
            data: observableIntoEventSourceStream(source$, logger),
          };
        });

        const response$ = geminiAdapter.chatComplete({
          stream: true,
          logger,
          executor: executorMock,
          messages: [
            {
              role: MessageRole.User,
              content: 'question',
            },
          ],
        });

        const allChunks = await lastValueFrom(response$.pipe(toArray()));

        expect(allChunks).toEqual([{ chunk: 1 }, { chunk: 2 }]);

        expect(tapFn).toHaveBeenCalledTimes(2);
        expect(tapFn).toHaveBeenCalledWith({ chunk: 1 });
        expect(tapFn).toHaveBeenCalledWith({ chunk: 2 });
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
            geminiAdapter
              .chatComplete({
                stream: true,
                logger,
                executor: executorMock,
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
});
