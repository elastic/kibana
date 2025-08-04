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
import { MessageRole, ToolChoiceType } from '@kbn/inference-common';
import { bedrockClaudeAdapter } from './bedrock_claude_adapter';
import { addNoToolUsageDirective } from './prompts';
import { lastValueFrom, toArray } from 'rxjs';
describe('bedrockClaudeAdapter', () => {
  const logger = loggerMock.create();
  const executorMock = {
    invoke: jest.fn(),
  } as InferenceExecutor & { invoke: jest.MockedFn<InferenceExecutor['invoke']> };

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
        subAction: 'converseStream',
        subActionParams: {
          messages: [
            {
              content: [
                {
                  text: 'question',
                  type: 'text',
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
        { role: 'user', content: [{ text: 'question', type: 'text' }] },
        { role: 'assistant', content: [{ type: 'text', text: 'answer' }] },
        { role: 'user', content: [{ text: 'another question', type: 'text' }] },
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
        { role: 'user', content: [{ text: 'question', type: 'text' }] },
        { role: 'assistant', content: [{ type: 'text', text: 'answer' }] },
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
        subAction: 'converseStream',
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
        subAction: 'converseStream',
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
        subAction: 'converseStream',
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
});
