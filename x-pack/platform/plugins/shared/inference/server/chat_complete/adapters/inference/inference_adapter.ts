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
import { parseInlineFunctionCalls } from '../../simulated_function_calling';
import type { InferenceConnectorAdapter } from '../../types';
import { isNativeFunctionCallingSupported } from '../../utils';
import { emitTokenCountEstimateIfMissing, processOpenAIStream } from '../openai';
import { createRequest } from './create_openai_request';

export const inferenceAdapter: InferenceConnectorAdapter = {
  chatComplete: ({
    executor,
    system,
    messages,
    toolChoice,
    tools,
    functionCalling,
    temperature,
    modelName,
    logger,
    abortSignal,
    telemetryMetadata,
  }) => {
    const useSimulatedFunctionCalling =
      functionCalling === 'auto'
        ? !isNativeFunctionCallingSupported(executor.getConnector())
        : functionCalling === 'simulated';

    const request = createRequest({
      connector: executor.getConnector(),
      system,
      messages,
      toolChoice,
      tools,
      simulatedFunctionCalling: useSimulatedFunctionCalling,
      temperature,
      modelName,
    });

    return from(
      executor.invoke({
        subAction: 'unified_completion_stream',
        subActionParams: {
          body: request,
          signal: abortSignal,
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
