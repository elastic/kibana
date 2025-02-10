/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type OpenAI from 'openai';
import { filter, from, map, mergeMap, Observable, tap } from 'rxjs';
import {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
  createInferenceInternalError,
} from '@kbn/inference-common';
import { createTokenLimitReachedError } from '../../errors';
import { tokenCountFromOpenAI, chunkFromOpenAI } from './from_openai';
import { convertStreamError, type ErrorLine } from './stream_errors';

export function processOpenAIStream() {
  return (source: Observable<string>) => {
    return source.pipe(
      filter((line) => !!line && line !== '[DONE]'),
      map((line) => {
        try {
          return JSON.parse(line) as OpenAI.ChatCompletionChunk | ErrorLine;
        } catch (e) {
          throw createInferenceInternalError(`Failed to parse line "${line}": ${e.message}`);
        }
      }),
      tap((line) => {
        if ('error' in line) {
          throw convertStreamError(line);
        }
        if (
          'choices' in line &&
          line.choices.length &&
          line.choices[0].finish_reason === 'length'
        ) {
          throw createTokenLimitReachedError();
        }
      }),
      filter((line): line is OpenAI.ChatCompletionChunk => {
        return 'object' in line && line.object === 'chat.completion.chunk';
      }),
      mergeMap((chunk): Observable<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent> => {
        const events: Array<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent> = [];
        if (chunk.usage) {
          events.push(tokenCountFromOpenAI(chunk.usage));
        }
        if (chunk.choices?.length) {
          events.push(chunkFromOpenAI(chunk));
        }
        return from(events);
      })
    );
  };
}
