/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { BoundOptions, InferenceClient } from '@kbn/inference-common';
import type { AnonymizationRule } from '@kbn/inference-common';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { InferenceCallbacks } from '@kbn/inference-common/src/chat_complete';
import { createChatCompleteApi } from '../chat_complete';
import { createOutputApi } from '../../common/output/create_output_api';
import { bindClient } from '../../common/inference_client/bind_client';
import { getConnectorById } from '../util/get_connector_by_id';
import { createPromptApi } from '../prompt';
import { createChatCompleteCallbackApi } from '../chat_complete/callback_api';
import type { RegexWorkerService } from '../chat_complete/anonymization/regex_worker_service';
import { createCallbackManager } from './callback_manager';

export function createInferenceClient({
  request,
  actions,
  logger,
  anonymizationRulesPromise,
  regexWorker,
  esClient,
  callbacks,
}: {
  request: KibanaRequest;
  logger: Logger;
  actions: ActionsPluginStart;
  anonymizationRulesPromise: Promise<AnonymizationRule[]>;
  regexWorker: RegexWorkerService;
  esClient: ElasticsearchClient;
  callbacks?: InferenceCallbacks;
}): InferenceClient {
  const callbackManager = createCallbackManager(callbacks);

  const callbackApi = createChatCompleteCallbackApi({
    request,
    actions,
    logger,
    anonymizationRulesPromise,
    regexWorker,
    esClient,
    callbackManager,
  });

  const chatComplete = createChatCompleteApi({
    callbackApi,
  });
  const output = createOutputApi(chatComplete);
  const prompt = createPromptApi({
    callbackApi,
  });

  const eventEmitter = callbackManager.asEventEmitter();

  const client: InferenceClient = {
    on: eventEmitter.on.bind(eventEmitter),
    chatComplete,
    output,
    prompt,
    getConnectorById: async (connectorId: string) => {
      return await getConnectorById({ connectorId, actions, request });
    },
    bindTo: (options: BoundOptions) => {
      return bindClient(client, options);
    },
  };

  return client;
}
