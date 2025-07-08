/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  IRouter,
  Logger,
  RequestHandlerContext,
  KibanaRequest,
} from '@kbn/core/server';
import { InferenceTaskEventType, isInferenceError } from '@kbn/inference-common';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import type { ChatCompleteRequestBody } from '../../common/http_apis';
import { InferenceServerStart, InferenceStartDependencies } from '../types';
import { chatCompleteBodySchema } from './schemas';
import { getRequestAbortedSignal } from './get_request_aborted_signal';

export function registerChatCompleteRoute({
  coreSetup,
  router,
  logger,
}: {
  coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
  router: IRouter<RequestHandlerContext>;
  logger: Logger;
}) {
  async function callChatComplete<T extends boolean>({
    request,
    stream,
  }: {
    request: KibanaRequest<unknown, unknown, ChatCompleteRequestBody>;
    stream: T;
  }) {
    const [, pluginsStart, inferenceStart] = await coreSetup.getStartServices();
    const actions = pluginsStart.actions;

    const abortController = new AbortController();
    request.events.aborted$.subscribe(() => abortController.abort());

    const client = inferenceStart.getClient({ request, actions, logger });

    const {
      connectorId,
      messages,
      system,
      toolChoice,
      tools,
      functionCalling,
      maxRetries,
      modelName,
      retryConfiguration,
      temperature,
      metadata,
    } = request.body;

    return client.chatComplete({
      connectorId,
      messages,
      system,
      toolChoice,
      tools,
      functionCalling,
      stream,
      abortSignal: abortController.signal,
      maxRetries,
      modelName,
      retryConfiguration,
      temperature,
      metadata,
    });
  }

  router.post(
    {
      path: '/internal/inference/chat_complete',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        body: chatCompleteBodySchema,
      },
    },
    async (context, request, response) => {
      try {
        const chatCompleteResponse = await callChatComplete({ request, stream: false });
        return response.ok({
          body: chatCompleteResponse,
        });
      } catch (e) {
        return response.custom({
          statusCode: isInferenceError(e) ? e.meta?.status ?? 500 : 500,
          bypassErrorFormat: true,
          body: {
            type: InferenceTaskEventType.error,
            code: e.code ?? 'unknown',
            message: e.message,
          },
        });
      }
    }
  );

  router.post(
    {
      path: '/internal/inference/chat_complete/stream',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the inference client',
        },
      },
      validate: {
        body: chatCompleteBodySchema,
      },
    },
    async (context, request, response) => {
      const chatCompleteEvents$ = await callChatComplete({ request, stream: true });
      return response.ok({
        body: observableIntoEventSourceStream(chatCompleteEvents$, {
          logger,
          signal: getRequestAbortedSignal(request),
        }),
      });
    }
  );
}
