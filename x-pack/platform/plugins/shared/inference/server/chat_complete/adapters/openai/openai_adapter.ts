/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInferenceInternalError } from '@kbn/inference-common';
import { from, identity, switchMap, throwError } from 'rxjs';
import { Readable, isReadable } from 'stream';
import { eventSourceStreamIntoObservable } from '../../../util/event_source_stream_into_observable';
import {
  parseInlineFunctionCalls,
  wrapWithSimulatedFunctionCalling,
} from '../../simulated_function_calling';
import type { InferenceConnectorAdapter } from '../../types';
import { isNativeFunctionCallingSupported } from '../../utils/function_calling_support';
import { emitTokenCountEstimateIfMissing } from './emit_token_count_if_missing';
import { processOpenAIStream } from './process_openai_stream';
import { messagesToOpenAI, toolChoiceToOpenAI, toolsToOpenAI } from './to_openai';
import type { OpenAIRequest } from './types';

export const openAIAdapter: InferenceConnectorAdapter = {
  chatComplete: ({
    executor,
    system,
    messages,
    toolChoice,
    tools,
    temperature = 0,
    functionCalling = 'auto',
    modelName,
    logger,
    abortSignal,
    telemetryMetadata,
  }) => {
    const useSimulatedFunctionCalling =
      functionCalling === 'auto'
        ? !isNativeFunctionCallingSupported(executor.getConnector())
        : functionCalling === 'simulated';

    let request: OpenAIRequest;
    if (useSimulatedFunctionCalling) {
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
          telemetryMetadata,
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
      useSimulatedFunctionCalling ? parseInlineFunctionCalls({ logger }) : identity
    );
  },
};
