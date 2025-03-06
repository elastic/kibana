/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last, omit } from 'lodash';
import { defer, switchMap, throwError, identity } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  type ChatCompleteAPI,
  type ChatCompleteCompositeResponse,
  createInferenceRequestError,
  type ToolOptions,
  ChatCompleteOptions,
} from '@kbn/inference-common';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { getInferenceAdapter } from './adapters';
import {
  getInferenceExecutor,
  chunksIntoMessage,
  streamToResponse,
  handleCancellation,
} from './utils';

interface CreateChatCompleteApiOptions {
  request: KibanaRequest;
  actions: ActionsPluginStart;
  logger: Logger;
}

export function createChatCompleteApi(options: CreateChatCompleteApiOptions): ChatCompleteAPI;
export function createChatCompleteApi({ request, actions, logger }: CreateChatCompleteApiOptions) {
  return ({
    connectorId,
    messages,
    toolChoice,
    tools,
    temperature,
    system,
    functionCalling,
    modelName,
    stream,
    abortSignal,
    metadata,
  }: ChatCompleteOptions<ToolOptions, boolean>): ChatCompleteCompositeResponse<
    ToolOptions,
    boolean
  > => {
    const inference$ = defer(async () => {
      return await getInferenceExecutor({ connectorId, request, actions });
    }).pipe(
      switchMap((executor) => {
        const connectorType = executor.getConnector().type;
        const inferenceAdapter = getInferenceAdapter(connectorType);

        const messagesWithoutData = messages.map((message) => omit(message, 'data'));

        if (!inferenceAdapter) {
          return throwError(() =>
            createInferenceRequestError(`Adapter for type ${connectorType} not implemented`, 400)
          );
        }

        logger.debug(
          () => `Sending request, last message is: ${JSON.stringify(last(messagesWithoutData))}`
        );

        logger.trace(() =>
          JSON.stringify({
            messages: messagesWithoutData,
            toolChoice,
            tools,
            system,
          })
        );

        return inferenceAdapter.chatComplete({
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
        });
      }),
      chunksIntoMessage({
        toolOptions: { toolChoice, tools },
        logger,
      }),
      abortSignal ? handleCancellation(abortSignal) : identity
    );

    if (stream) {
      return inference$;
    } else {
      return streamToResponse(inference$);
    }
  };
}
