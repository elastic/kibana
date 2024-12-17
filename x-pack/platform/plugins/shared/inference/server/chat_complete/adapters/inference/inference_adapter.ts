/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type OpenAI from 'openai';
import {
  filter,
  from,
  identity,
  map,
  mergeMap,
  Observable,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { isReadable, Readable } from 'stream';
import {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
  createInferenceInternalError,
} from '@kbn/inference-common';
import { createTokenLimitReachedError } from '../../errors';
import { eventSourceStreamIntoObservable } from '../../../util/event_source_stream_into_observable';
import type { InferenceConnectorAdapter } from '../../types';
import {
  parseInlineFunctionCalls,
  wrapWithSimulatedFunctionCalling,
} from '../../simulated_function_calling';
import {
  toolsToOpenAI,
  toolChoiceToOpenAI,
  messagesToOpenAI,
  chunkFromOpenAI,
  tokenCountFromOpenAI,
} from '../openai';

export const inferenceAdapter: InferenceConnectorAdapter = {
  chatComplete: ({ executor, system, messages, toolChoice, tools, functionCalling, logger }) => {
    const simulatedFunctionCalling = functionCalling === 'simulated';

    let request: Omit<OpenAI.ChatCompletionCreateParams, 'model'> & { model?: string };
    if (simulatedFunctionCalling) {
      const wrapped = wrapWithSimulatedFunctionCalling({
        system,
        messages,
        toolChoice,
        tools,
      });
      request = {
        messages: messagesToOpenAI({ system: wrapped.system, messages: wrapped.messages }),
      };
    } else {
      request = {
        messages: messagesToOpenAI({ system, messages }),
        tool_choice: toolChoiceToOpenAI(toolChoice),
        tools: toolsToOpenAI(tools),
      };
    }

    return from(
      executor.invoke({
        subAction: 'unified_stream',
        subActionParams: {
          body: request,
        },
      })
    ).pipe(
      switchMap((response) => {
        if (isReadable(response.data as any)) {
          return eventSourceStreamIntoObservable(response.data as Readable);
        }
        return throwError(() =>
          createInferenceInternalError('Unexpected error', response.data as Record<string, any>)
        );
      }),
      filter((line) => !!line && line !== '[DONE]'),
      map(
        (line) => JSON.parse(line) as OpenAI.ChatCompletionChunk | { error: { message: string } }
      ),
      tap((line) => {
        if ('error' in line) {
          throw createInferenceInternalError(line.error.message);
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
      }),
      simulatedFunctionCalling ? parseInlineFunctionCalls({ logger }) : identity
    );
  },
};
