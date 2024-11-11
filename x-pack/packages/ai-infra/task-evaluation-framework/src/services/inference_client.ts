/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosResponse } from 'axios';
import { IncomingMessage } from 'http';
import { from, map, switchMap, throwError } from 'rxjs';
import { isReadable } from 'stream';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ChatCompleteAPI,
  ChatCompleteCompositeResponse,
  ChatCompleteOptions,
  ChatCompletionEvent,
  createInferenceInternalError,
  InferenceTaskError,
  InferenceTaskErrorEvent,
  InferenceTaskEventType,
  OutputAPI,
  type ToolOptions,
  withoutOutputUpdateEvents,
} from '@kbn/inference-common';
import type { KibanaClient } from './kibana_client';

// TODO: need to extract
import { eventSourceStreamIntoObservable } from '@kbn/inference-plugin/server/util/event_source_stream_into_observable';
// TODO: need to extract
import { createOutputApi } from '@kbn/inference-plugin/common';

export interface EvaluationInferenceClient {
  chatComplete: ChatCompleteAPI;
  output: OutputAPI;
}

function streamResponse(responsePromise: Promise<AxiosResponse>) {
  return from(responsePromise).pipe(
    switchMap((response) => {
      if (isReadable(response.data)) {
        return eventSourceStreamIntoObservable(response.data as IncomingMessage);
      }
      return throwError(() => createInferenceInternalError('Unexpected error', response.data));
    }),
    map((line) => {
      return JSON.parse(line) as ChatCompletionEvent | InferenceTaskErrorEvent;
    }),
    map((line) => {
      if (line.type === InferenceTaskEventType.error) {
        throw new InferenceTaskError(line.error.code, line.error.message, line.error.meta);
      }
      return line;
    })
  );
}

export const createInferenceClient = ({
  kibanaClient,
  log,
}: {
  kibanaClient: KibanaClient;
  log: ToolingLog;
}): EvaluationInferenceClient => {
  // TODO

  const chatCompleteApi: ChatCompleteAPI = <
    TToolOptions extends ToolOptions = ToolOptions,
    TStream extends boolean = false
  >({
    connectorId: chatCompleteConnectorId,
    messages,
    system,
    toolChoice,
    tools,
    functionCalling,
    stream,
  }: ChatCompleteOptions<TToolOptions, TStream>) => {
    const body = {
      connectorId: chatCompleteConnectorId,
      system,
      messages,
      toolChoice,
      tools,
      functionCalling,
    };

    if (stream) {
      return streamResponse(
        kibanaClient.axios.post(
          kibanaClient.getUrl({
            pathname: `/internal/inference/chat_complete/stream`,
          }),
          body,
          { responseType: 'stream', timeout: NaN }
        )
      ) as ChatCompleteCompositeResponse<TToolOptions, TStream>;
    } else {
      return kibanaClient.axios
        .post(
          kibanaClient.getUrl({
            pathname: `/internal/inference/chat_complete/stream`,
          }),
          body
        )
        .then((response) => {
          return response.data;
        }) as ChatCompleteCompositeResponse<TToolOptions, TStream>;
    }
  };

  const outputApi: OutputAPI = createOutputApi(chatCompleteApi);

  return {
    chatComplete: (options) => {
      return chatCompleteApi({ ...options });
    },
    output: (options) => {
      const response = outputApi({ ...options });
      if (options.stream) {
        return (response as any).pipe(withoutOutputUpdateEvents());
      } else {
        return response;
      }
    },
  };
};
