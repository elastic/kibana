/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, identity, switchMap, throwError } from 'rxjs';
import { isReadable, Readable } from 'stream';
import { createInferenceInternalError } from '@kbn/inference-common';
import { eventSourceStreamIntoObservable } from '../../../util/event_source_stream_into_observable';
import type { InferenceConnectorAdapter } from '../../types';
import {
  parseInlineFunctionCalls,
  wrapWithSimulatedFunctionCalling,
} from '../../simulated_function_calling';
import type { OpenAIRequest } from './types';
import { messagesToOpenAI, toolsToOpenAI, toolChoiceToOpenAI } from './to_openai';
import { processOpenAIStream } from './process_openai_stream';
import { emitTokenCountEstimateIfMissing } from './emit_token_count_if_missing';

export const openAIAdapter: InferenceConnectorAdapter = {
  chatComplete: ({
    executor,
    system,
    messages,
    toolChoice,
    tools,
    temperature = 0,
    functionCalling,
    modelName,
    logger,
    abortSignal,
  }) => {
    const simulatedFunctionCalling = functionCalling === 'simulated';

    let request: OpenAIRequest;
    if (simulatedFunctionCalling) {
      const wrapped = wrapWithSimulatedFunctionCalling({
        system,
        messages,
        toolChoice,
        tools,
      });
      request = {
        stream: true,
        temperature,
        model: modelName,
        messages: messagesToOpenAI({ system: wrapped.system, messages: wrapped.messages }),
      };
    } else {
      request = {
        stream: true,
        temperature,
        model: modelName,
        messages: messagesToOpenAI({ system, messages }),
        tool_choice: toolChoiceToOpenAI(toolChoice),
        tools: toolsToOpenAI(tools),
      };
    }

    return from(
      executor.invoke({
        subAction: 'stream',
        subActionParams: {
          body: JSON.stringify(request),
          signal: abortSignal,
          stream: true,
        },
      })
    ).pipe(
      switchMap((response) => {
        if (response.status === 'error') {
          return throwError(() =>
            createInferenceInternalError(`Error calling connector: ${response.serviceMessage}`, {
              rootError: response.serviceMessage,
            })
          );
        }
        if (isReadable(response.data as any)) {
          return eventSourceStreamIntoObservable(response.data as Readable);
        }
        return throwError(() =>
          createInferenceInternalError('Unexpected error', response.data as Record<string, any>)
        );
      }),
      processOpenAIStream(),
      emitTokenCountEstimateIfMissing({ request }),
      simulatedFunctionCalling ? parseInlineFunctionCalls({ logger }) : identity
    );
  },
};
