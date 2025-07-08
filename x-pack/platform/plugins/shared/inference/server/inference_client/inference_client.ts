/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { InferenceClient } from '@kbn/inference-common';
import { AnonymizationRule } from '@kbn/inference-common';
import { ElasticsearchClient } from '@kbn/core/server';
import { createChatCompleteApi } from '../chat_complete';
import { createOutputApi } from '../../common/output/create_output_api';
import { getConnectorById } from '../util/get_connector_by_id';
import { createPromptApi } from '../prompt';

export function createInferenceClient({
  request,
  actions,
  logger,
  anonymizationRulesPromise,
  esClient,
}: {
  request: KibanaRequest;
  logger: Logger;
  actions: ActionsPluginStart;
  anonymizationRulesPromise: Promise<AnonymizationRule[]>;
  esClient: ElasticsearchClient;
}): InferenceClient {
  const chatComplete = createChatCompleteApi({
    request,
    actions,
    logger,
    anonymizationRulesPromise,
    esClient,
  });
  return {
    chatComplete,
    prompt: createPromptApi({ request, actions, logger, anonymizationRulesPromise, esClient }),
    output: createOutputApi(chatComplete),
    getConnectorById: async (connectorId: string) => {
      const actionsClient = await actions.getActionsClientWithRequest(request);
      return await getConnectorById({ connectorId, actionsClient });
    },
  };
}
