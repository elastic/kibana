/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import { loggerMock } from '@kbn/logging-mocks';
import { noop } from 'rxjs';
import type { InferenceExecutor } from '../../utils/inference_executor';
import { MessageRole, ToolChoiceType, InferenceConnectorType } from '@kbn/inference-common';
import { bedrockClaudeAdapter } from './bedrock_claude_adapter';
import { addNoToolUsageDirective } from './prompts';
import { lastValueFrom, toArray } from 'rxjs';
describe('bedrockClaudeAdapter', () => {
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
    executorMock.invoke.mockImplementation(async () => {
      return {
        actionId: '',
        status: 'ok',
        data: {
          stream: new PassThrough(),
          tokenStream: new PassThrough(),
        },
      };
    });
    executorMock.getConnector.mockReset();
    executorMock.getConnector.mockReturnValue({
      type: InferenceConnectorType.Bedrock,
      name: 'bedrock-connector',
      connectorId: 'test-connector-id',
      config: {},
      capabilities: {},
    });
  });

  function getCallParams() {
    const params = executorMock.invoke.mock.calls[0][0].subActionParams as Record<string, any>;
    return {
      system: params.system,
      messages: params.messages,
      tools: params.tools,
      toolChoice: params.toolChoice,
    };
  }

  describe('#chatComplete()', () => {
    it('calls `executor.invoke` with the right fixed parameters', () => {
      bedrockClaudeAdapter
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
        subAction: 'converse',
        subActionParams: {
          messages: [
            {
              content: [
                {
                  text: 'question',
                },
              ],
              role: 'user',
            },
          ],
          model: undefined,
          signal: undefined,
          stopSequences: [
            `

Human:`,
          ],
          system: [
            {
              text: 'You are a helpful assistant for Elastic.',
            },
          ],
          temperature: 0,
          toolChoice: undefined,
          tools: [
            {
              toolSpec: {
                name: 'do_not_call_this_tool',
                description: 'Do not call this tool, it is strictly forbidden',
                inputSchema: {
                  json: {
                    properties: {},
                    type: 'object',
                  },
                },
              },
            },
          ],
        },
      });
    });

    it('correctly format tools', () => {
      bedrockClaudeAdapter
        .chatComplete({
          executor: executorMock,
          logger,
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
          toolSpec: {
            name: 'myFunction',
            description: 'myFunction',
            inputSchema: {
              json: {
                properties: {},
                type: 'object',
              },
            },
          },
        },
        {
          toolSpec: {
            name: 'myFunctionWithArgs',
            description: 'myFunctionWithArgs',
            inputSchema: {
              json: {
                properties: {
                  foo: {
                    description: 'foo',
                    type: 'string',
                  },
                },
                required: ['foo'],
                type: 'object',
              },
            },
          },
        },
      ]);
    });

    it('correctly format messages', () => {
      bedrockClaudeAdapter
        .chatComplete({
          executor: executorMock,
          logger,
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
        { role: 'user', content: [{ text: 'question' }] },
        { role: 'assistant', content: [{ text: 'answer' }] },
        { role: 'user', content: [{ text: 'another question' }] },
        {
          role: 'assistant',
          content: [{ toolUse: { toolUseId: '0', name: 'my_function', input: { foo: 'bar' } } }],
        },
        {
          role: 'user',
          content: [{ toolResult: { toolUseId: '0', content: [{ json: { bar: 'foo' } }] } }],
        },
      ]);
    });

    it('drops empty assistant messages without tool calls', () => {
      bedrockClaudeAdapter
        .chatComplete({
          executor: executorMock,
          logger,
          messages: [
            { role: MessageRole.User, content: 'question' },
            { role: MessageRole.Assistant, content: '' },
            { role: MessageRole.User, content: 'another question' },
          ],
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      const { messages } = getCallParams();
      expect(messages).toEqual([
        { role: 'user', content: [{ text: 'question' }] },
        { role: 'user', content: [{ text: 'another question' }] },
      ]);
    });

    it('correctly format consecutive tool result messages', () => {
      bedrockClaudeAdapter
        .chatComplete({
          executor: executorMock,
          logger,
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
                {
                  function: {
                    name: 'my_other_function',
                    arguments: {
                      baz: 'qux',
                    },
                  },
                  toolCallId: '1',
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
            {
              name: 'my_other_function',
              role: MessageRole.Tool,
              toolCallId: '1',
              response: {
                qux: 'baz',
              },
            },
            {
              role: MessageRole.Assistant,
              content: null,
              toolCalls: [
                {
                  function: {
                    name: 'my_function_2',
                    arguments: {
                      foo: 'bar',
                    },
                  },
                  toolCallId: '2',
                },
                {
                  function: {
                    name: 'my_other_function_2',
                    arguments: {
                      baz: 'qux',
                    },
                  },
                  toolCallId: '3',
                },
              ],
            },
            {
              name: 'my_function_2',
              role: MessageRole.Tool,
              toolCallId: '2',
              response: {
                bar: 'foo',
              },
            },
            {
              name: 'my_other_function_2',
              role: MessageRole.Tool,
              toolCallId: '3',
              response: {
                qux: 'baz',
              },
            },
          ],
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { messages } = getCallParams();
      expect(messages).toEqual([
        { role: 'user', content: [{ text: 'question' }] },
        { role: 'assistant', content: [{ text: 'answer' }] },
        { role: 'user', content: [{ text: 'another question' }] },
        {
          role: 'assistant',
          content: [
            { toolUse: { toolUseId: '0', name: 'my_function', input: { foo: 'bar' } } },
            { toolUse: { toolUseId: '1', name: 'my_other_function', input: { baz: 'qux' } } },
          ],
        },
        {
          role: 'user',
          content: [
            { toolResult: { toolUseId: '0', content: [{ json: { bar: 'foo' } }] } },
            { toolResult: { toolUseId: '1', content: [{ json: { qux: 'baz' } }] } },
          ],
        },
        {
          role: 'assistant',
          content: [
            { toolUse: { toolUseId: '2', name: 'my_function_2', input: { foo: 'bar' } } },
            { toolUse: { toolUseId: '3', name: 'my_other_function_2', input: { baz: 'qux' } } },
          ],
        },
        {
          role: 'user',
          content: [
            { toolResult: { toolUseId: '2', content: [{ json: { bar: 'foo' } }] } },
            { toolResult: { toolUseId: '3', content: [{ json: { qux: 'baz' } }] } },
          ],
        },
      ]);
    });

    it('correctly format system message', () => {
      bedrockClaudeAdapter
        .chatComplete({
          executor: executorMock,
          logger,
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

      const { system } = getCallParams();
      expect(system).toEqual([{ text: 'Some system message' }]);
    });

    it('correctly formats messages with content parts', () => {
      bedrockClaudeAdapter
        .chatComplete({
          executor: executorMock,
          logger,
          messages: [
            {
              role: MessageRole.User,
              content: [
                {
                  text: 'question',
                  type: 'text',
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
        { role: 'user', content: [{ text: 'question' }] },
        { role: 'assistant', content: [{ text: 'answer' }] },
        {
          role: 'user',
          content: [
            {
              image: {
                format: 'png',
                source: { bytes: new Uint8Array(Buffer.from('aaaaaa', 'utf-8')) },
              },
            },
            {
              image: {
                format: 'png',
                source: { bytes: new Uint8Array(Buffer.from('bbbbbb', 'utf-8')) },
              },
            },
          ],
        },
      ]);
    });

    it('correctly format tool choice', () => {
      bedrockClaudeAdapter
        .chatComplete({
          executor: executorMock,
          logger,
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

      const { toolChoice } = getCallParams();
      expect(toolChoice).toEqual({ any: {} });
    });

    it('correctly format tool choice for named function', () => {
      bedrockClaudeAdapter
        .chatComplete({
          executor: executorMock,
          logger,
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

      const { toolChoice } = getCallParams();
      expect(toolChoice).toEqual({ tool: { name: 'foobar' } });
    });

    it('correctly adapt the request for ToolChoiceType.None', () => {
      bedrockClaudeAdapter
        .chatComplete({
          executor: executorMock,
          logger,
          system: 'some system instruction',
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
          },
          toolChoice: ToolChoiceType.none,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { toolChoice, tools, system } = getCallParams();
      expect(toolChoice).toBeUndefined();
      expect(tools).toEqual(undefined); // Claude requires tools to be undefined when no tools are available

      expect(system).toEqual([{ text: addNoToolUsageDirective('some system instruction') }]);
    });

    it('keeps tools when ToolChoiceType.None and tool messages exist', () => {
      bedrockClaudeAdapter
        .chatComplete({
          executor: executorMock,
          logger,
          system: 'some system instruction',
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
                    name: 'myFunction',
                    arguments: { foo: 'bar' },
                  },
                  toolCallId: '0',
                },
              ],
            },
            {
              role: MessageRole.Tool,
              name: 'myFunction',
              toolCallId: '0',
              response: { ok: true },
            },
          ],
          tools: {
            myFunction: {
              description: 'myFunction',
              schema: {
                type: 'object',
                properties: {},
              },
            },
          },
          toolChoice: ToolChoiceType.none,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { toolChoice, tools } = getCallParams();
      expect(toolChoice).toEqual({ auto: {} });
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('propagates the abort signal when provided', () => {
      const abortController = new AbortController();

      bedrockClaudeAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          abortSignal: abortController.signal,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'converse',
        subActionParams: expect.objectContaining({
          signal: abortController.signal,
        }),
      });
    });

    it('propagates the temperature parameter', () => {
      bedrockClaudeAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          temperature: 0.9,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'converse',
        subActionParams: expect.objectContaining({
          temperature: 0.9,
        }),
      });
    });

    it('propagates the modelName parameter', () => {
      bedrockClaudeAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          modelName: 'claude-opus-3.5',
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'converse',
        subActionParams: expect.objectContaining({
          model: 'claude-opus-3.5',
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
          bedrockClaudeAdapter
            .chatComplete({
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
    it('calls the right sub action', () => {
      bedrockClaudeAdapter
        .chatComplete({
          stream: true,
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith(
        expect.objectContaining({ subAction: 'converseStream' })
      );
    });
  });

  describe('non-streaming mode', () => {
    it('calls the right sub action', () => {
      bedrockClaudeAdapter
        .chatComplete({
          stream: false,
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith(
        expect.objectContaining({ subAction: 'converse' })
      );
    });
  });
});
