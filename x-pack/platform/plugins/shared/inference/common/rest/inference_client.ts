/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { BoundOptions, InferenceClient, InferenceConnector } from '@kbn/inference-common';
import { createInferenceRequestError, createInferenceInternalError } from '@kbn/inference-common';
import { createChatCompleteRestApi } from './chat_complete';
import { createPromptRestApi } from './prompt';
import { createOutputApi } from '../output';
import { bindClient } from '../inference_client/bind_client';

export function createInferenceRestClient({
  fetch,
  signal,
}: {
  fetch: HttpHandler;
  signal?: AbortSignal;
}): InferenceClient {
  const chatComplete = createChatCompleteRestApi({ fetch, signal });

  const client: InferenceClient = {
    on: () => {
      throw createInferenceInternalError(`on() is not supported on inference rest client`);
    },
    bindTo: (options: BoundOptions) => {
      return bindClient(client, options);
    },
    chatComplete,
    prompt: createPromptRestApi({ fetch, signal }),
    output: createOutputApi(chatComplete),
    getConnectorById: async (connectorId: string) => {
      return fetch<{ connectors: InferenceConnector[] }>('/internal/inference/connectors', {
        method: 'GET',
        signal,
      }).then(({ connectors }) => {
        const matchingConnector = connectors.find(
          (connector) => connector.connectorId === connectorId
        );

        if (!matchingConnector) {
          throw createInferenceRequestError(`No connector found for id '${connectorId}'`, 404);
        }
        return matchingConnector;
      });
    },
  };
  return client;
}
