/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defer, identity } from 'rxjs';
import { eventSourceStreamIntoObservable } from '../../../util/event_source_stream_into_observable';
import type { InferenceConnectorAdapter } from '../../types';
import {
  parseInlineFunctionCalls,
  wrapWithSimulatedFunctionCalling,
} from '../../simulated_function_calling';
import { isNativeFunctionCallingSupported, handleConnectorResponse } from '../../utils';
import type { OpenAIRequest } from './types';
import { messagesToOpenAI, toolsToOpenAI, toolChoiceToOpenAI } from './to_openai';
import { processOpenAIStream } from './process_openai_stream';
import { emitTokenCountEstimateIfMissing } from './emit_token_count_if_missing';
import { getTemperatureIfValid } from '../../utils/get_temperature';

export const openAIAdapter: InferenceConnectorAdapter = {
  chatComplete: ({
    executor,
    system,
    messages,
    toolChoice,
    tools,
    temperature = 0,
    functionCalling = 'auto',
    modelName: modelName,
    logger,
    abortSignal,
    metadata,
  }) => {
    const connector = executor.getConnector();
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
        ...getTemperatureIfValid(temperature, { connector, modelName }),
        model: modelName,
        messages: messagesToOpenAI({ system: wrapped.system, messages: wrapped.messages }),
      };
    } else {
      request = {
        stream: true,
        ...getTemperatureIfValid(temperature, { connector, modelName }),
        model: modelName,
        messages: messagesToOpenAI({ system, messages }),
        tool_choice: toolChoiceToOpenAI(toolChoice),
        tools: toolsToOpenAI(tools),
      };
    }

    return defer(() => {
      return executor.invoke({
        subAction: 'stream',
        subActionParams: {
          body: JSON.stringify(request),
          signal: abortSignal,
          stream: true,
          ...(metadata?.connectorTelemetry
            ? { telemetryMetadata: metadata.connectorTelemetry }
            : {}),
        },
      });
    }).pipe(
      handleConnectorResponse({ processStream: eventSourceStreamIntoObservable }),
      processOpenAIStream(),
      emitTokenCountEstimateIfMissing({ request }),
      useSimulatedFunctionCalling ? parseInlineFunctionCalls({ logger }) : identity
    );
  },
};
