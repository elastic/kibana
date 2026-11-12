/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, of, toArray } from 'rxjs';
import type {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
} from '@kbn/inference-common';
import { ToolChoiceType, ChatCompletionEventType } from '@kbn/inference-common';
import { chunksIntoMessage } from './chunks_into_message';
import type { Logger } from '@kbn/logging';

describe('chunksIntoMessage', () => {
  function fromEvents(...events: Array<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>) {
    return of(...events);
  }

  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  it('concatenates content chunks into a single message', async () => {
    const message = await lastValueFrom(
      chunksIntoMessage({ logger, toolOptions: {} })(
        fromEvents(
          {
            content: 'Hey',
            type: ChatCompletionEventType.ChatCompletionChunk,
            tool_calls: [],
          },
          {
            content: ' how is it',
            type: ChatCompletionEventType.ChatCompletionChunk,
            tool_calls: [],
          },
          {
            content: ' going',
            type: ChatCompletionEventType.ChatCompletionChunk,
            tool_calls: [],
          }
        )
      )
    );

    expect(message).toEqual({
      content: 'Hey how is it going',
      toolCalls: [],
      type: ChatCompletionEventType.ChatCompletionMessage,
    });
  });

  it('parses tool calls', async () => {
    const message = await lastValueFrom(
      chunksIntoMessage({
        toolOptions: {
          toolChoice: ToolChoiceType.auto,
          tools: {
            myFunction: {
              description: 'myFunction',
              schema: {
                type: 'object',
                properties: {
                  foo: {
                    type: 'string',
                    const: 'bar',
                  },
                },
              },
            },
          },
        },
        logger,
      })(
        fromEvents(
          {
            content: '',
            type: ChatCompletionEventType.ChatCompletionChunk,
            tool_calls: [
              {
                function: {
                  name: 'myFunction',
                  arguments: '',
                },
                index: 0,
                toolCallId: '001',
              },
            ],
          },
          {
            content: '',
            type: ChatCompletionEventType.ChatCompletionChunk,
            tool_calls: [
              {
                function: {
                  name: '',
                  arguments: '{',
                },
                index: 0,
                toolCallId: '',
              },
            ],
          },
          {
            content: '',
            type: ChatCompletionEventType.ChatCompletionChunk,
            tool_calls: [
              {
                function: {
                  name: '',
                  arguments: '"foo": "bar" }',
                },
                index: 0,
                toolCallId: '',
              },
            ],
          }
        )
      )
    );

    expect(message).toEqual({
      content: '',
      toolCalls: [
        {
          function: {
            name: 'myFunction',
            arguments: {
              foo: 'bar',
            },
          },
          toolCallId: '001',
        },
      ],
      type: ChatCompletionEventType.ChatCompletionMessage,
    });
  });

  it('parses tool calls even when the index does not start at 0', async () => {
    const message = await lastValueFrom(
      chunksIntoMessage({
        toolOptions: {
          toolChoice: ToolChoiceType.auto,
          tools: {
            myFunction: {
              description: 'myFunction',
              schema: {
                type: 'object',
                properties: {
                  foo: {
                    type: 'string',
                    const: 'bar',
                  },
                },
              },
            },
          },
        },
        logger,
      })(
        fromEvents(
          {
            content: '',
            type: ChatCompletionEventType.ChatCompletionChunk,
            tool_calls: [
              {
                function: {
                  name: 'myFunction',
                  arguments: '',
                },
                index: 1,
                toolCallId: '001',
              },
            ],
          },
          {
            content: '',
            type: ChatCompletionEventType.ChatCompletionChunk,
            tool_calls: [
              {
                function: {
                  name: '',
                  arguments: '{',
                },
                index: 1,
                toolCallId: '',
              },
            ],
          },
          {
            content: '',
            type: ChatCompletionEventType.ChatCompletionChunk,
            tool_calls: [
              {
                function: {
                  name: '',
                  arguments: '"foo": "bar" }',
                },
                index: 1,
                toolCallId: '',
              },
            ],
          }
        )
      )
    );

    expect(message).toEqual({
      content: '',
      toolCalls: [
        {
          function: {
            name: 'myFunction',
            arguments: {
              foo: 'bar',
            },
          },
          toolCallId: '001',
        },
      ],
      type: ChatCompletionEventType.ChatCompletionMessage,
    });
  });

  it('validates tool calls', async () => {
    async function getMessage() {
      return await lastValueFrom(
        chunksIntoMessage({
          toolOptions: {
            toolChoice: ToolChoiceType.auto,
            tools: {
              myFunction: {
                description: 'myFunction',
                schema: {
                  type: 'object',
                  properties: {
                    foo: {
                      type: 'string',
                      const: 'bar',
                    },
                  },
                },
              },
            },
          },
          logger,
        })(
          fromEvents({
            content: '',
            type: ChatCompletionEventType.ChatCompletionChunk,
            tool_calls: [
              {
                function: {
                  name: 'myFunction',
                  arguments: '{ "foo": "baz" }',
                },
                index: 0,
                toolCallId: '001',
              },
            ],
          })
        )
      );
    }

    await expect(async () => getMessage()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Tool call arguments for myFunction (001) were invalid"`
    );
  });

  it('concatenates multiple tool calls into a single message', async () => {
    const message = await lastValueFrom(
      chunksIntoMessage({
        toolOptions: {
          toolChoice: ToolChoiceType.auto,
          tools: {
            myFunction: {
              description: 'myFunction',
              schema: {
                type: 'object',
                properties: {
                  foo: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        logger,
      })(
        fromEvents(
          {
            content: '',
            type: ChatCompletionEventType.ChatCompletionChunk,
            tool_calls: [
              {
                function: {
                  name: 'myFunction',
                  arguments: '',
                },
                index: 0,
                toolCallId: '001',
              },
            ],
          },
          {
            content: '',
            type: ChatCompletionEventType.ChatCompletionChunk,
            tool_calls: [
              {
                function: {
                  name: '',
                  arguments: '{"foo": "bar"}',
                },
                index: 0,
                toolCallId: '',
              },
            ],
          },
          {
            content: '',
            type: ChatCompletionEventType.ChatCompletionChunk,
            tool_calls: [
              {
                function: {
                  name: 'myFunction',
                  arguments: '{ "foo": "baz" }',
                },
                index: 1,
                toolCallId: '002',
              },
            ],
          }
        )
      )
    );

    expect(message).toEqual({
      content: '',
      toolCalls: [
        {
          function: {
            name: 'myFunction',
            arguments: {
              foo: 'bar',
            },
          },
          toolCallId: '001',
        },
        {
          function: {
            name: 'myFunction',
            arguments: {
              foo: 'baz',
            },
          },
          toolCallId: '002',
        },
      ],
      type: ChatCompletionEventType.ChatCompletionMessage,
    });
  });

  it('emits unique tool call indexes on chunks when the provider reuses the same index', async () => {
    const toolCallChunk = (
      toolCallId: string,
      name: string,
      args: string
    ): ChatCompletionChunkEvent => ({
      content: '',
      type: ChatCompletionEventType.ChatCompletionChunk,
      tool_calls: [{ index: 0, toolCallId, function: { name, arguments: args } }],
    });

    const events = await lastValueFrom(
      chunksIntoMessage({
        logger,
        toolOptions: {
          toolChoice: ToolChoiceType.auto,
          tools: {
            myFunction: {
              description: 'myFunction',
              schema: { type: 'object', properties: { foo: { type: 'string' } } },
            },
          },
        },
      })(
        fromEvents(
          toolCallChunk('001', 'myFunction', ''),
          toolCallChunk('', '', '{"foo":"bar"}'),
          toolCallChunk('002', 'myFunction', ''),
          toolCallChunk('', '', '{"foo":"baz"}')
        )
      ).pipe(toArray())
    );

    const chunkIndexes = events.flatMap((event) =>
      event.type === ChatCompletionEventType.ChatCompletionChunk
        ? event.tool_calls.map((toolCall) => toolCall.index)
        : []
    );
    expect(chunkIndexes).toEqual([0, 0, 1, 1]);

    expect(events[events.length - 1]).toEqual({
      content: '',
      toolCalls: [
        { function: { name: 'myFunction', arguments: { foo: 'bar' } }, toolCallId: '001' },
        { function: { name: 'myFunction', arguments: { foo: 'baz' } }, toolCallId: '002' },
      ],
      type: ChatCompletionEventType.ChatCompletionMessage,
    });
  });

  it('gives a tool call the provider sent without an id the same id on its chunk and on the message', async () => {
    const events = await lastValueFrom(
      chunksIntoMessage({
        logger,
        toolOptions: {
          toolChoice: ToolChoiceType.auto,
          tools: {
            myFunction: {
              description: 'myFunction',
              schema: { type: 'object', properties: { foo: { type: 'string' } } },
            },
          },
        },
      })(
        fromEvents({
          content: '',
          type: ChatCompletionEventType.ChatCompletionChunk,
          tool_calls: [
            {
              index: 0,
              toolCallId: '',
              function: { name: 'myFunction', arguments: '{"foo":"bar"}' },
            },
          ],
        })
      ).pipe(toArray())
    );

    const chunkToolCallIds = events.flatMap((event) =>
      event.type === ChatCompletionEventType.ChatCompletionChunk
        ? event.tool_calls.map((toolCall) => toolCall.toolCallId)
        : []
    );
    const message = events[events.length - 1];

    expect(chunkToolCallIds).toHaveLength(1);
    expect(chunkToolCallIds[0]).not.toBe('');
    expect(message).toEqual({
      content: '',
      toolCalls: [
        {
          function: { name: 'myFunction', arguments: { foo: 'bar' } },
          toolCallId: chunkToolCallIds[0],
        },
      ],
      type: ChatCompletionEventType.ChatCompletionMessage,
    });
  });

  it('generates different tool call ids for two consecutive completions that carry no ids', async () => {
    const toolOptions = {
      toolChoice: ToolChoiceType.auto,
      tools: {
        myFunction: {
          description: 'myFunction',
          schema: { type: 'object' as const, properties: { foo: { type: 'string' as const } } },
        },
      },
    };
    const idLessCompletion = () =>
      lastValueFrom(
        chunksIntoMessage({ logger, toolOptions })(
          fromEvents({
            content: '',
            type: ChatCompletionEventType.ChatCompletionChunk,
            tool_calls: [
              {
                index: 0,
                toolCallId: '',
                function: { name: 'myFunction', arguments: '{"foo":"bar"}' },
              },
            ],
          })
        )
      );

    const [first, second] = [await idLessCompletion(), await idLessCompletion()];

    if (
      first.type !== ChatCompletionEventType.ChatCompletionMessage ||
      second.type !== ChatCompletionEventType.ChatCompletionMessage
    ) {
      throw new Error('expected a message event');
    }
    expect(first.toolCalls[0].toolCallId).not.toBe('');
    expect(second.toolCalls[0].toolCallId).not.toBe('');
    expect(first.toolCalls[0].toolCallId).not.toBe(second.toolCalls[0].toolCallId);
  });
});
