/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defer, identity } from 'rxjs';
import { eventSourceStreamIntoObservable } from '../../../util/event_source_stream_into_observable';
import { isNativeFunctionCallingSupported, handleConnectorStreamResponse } from '../../utils';
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
    timeout,
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

    return defer(() => {
      return executor.invoke({
        subAction: 'unified_completion_stream',
        subActionParams: {
          body: request,
          signal: abortSignal,
          ...(metadata?.connectorTelemetry
            ? { telemetryMetadata: metadata.connectorTelemetry }
            : {}),
          ...(typeof timeout === 'number' && isFinite(timeout) ? { timeout } : {}),
        },
      });
    }).pipe(
      handleConnectorStreamResponse({ processStream: eventSourceStreamIntoObservable }),
      processOpenAIStream(),
      emitTokenCountEstimateIfMissing({ request }),
      useSimulatedFunctionCalling ? parseInlineFunctionCalls({ logger }) : identity
    );
  },
};
