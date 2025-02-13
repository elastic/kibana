/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, of, toArray } from 'rxjs';
import { processCompletionChunks } from './process_completion_chunks';
import type { CompletionChunk } from './types';

describe('processCompletionChunks', () => {
  it('does not emit for a message_start event', async () => {
    const chunks: CompletionChunk[] = [
      {
        type: 'message_start',
        message: 'foo',
      },
    ];

    expect(await lastValueFrom(of(...chunks).pipe(processCompletionChunks(), toArray()))).toEqual(
      []
    );
  });

  it('emits the correct value for a content_block_start event with text content ', async () => {
    const chunks: CompletionChunk[] = [
      {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'text', text: 'foo' },
      },
    ];

    expect(await lastValueFrom(of(...chunks).pipe(processCompletionChunks(), toArray()))).toEqual([
      {
        type: 'chatCompletionChunk',
        content: 'foo',
        tool_calls: [],
      },
    ]);
  });

  it('emits the correct value for a content_block_start event with tool_use content ', async () => {
    const chunks: CompletionChunk[] = [
      {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'tool_use', id: 'id', name: 'name', input: '{}' },
      },
    ];

    expect(await lastValueFrom(of(...chunks).pipe(processCompletionChunks(), toArray()))).toEqual([
      {
        type: 'chatCompletionChunk',
        content: '',
        tool_calls: [
          {
            toolCallId: 'id',
            index: 0,
            function: {
              arguments: '',
              name: 'name',
            },
          },
        ],
      },
    ]);
  });

  it('emits the correct value for a content_block_delta event with text content ', async () => {
    const chunks: CompletionChunk[] = [
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'delta' },
      },
    ];

    expect(await lastValueFrom(of(...chunks).pipe(processCompletionChunks(), toArray()))).toEqual([
      {
        type: 'chatCompletionChunk',
        content: 'delta',
        tool_calls: [],
      },
    ]);
  });

  it('emits the correct value for a content_block_delta event with tool_use content ', async () => {
    const chunks: CompletionChunk[] = [
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'input_json_delta', partial_json: '{ "param' },
      },
    ];

    expect(await lastValueFrom(of(...chunks).pipe(processCompletionChunks(), toArray()))).toEqual([
      {
        type: 'chatCompletionChunk',
        content: '',
        tool_calls: [
          {
            index: 0,
            toolCallId: '',
            function: {
              arguments: '{ "param',
              name: '',
            },
          },
        ],
      },
    ]);
  });

  it('does not emit for a content_block_stop event', async () => {
    const chunks: CompletionChunk[] = [
      {
        type: 'content_block_stop',
        index: 0,
      },
    ];

    expect(await lastValueFrom(of(...chunks).pipe(processCompletionChunks(), toArray()))).toEqual(
      []
    );
  });

  it('emits the correct value for a message_delta event with tool_use content ', async () => {
    const chunks: CompletionChunk[] = [
      {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn', stop_sequence: 'stop_seq', usage: { output_tokens: 42 } },
      },
    ];

    expect(await lastValueFrom(of(...chunks).pipe(processCompletionChunks(), toArray()))).toEqual([
      {
        type: 'chatCompletionChunk',
        content: 'stop_seq',
        tool_calls: [],
      },
    ]);
  });

  it('emits a token count for a message_stop event ', async () => {
    const chunks: CompletionChunk[] = [
      {
        type: 'message_stop',
        'amazon-bedrock-invocationMetrics': {
          inputTokenCount: 1,
          outputTokenCount: 2,
          invocationLatency: 3,
          firstByteLatency: 4,
        },
      },
    ];

    expect(await lastValueFrom(of(...chunks).pipe(processCompletionChunks(), toArray()))).toEqual([
      {
        type: 'chatCompletionTokenCount',
        tokens: {
          completion: 2,
          prompt: 1,
          total: 3,
        },
      },
    ]);
  });

  it('emits the correct values for a text response scenario', async () => {
    const chunks: CompletionChunk[] = [
      {
        type: 'message_start',
        message: 'foo',
      },
      {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'text', text: 'foo' },
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'delta1' },
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'delta2' },
      },
      {
        type: 'content_block_stop',
        index: 0,
      },
      {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn', stop_sequence: 'stop_seq', usage: { output_tokens: 42 } },
      },
      {
        type: 'message_stop',
        'amazon-bedrock-invocationMetrics': {
          inputTokenCount: 1,
          outputTokenCount: 2,
          invocationLatency: 3,
          firstByteLatency: 4,
        },
      },
    ];

    expect(await lastValueFrom(of(...chunks).pipe(processCompletionChunks(), toArray()))).toEqual([
      {
        content: 'foo',
        tool_calls: [],
        type: 'chatCompletionChunk',
      },
      {
        content: 'delta1',
        tool_calls: [],
        type: 'chatCompletionChunk',
      },
      {
        content: 'delta2',
        tool_calls: [],
        type: 'chatCompletionChunk',
      },
      {
        content: 'stop_seq',
        tool_calls: [],
        type: 'chatCompletionChunk',
      },
      {
        tokens: {
          completion: 2,
          prompt: 1,
          total: 3,
        },
        type: 'chatCompletionTokenCount',
      },
    ]);
  });

  it('emits the correct values for a tool_use response scenario', async () => {
    const chunks: CompletionChunk[] = [
      {
        type: 'message_start',
        message: 'foo',
      },
      {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'tool_use', id: 'id', name: 'name', input: '{}' },
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'input_json_delta', partial_json: '{ "param' },
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'input_json_delta', partial_json: '": 12 }' },
      },
      {
        type: 'content_block_stop',
        index: 0,
      },
      {
        type: 'message_delta',
        delta: { stop_reason: 'tool_use', stop_sequence: null, usage: { output_tokens: 42 } },
      },
      {
        type: 'message_stop',
        'amazon-bedrock-invocationMetrics': {
          inputTokenCount: 1,
          outputTokenCount: 2,
          invocationLatency: 3,
          firstByteLatency: 4,
        },
      },
    ];

    expect(await lastValueFrom(of(...chunks).pipe(processCompletionChunks(), toArray()))).toEqual([
      {
        content: '',
        tool_calls: [
          {
            function: {
              arguments: '',
              name: 'name',
            },
            index: 0,
            toolCallId: 'id',
          },
        ],
        type: 'chatCompletionChunk',
      },
      {
        content: '',
        tool_calls: [
          {
            function: {
              arguments: '{ "param',
              name: '',
            },
            index: 0,
            toolCallId: '',
          },
        ],
        type: 'chatCompletionChunk',
      },
      {
        content: '',
        tool_calls: [
          {
            function: {
              arguments: '": 12 }',
              name: '',
            },
            index: 0,
            toolCallId: '',
          },
        ],
        type: 'chatCompletionChunk',
      },
      {
        tokens: {
          completion: 2,
          prompt: 1,
          total: 3,
        },
        type: 'chatCompletionTokenCount',
      },
    ]);
  });
});
