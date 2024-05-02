/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventStreamCodec } from '@smithy/eventstream-codec';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';
import { handleBedrockChunk } from '../..';

const getContentBlockDelta = (completion: string) => ({
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: completion },
});

const messageStart = {
  type: 'message_start',
  message: {
    id: 'msg_01Mp3df6ic3BZPJqJGS23qsx',
    type: 'message',
    role: 'assistant',
    content: [],
    model: 'claude-3-sonnet-28k-20240229',
    stop_reason: null,
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 1 },
  },
};
const contentBlockStart = {
  type: 'content_block_start',
  index: 0,
  content_block: { type: 'text', text: '' },
};

const contentBlockStop = { type: 'content_block_stop', index: 0 };
const messageDelta = {
  type: 'message_delta',
  delta: { stop_reason: 'end_turn', stop_sequence: null },
  usage: { output_tokens: 5 },
};
const messageStop = {
  type: 'message_stop',
  'amazon-bedrock-invocationMetrics': {
    inputTokenCount: 10,
    outputTokenCount: 5,
    invocationLatency: 629,
    firstByteLatency: 515,
  },
};

const mockChunks = [
  messageStart,
  contentBlockStart,
  getContentBlockDelta('My'),
  getContentBlockDelta(' new'),
  getContentBlockDelta(' message'),
  contentBlockStop,
  messageDelta,
  messageStop,
].map((c) => encodeBedrockResponse(c));

describe('handleBedrockChunk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should call chunkHandler when a chunk has been decoded', () => {
    const chunkHandler = jest.fn();
    const bedrockBuffer: Uint8Array = new Uint8Array(0);
    const result = handleBedrockChunk({
      chunk: mockChunks[2],
      bedrockBuffer,
      chunkHandler,
    });
    expect(chunkHandler).toHaveBeenCalledWith('My');

    expect(result).toEqual({
      decodedChunk: 'My',
      bedrockBuffer: new Uint8Array(0),
    });
  });
  it('should extract message from bedrock chunk objects', () => {
    const bedrockBuffer: Uint8Array = new Uint8Array(0);
    const allChunks = mockChunks
      .map(
        (chunk) =>
          handleBedrockChunk({
            chunk,
            bedrockBuffer,
          }).decodedChunk
      )
      .join('');

    expect(allChunks).toEqual('My new message');
  });
});

function encodeBedrockResponse(responseChunk: Record<string, unknown>) {
  return new EventStreamCodec(toUtf8, fromUtf8).encode({
    headers: {},
    body: Uint8Array.from(
      Buffer.from(
        JSON.stringify({
          bytes: Buffer.from(JSON.stringify(responseChunk)).toString('base64'),
        })
      )
    ),
  });
}
