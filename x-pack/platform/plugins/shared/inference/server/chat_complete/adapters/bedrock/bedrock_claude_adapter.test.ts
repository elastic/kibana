/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import { loggerMock } from '@kbn/logging-mocks';
import { lastValueFrom, toArray } from 'rxjs';
import type { InferenceExecutor } from '../../utils/inference_executor';
import { MessageRole, ToolChoiceType } from '@kbn/inference-common';
import { bedrockClaudeAdapter } from './bedrock_claude_adapter';
import { addNoToolUsageDirective } from './prompts';

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
        data: new PassThrough(),
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
      bedrockClaudeAdapter.chatComplete({
        logger,
        executor: executorMock,
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'invokeStream',
        subActionParams: {
          messages: [
            {
              role: 'user',
              rawContent: [{ type: 'text', text: 'question' }],
            },
          ],
          temperature: 0,
          stopSequences: ['\n\nHuman:'],
          tools: [
            {
              description: 'Do not call this tool, it is strictly forbidden',
              input_schema: {
                properties: {},
                type: 'object',
              },
              name: 'do_not_call_this_tool',
            },
          ],
        },
      });
    });

    it('correctly format tools', () => {
      bedrockClaudeAdapter.chatComplete({
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
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { tools } = getCallParams();
      expect(tools).toEqual([
        {
          name: 'myFunction',
          description: 'myFunction',
          input_schema: {
            properties: {},
            type: 'object',
          },
        },
        {
          name: 'myFunctionWithArgs',
          description: 'myFunctionWithArgs',
          input_schema: {
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
      ]);
    });

    it('correctly format messages', () => {
      bedrockClaudeAdapter.chatComplete({
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
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { messages } = getCallParams();
      expect(messages).toEqual([
        {
          rawContent: [
            {
              text: 'question',
              type: 'text',
            },
          ],
          role: 'user',
        },
        {
          rawContent: [
            {
              text: 'answer',
              type: 'text',
            },
          ],
          role: 'assistant',
        },
        {
          rawContent: [
            {
              text: 'another question',
              type: 'text',
            },
          ],
          role: 'user',
        },
        {
          rawContent: [
            {
              id: '0',
              input: {
                foo: 'bar',
              },
              name: 'my_function',
              type: 'tool_use',
            },
          ],
          role: 'assistant',
        },
        {
          rawContent: [
            {
              content: '{"bar":"foo"}',
              tool_use_id: '0',
              type: 'tool_result',
            },
          ],
          role: 'user',
        },
      ]);
    });

    it('correctly format system message', () => {
      bedrockClaudeAdapter.chatComplete({
        executor: executorMock,
        logger,
        system: 'Some system message',
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { system } = getCallParams();
      expect(system).toEqual('Some system message');
    });

    it('correctly formats messages with content parts', () => {
      bedrockClaudeAdapter.chatComplete({
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
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { messages } = getCallParams();
      expect(messages).toEqual([
        {
          rawContent: [
            {
              text: 'question',
              type: 'text',
            },
          ],
          role: 'user',
        },
        {
          rawContent: [
            {
              text: 'answer',
              type: 'text',
            },
          ],
          role: 'assistant',
        },
        {
          rawContent: [
            {
              type: 'image',
              source: {
                data: 'aaaaaa',
                mediaType: 'image/png',
                type: 'base64',
              },
            },
            {
              type: 'image',
              source: {
                data: 'bbbbbb',
                mediaType: 'image/png',
                type: 'base64',
              },
            },
          ],
          role: 'user',
        },
      ]);
    });

    it('correctly format tool choice', () => {
      bedrockClaudeAdapter.chatComplete({
        executor: executorMock,
        logger,
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
        toolChoice: ToolChoiceType.required,
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { toolChoice } = getCallParams();
      expect(toolChoice).toEqual({
        type: 'any',
      });
    });

    it('correctly format tool choice for named function', () => {
      bedrockClaudeAdapter.chatComplete({
        executor: executorMock,
        logger,
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
        toolChoice: { function: 'foobar' },
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { toolChoice } = getCallParams();
      expect(toolChoice).toEqual({
        type: 'tool',
        name: 'foobar',
      });
    });

    it('correctly adapt the request for ToolChoiceType.None', () => {
      bedrockClaudeAdapter.chatComplete({
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
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { toolChoice, tools, system } = getCallParams();
      expect(toolChoice).toBeUndefined();
      expect(tools).toEqual([
        {
          description: 'myFunction',
          input_schema: { properties: {}, type: 'object' },
          name: 'myFunction',
        },
      ]);
      expect(system).toEqual(addNoToolUsageDirective('some system instruction'));
    });

    it('propagates the abort signal when provided', () => {
      const abortController = new AbortController();

      bedrockClaudeAdapter.chatComplete({
        logger,
        executor: executorMock,
        messages: [{ role: MessageRole.User, content: 'question' }],
        abortSignal: abortController.signal,
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'invokeStream',
        subActionParams: expect.objectContaining({
          signal: abortController.signal,
        }),
      });
    });

    it('propagates the temperature parameter', () => {
      bedrockClaudeAdapter.chatComplete({
        logger,
        executor: executorMock,
        messages: [{ role: MessageRole.User, content: 'question' }],
        temperature: 0.9,
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'invokeStream',
        subActionParams: expect.objectContaining({
          temperature: 0.9,
        }),
      });
    });

    it('propagates the modelName parameter', () => {
      bedrockClaudeAdapter.chatComplete({
        logger,
        executor: executorMock,
        messages: [{ role: MessageRole.User, content: 'question' }],
        modelName: 'claude-opus-3.5',
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'invokeStream',
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
