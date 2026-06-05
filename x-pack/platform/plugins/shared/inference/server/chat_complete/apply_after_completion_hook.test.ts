/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, firstValueFrom, toArray } from 'rxjs';
import { ChatCompletionEventType } from '@kbn/inference-common';
import type { ChatCompletionChunkEvent } from '@kbn/inference-common';
import { restoreTokensOperator } from './apply_after_completion_hook';
import { chunkEvent, messageEvent } from '../test_utils';

const TOKEN = 'IP_aabbccdd11223344aabbccdd11223344'; // valid format: ENTITY_<32 hex>
const ORIGINAL = '10.0.0.1';
const tokenMap = { [TOKEN]: { original: ORIGINAL, entityClass: 'IP' } };

describe('restoreTokensOperator', () => {
  it('restores a token appearing fully within a single chunk', async () => {
    const events = await firstValueFrom(
      of(chunkEvent(`address ${TOKEN} detected`), messageEvent(`address ${TOKEN} detected`)).pipe(
        restoreTokensOperator(tokenMap),
        toArray()
      )
    );

    const chunks = events.filter((e) => e.type === ChatCompletionEventType.ChatCompletionChunk);
    const allContent = chunks.map((e) => (e as ChatCompletionChunkEvent).content).join('');
    expect(allContent).toContain(ORIGINAL);
    expect(allContent).not.toContain(TOKEN);
  });

  it('restores a token split across a chunk boundary without emitting partial tokens', async () => {
    // Split the token mid-suffix so the sliding hold-buffer must hold the tail
    const mid = Math.floor(TOKEN.length / 2);
    const part1 = TOKEN.slice(0, mid);
    const part2 = TOKEN.slice(mid);

    const events = await firstValueFrom(
      of(
        chunkEvent(`start ${part1}`),
        chunkEvent(`${part2} end`),
        messageEvent(`start ${TOKEN} end`)
      ).pipe(restoreTokensOperator(tokenMap), toArray())
    );

    const chunks = events.filter((e) => e.type === ChatCompletionEventType.ChatCompletionChunk);
    const allContent = chunks.map((e) => (e as ChatCompletionChunkEvent).content).join('');

    // Full restored value must be present across the emitted chunks
    expect(allContent).toContain(ORIGINAL);
    // No partial token should have been emitted
    expect(allContent).not.toMatch(/IP_[0-9a-f]+/);
  });

  it('passes through events with no tokens unchanged', async () => {
    const events = await firstValueFrom(
      of(chunkEvent('no PII here'), messageEvent('no PII here')).pipe(
        restoreTokensOperator(tokenMap),
        toArray()
      )
    );

    const chunks = events.filter((e) => e.type === ChatCompletionEventType.ChatCompletionChunk);
    const allContent = chunks.map((e) => (e as ChatCompletionChunkEvent).content).join('');
    expect(allContent).toBe('no PII here');
  });

  it('emits restored chunk events followed by the message event in order', async () => {
    const events = await firstValueFrom(
      of(chunkEvent(TOKEN), messageEvent(TOKEN)).pipe(restoreTokensOperator(tokenMap), toArray())
    );

    const types = events.map((e) => e.type);
    const messageIdx = types.lastIndexOf(ChatCompletionEventType.ChatCompletionMessage);
    const lastChunkIdx = types.lastIndexOf(ChatCompletionEventType.ChatCompletionChunk);

    expect(messageIdx).toBeGreaterThan(-1);
    // If chunks were emitted, they must come before the message
    if (lastChunkIdx !== -1) {
      expect(messageIdx).toBeGreaterThan(lastChunkIdx);
    }
  });

  it('does nothing when tokenMap is empty', async () => {
    const events = await firstValueFrom(
      of(chunkEvent(TOKEN), messageEvent(TOKEN)).pipe(restoreTokensOperator({}), toArray())
    );

    const chunks = events.filter((e) => e.type === ChatCompletionEventType.ChatCompletionChunk);
    const allContent = chunks.map((e) => (e as ChatCompletionChunkEvent).content).join('');
    expect(allContent).toContain(TOKEN);
  });
});
