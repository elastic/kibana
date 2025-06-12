/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatCompletionEventType } from '@kbn/inference-common';
import { mergeChunks } from './merge_chunks';

describe('mergeChunks', () => {
  it('concatenates content chunks into a single message', async () => {
    const message = mergeChunks([
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
      },
    ]);

    expect(message).toEqual({
      content: 'Hey how is it going',
      tool_calls: [],
    });
  });

  it('concatenates tool calls', async () => {
    const message = mergeChunks([
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
            toolCallId: '0',
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
              arguments: '{ ',
            },
            index: 0,
            toolCallId: '0',
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
            toolCallId: '1',
          },
        ],
      },
    ]);

    expect(message).toEqual({
      content: '',
      tool_calls: [
        {
          function: {
            name: 'myFunction',
            arguments: '{ "foo": "bar" }',
          },
          toolCallId: '001',
        },
      ],
    });
  });

  it('concatenates tool calls even when the index does not start at 0', async () => {
    const message = mergeChunks([
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
            toolCallId: '0',
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
              arguments: '{ ',
            },
            index: 1,
            toolCallId: '0',
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
            toolCallId: '1',
          },
        ],
      },
    ]);

    expect(message).toEqual({
      content: '',
      tool_calls: [
        {
          function: {
            name: 'myFunction',
            arguments: '{ "foo": "bar" }',
          },
          toolCallId: '001',
        },
      ],
    });
  });

  it('concatenates multiple tool calls into a single message', async () => {
    const message = mergeChunks([
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
      },
    ]);

    expect(message).toEqual({
      content: '',
      tool_calls: [
        {
          function: {
            name: 'myFunction',
            arguments: '{"foo": "bar"}',
          },
          toolCallId: '001',
        },
        {
          function: {
            name: 'myFunction',
            arguments: '{ "foo": "baz" }',
          },
          toolCallId: '002',
        },
      ],
    });
  });
});
