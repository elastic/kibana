/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  BoundChatCompleteAPI,
  BoundOutputAPI,
  ChatCompleteResponse,
  ChatCompletionEvent,
  InferenceConnector,
  ToolOptions,
  UnboundChatCompleteOptions,
  UnboundOutputOptions,
} from '@kbn/inference-common';
import { ToolSchemaTypeObject } from '@kbn/inference-common/src/chat_complete/tool_schema';
import { ChatCompleteRequestBody, createOutputApi } from '@kbn/inference-plugin/common';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { ToolingLog } from '@kbn/tooling-log';
import { defer, from } from 'rxjs';
import { KibanaClient } from '@kbn/kibana-api-cli';
import { InferenceChatModel } from '@kbn/inference-langchain';

interface InferenceCliClientOptions {
  log: ToolingLog;
  kibanaClient: KibanaClient;
  connector: InferenceConnector;
  signal: AbortSignal;
}

function createChatComplete(options: InferenceCliClientOptions): BoundChatCompleteAPI;

function createChatComplete({ connector, kibanaClient, signal }: InferenceCliClientOptions) {
  return <TToolOptions extends ToolOptions, TStream extends boolean = false>(
    options: UnboundChatCompleteOptions<TToolOptions, TStream>
  ) => {
    const {
      messages,
      abortSignal,
      maxRetries,
      metadata: _metadata,
      modelName,
      retryConfiguration,
      stream,
      system,
      temperature,
      toolChoice,
      tools,
    } = options;

    const body: ChatCompleteRequestBody = {
      connectorId: connector.connectorId,
      messages,
      modelName,
      system,
      temperature,
      toolChoice,
      tools,
      maxRetries,
      retryConfiguration:
        retryConfiguration && typeof retryConfiguration.retryOn === 'string'
          ? {
              retryOn: retryConfiguration.retryOn,
            }
          : undefined,
    };

    if (stream) {
      return defer(() => {
        return from(
          kibanaClient
            .fetch(`/internal/inference/chat_complete/stream`, {
              method: 'POST',
              body,
              asRawResponse: true,
              signal: combineSignal(signal, abortSignal),
            })
            .then((response) => ({ response }))
        );
      }).pipe(httpResponseIntoObservable<ChatCompletionEvent<TToolOptions>>());
    }

    return kibanaClient.fetch<ChatCompleteResponse<TToolOptions>>(
      `/internal/inference/chat_complete`,
      {
        method: 'POST',
        body,
        signal: combineSignal(signal, abortSignal),
      }
    );
  };
}

function combineSignal(left: AbortSignal, right?: AbortSignal) {
  if (!right) {
    return left;
  }
  const controller = new AbortController();

  left.addEventListener('abort', () => {
    controller.abort();
  });
  right?.addEventListener('abort', () => {
    controller.abort();
  });

  return controller.signal;
}

export class InferenceCliClient {
  private readonly boundChatCompleteAPI: BoundChatCompleteAPI;
  private readonly boundOutputAPI: BoundOutputAPI;
  constructor(private readonly options: InferenceCliClientOptions) {
    this.boundChatCompleteAPI = createChatComplete(options);

    const outputAPI = createOutputApi(this.boundChatCompleteAPI);

    this.boundOutputAPI = <
      TId extends string,
      TOutputSchema extends ToolSchemaTypeObject | undefined,
      TStream extends boolean = false
    >(
      outputOptions: UnboundOutputOptions<TId, TOutputSchema, TStream>
    ) => {
      options.log.debug(`Running task ${outputOptions.id}`);
      return outputAPI({
        ...outputOptions,
        connectorId: options.connector.connectorId,
        abortSignal: combineSignal(options.signal, outputOptions.abortSignal),
      });
    };
  }

  chatComplete: BoundChatCompleteAPI = (options) => {
    return this.boundChatCompleteAPI(options);
  };

  output: BoundOutputAPI = (options) => {
    return this.boundOutputAPI(options);
  };

  getLangChainChatModel = (): InferenceChatModel => {
    return new InferenceChatModel({
      connector: this.options.connector,
      chatComplete: this.boundChatCompleteAPI,
      signal: this.options.signal,
    });
  };
}
