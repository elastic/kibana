/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { Observable, toArray, firstValueFrom, map, filter } from 'rxjs';
import {
  BedrockChunkMember,
  BedrockStreamMember,
  serdeEventstreamIntoObservable,
} from './serde_eventstream_into_observable';
import { EventStreamMarshaller } from '@smithy/eventstream-serde-node';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';
import type { CompletionChunk } from './types';
import { parseSerdeChunkMessage, serializeSerdeChunkMessage } from './serde_utils';

describe('serdeEventstreamIntoObservable', () => {
  const marshaller = new EventStreamMarshaller({
    utf8Encoder: toUtf8,
    utf8Decoder: fromUtf8,
  });

  const getSerdeEventStream = (chunks: CompletionChunk[]) => {
    const input = Readable.from(chunks);
    return marshaller.serialize(input, serializeSerdeChunkMessage);
  };

  const getChunks = async (serde$: Observable<BedrockStreamMember>) => {
    return await firstValueFrom(
      serde$.pipe(
        filter((value): value is BedrockChunkMember => {
          return 'chunk' in value && value.chunk?.headers?.[':event-type']?.value === 'chunk';
        }),
        map((message) => {
          return parseSerdeChunkMessage(message.chunk);
        }),
        toArray()
      )
    );
  };

  it('converts a single chunk', async () => {
    const chunks: CompletionChunk[] = [
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'Hello' },
      },
    ];

    const inputStream = getSerdeEventStream(chunks);
    const serde$ = serdeEventstreamIntoObservable(inputStream);

    const result = await getChunks(serde$);

    expect(result).toEqual(chunks);
  });

  it('converts multiple chunks', async () => {
    const chunks: CompletionChunk[] = [
      {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'text', text: 'start' },
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'Hello' },
      },
      {
        type: 'content_block_stop',
        index: 0,
      },
    ];

    const inputStream = getSerdeEventStream(chunks);
    const serde$ = serdeEventstreamIntoObservable(inputStream);

    const result = await getChunks(serde$);

    expect(result).toEqual(chunks);
  });
});
