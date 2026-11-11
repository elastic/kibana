/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { delay, lastValueFrom, of, toArray } from 'rxjs';
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

  it('forwards the same tool call ids it puts in the message, and drops empty deltas', async () => {
    const events = await lastValueFrom(
      chunksIntoMessage({
        toolOptions: {
          toolChoice: ToolChoiceType.auto,
          tools: {
            myFunction: {
              description: 'myFunction',
              schema: { type: 'object', properties: {} },
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
              { function: { name: 'myFunction', arguments: '{ ' }, index: 0, toolCallId: '' },
            ],
          },
          {
            content: '',
            type: ChatCompletionEventType.ChatCompletionChunk,
            tool_calls: [{ function: { name: '', arguments: '' }, index: 3, toolCallId: '' }],
          },
          {
            content: '',
            type: ChatCompletionEventType.ChatCompletionChunk,
            tool_calls: [{ function: { name: '', arguments: '}' }, index: 0, toolCallId: '' }],
          }
          // like a real stream, emits after both consumers of the shared stream have subscribed
        ).pipe(delay(0))
      ).pipe(toArray())
    );

    const forwardedChunks = events.filter(
      (event): event is ChatCompletionChunkEvent =>
        event.type === ChatCompletionEventType.ChatCompletionChunk
    );
    const message = events.find(
      (event) => event.type === ChatCompletionEventType.ChatCompletionMessage
    );

    const forwardedToolCalls = forwardedChunks.flatMap((chunk) => chunk.tool_calls);
    expect(forwardedToolCalls.map((toolCall) => toolCall.index)).toEqual([0, 0]);
    const [{ toolCallId }] = forwardedToolCalls;
    expect(toolCallId).not.toBe('');
    expect(message).toEqual({
      type: ChatCompletionEventType.ChatCompletionMessage,
      content: '',
      toolCalls: [{ function: { name: 'myFunction', arguments: {} }, toolCallId }],
    });
  });

  it('forwards the id it puts in the message for an id-less call when the source is synchronous', async () => {
    const events = await lastValueFrom(
      chunksIntoMessage({
        toolOptions: {
          toolChoice: ToolChoiceType.auto,
          tools: {
            myFunction: {
              description: 'myFunction',
              schema: { type: 'object', properties: {} },
            },
          },
        },
        logger,
        // no delay: a synchronous source completes before the second consumer subscribes
      })(
        fromEvents({
          content: '',
          type: ChatCompletionEventType.ChatCompletionChunk,
          tool_calls: [
            { function: { name: 'myFunction', arguments: '{}' }, index: 0, toolCallId: '' },
          ],
        })
      ).pipe(toArray())
    );

    const forwardedToolCalls = events.flatMap((event) =>
      event.type === ChatCompletionEventType.ChatCompletionChunk ? event.tool_calls : []
    );
    const message = events.find(
      (event) => event.type === ChatCompletionEventType.ChatCompletionMessage
    );

    expect(forwardedToolCalls).toHaveLength(1);
    const [{ toolCallId }] = forwardedToolCalls;
    expect(toolCallId).not.toBe('');
    expect(message).toEqual({
      type: ChatCompletionEventType.ChatCompletionMessage,
      content: '',
      toolCalls: [{ function: { name: 'myFunction', arguments: {} }, toolCallId }],
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

  it('gives an id-less tool call an id on its chunks and in the message, next to a call that has one', async () => {
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
          {
            content: '',
            type: ChatCompletionEventType.ChatCompletionChunk,
            tool_calls: [
              {
                index: 0,
                toolCallId: '',
                function: { name: 'myFunction', arguments: '{"foo":"bar"}' },
              },
            ],
          },
          {
            content: '',
            type: ChatCompletionEventType.ChatCompletionChunk,
            tool_calls: [
              {
                index: 1,
                toolCallId: '002',
                function: { name: 'myFunction', arguments: '{"foo":"baz"}' },
              },
            ],
          }
        ).pipe(delay(0))
      ).pipe(toArray())
    );

    const chunkToolCalls = events.flatMap((event) =>
      event.type === ChatCompletionEventType.ChatCompletionChunk ? event.tool_calls : []
    );
    const [generated, provided] = chunkToolCalls;
    expect(chunkToolCalls.map(({ index }) => index)).toEqual([0, 1]);
    expect(generated.toolCallId).not.toBe('');
    expect(provided.toolCallId).toBe('002');

    expect(events[events.length - 1]).toEqual({
      content: '',
      toolCalls: [
        {
          function: { name: 'myFunction', arguments: { foo: 'bar' } },
          toolCallId: generated.toolCallId,
        },
        { function: { name: 'myFunction', arguments: { foo: 'baz' } }, toolCallId: '002' },
      ],
      type: ChatCompletionEventType.ChatCompletionMessage,
    });
  });
});
