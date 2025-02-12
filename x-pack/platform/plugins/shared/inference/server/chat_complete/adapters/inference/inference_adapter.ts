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
import { convertUpstreamError, isNativeFunctionCallingSupported } from '../../utils';
import type { InferenceConnectorAdapter } from '../../types';
import { parseInlineFunctionCalls } from '../../simulated_function_calling';
import { processOpenAIStream, emitTokenCountEstimateIfMissing } from '../openai';
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
    metadata,
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
          ...(metadata?.connectorTelemetry
            ? { telemetryMetadata: metadata.connectorTelemetry }
            : {}),
        },
      })
    ).pipe(
      switchMap((response) => {
        if (response.status === 'error') {
          return throwError(() =>
            convertUpstreamError(response.serviceMessage!, {
              messagePrefix: 'Error calling connector:',
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
