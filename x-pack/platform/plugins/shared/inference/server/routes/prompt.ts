/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  IRouter,
  KibanaRequest,
  Logger,
  RequestHandlerContext,
} from '@kbn/core/server';
import { InferenceTaskEventType, isInferenceError } from '@kbn/inference-common';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import { z } from '@kbn/zod';
import { PromptRequestBody } from '../../common/http_apis';
import { InferenceServerStart, InferenceStartDependencies } from '../types';
import { promptBodySchema } from './schemas';
import { getRequestAbortedSignal } from './get_request_aborted_signal';

export function registerPromptRoute({
  coreSetup,
  router,
  logger,
}: {
  coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
  router: IRouter<RequestHandlerContext>;
  logger: Logger;
}) {
  async function callPrompt<T extends boolean>({
    request,
    stream,
  }: {
    request: KibanaRequest<unknown, unknown, PromptRequestBody>;
    stream: T;
  }) {
    const [, pluginsStart, inferenceStart] = await coreSetup.getStartServices();
    const actions = pluginsStart.actions;

    const abortController = new AbortController();
    request.events.aborted$.subscribe(() => abortController.abort());
    const client = inferenceStart.getClient({ request, actions, logger });

    const {
      connectorId,
      prompt,
      input,
      functionCalling,
      maxRetries,
      modelName,
      retryConfiguration,
      temperature = 0.25,
      metadata,
      prevMessages,
    } = request.body;

    return client.prompt({
      connectorId,
      prompt: {
        ...prompt,
        // validation should have happened on the client
        input: z.any(),
      },
      input,
      functionCalling,
      stream,
      abortSignal: abortController.signal,
      maxRetries,
      modelName,
      retryConfiguration,
      temperature,
      metadata,
      prevMessages,
    });
  }

  router.post(
    {
      path: '/internal/inference/prompt',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        body: promptBodySchema,
      },
    },
    async (context, request, response) => {
      try {
        const promptResponse = await callPrompt({ request, stream: false });
        return response.ok({
          body: promptResponse,
        });
      } catch (e) {
        logger.debug(() => e);
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
      path: '/internal/inference/prompt/stream',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the inference client',
        },
      },
      validate: {
        body: promptBodySchema,
      },
    },
    async (context, request, response) => {
      const promptResponse$ = await callPrompt({ request, stream: true });
      return response.ok({
        body: observableIntoEventSourceStream(promptResponse$, {
          logger,
          signal: getRequestAbortedSignal(request),
        }),
      });
    }
  );
}
