/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  ChatCompleteOptions,
  createInferenceRequestError,
  getConnectorFamily,
  getConnectorProvider,
  type ChatCompleteCompositeResponse,
  ToolOptions,
  MessageRole,
} from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import { defer, from, identity, share, switchMap, throwError } from 'rxjs';
import { withChatCompleteSpan } from '@kbn/inference-tracing';
import { omit } from 'lodash';
import { getInferenceAdapter } from './adapters';
import {
  InferenceExecutor,
  chunksIntoMessage,
  getInferenceExecutor,
  handleCancellation,
  streamToResponse,
} from './utils';
import { retryWithExponentialBackoff } from '../../common/utils/retry_with_exponential_backoff';
import { getRetryFilter } from '../../common/utils/error_retry_filter';

interface CreateChatCompleteApiOptions {
  request: KibanaRequest;
  actions: ActionsPluginStart;
  logger: Logger;
}

type CreateChatCompleteApiOptionsKey =
  | 'connectorId'
  | 'abortSignal'
  | 'stream'
  | 'retryConfiguration'
  | 'maxRetries';

type ChatCompleteApiWithCallbackInitOptions = Pick<
  ChatCompleteOptions<ToolOptions, boolean>,
  CreateChatCompleteApiOptionsKey
>;

export type ChatCompleteApiWithCallbackCallback = (
  connector: InferenceExecutor
) => Omit<ChatCompleteOptions<ToolOptions, boolean>, CreateChatCompleteApiOptionsKey>;

export type ChatCompleteApiWithCallback = (
  options: ChatCompleteApiWithCallbackInitOptions,
  callback: ChatCompleteApiWithCallbackCallback
) => ChatCompleteCompositeResponse<ToolOptions, boolean>;

export function createChatCompleteCallbackApi(
  options: CreateChatCompleteApiOptions
): ChatCompleteApiWithCallback;

export function createChatCompleteCallbackApi({
  request,
  actions,
  logger,
}: CreateChatCompleteApiOptions) {
  return (
    {
      connectorId,
      abortSignal,
      stream,
      maxRetries = 3,
      retryConfiguration = { retryOn: 'all' },
    }: ChatCompleteApiWithCallbackInitOptions,
    callback: ChatCompleteApiWithCallbackCallback
  ) => {
    const inference$ = defer(() => from(getInferenceExecutor({ connectorId, request, actions })))
      .pipe(
        switchMap((executor) => {
          const {
            system,
            messages: givenMessages,
            functionCalling,
            metadata,
            modelName,
            temperature,
            toolChoice,
            tools,
          } = callback(executor);

          const messages = givenMessages.map((message) => {
            // remove empty toolCalls array, spec doesn't like it
            if (
              message.role === MessageRole.Assistant &&
              message.toolCalls !== undefined &&
              message.toolCalls.length === 0
            ) {
              return omit(message, 'toolCalls');
            }
            return message;
          });

          const connector = executor.getConnector();
          const connectorType = connector.type;
          const inferenceAdapter = getInferenceAdapter(connectorType);

          if (!inferenceAdapter) {
            return throwError(() =>
              createInferenceRequestError(`Adapter for type ${connectorType} not implemented`, 400)
            );
          }

          return withChatCompleteSpan(
            {
              system,
              messages,
              tools,
              toolChoice,
              model: {
                family: getConnectorFamily(connector),
                provider: getConnectorProvider(connector),
              },
              ...metadata?.attributes,
            },
            () => {
              return inferenceAdapter
                .chatComplete({
                  system,
                  executor,
                  messages,
                  toolChoice,
                  tools,
                  temperature,
                  logger,
                  functionCalling,
                  modelName,
                  abortSignal,
                  metadata,
                })
                .pipe(
                  chunksIntoMessage({
                    toolOptions: { toolChoice, tools },
                    logger,
                  })
                );
            }
          );
        })
      )
      .pipe(
        retryWithExponentialBackoff({
          maxRetry: maxRetries,
          backoffMultiplier: retryConfiguration.backoffMultiplier,
          initialDelay: retryConfiguration.initialDelay,
          errorFilter: getRetryFilter(retryConfiguration.retryOn),
        }),
        abortSignal ? handleCancellation(abortSignal) : identity
      );

    if (stream) {
      return inference$.pipe(share());
    } else {
      return streamToResponse(inference$);
    }
  };
}
