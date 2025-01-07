/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last, omit } from 'lodash';
import { defer, switchMap, throwError } from 'rxjs';
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
import { getConnectorById } from '../util/get_connector_by_id';
import { getInferenceAdapter } from './adapters';
import { createInferenceExecutor, chunksIntoMessage, streamToResponse } from './utils';

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
    system,
    functionCalling,
    stream,
  }: ChatCompleteOptions<ToolOptions, boolean>): ChatCompleteCompositeResponse<
    ToolOptions,
    boolean
  > => {
    const obs$ = defer(async () => {
      const actionsClient = await actions.getActionsClientWithRequest(request);
      const connector = await getConnectorById({ connectorId, actionsClient });
      const executor = createInferenceExecutor({ actionsClient, connector });
      return { executor, connector };
    }).pipe(
      switchMap(({ executor, connector }) => {
        const connectorType = connector.type;
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
          logger,
          functionCalling,
        });
      }),
      chunksIntoMessage({
        toolOptions: {
          toolChoice,
          tools,
        },
        logger,
      })
    );

    if (stream) {
      return obs$;
    } else {
      return streamToResponse(obs$);
    }
  };
}
