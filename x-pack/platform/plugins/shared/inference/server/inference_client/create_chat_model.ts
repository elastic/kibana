/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { InferenceChatModel, type InferenceChatModelParams } from '@kbn/inference-langchain';
import { getConnectorById } from '../util/get_connector_by_id';
import { createClient } from './create_client';

export interface CreateChatModelOptions {
  request: KibanaRequest;
  connectorId: string;
  actions: ActionsPluginStart;
  logger: Logger;
  chatModelOptions: Omit<InferenceChatModelParams, 'connector' | 'chatComplete' | 'logger'>;
}

export const createChatModel = async ({
  request,
  connectorId,
  actions,
  logger,
  chatModelOptions,
}: CreateChatModelOptions): Promise<InferenceChatModel> => {
  const client = createClient({
    actions,
    request,
    logger,
  });
  const actionsClient = await actions.getActionsClientWithRequest(request);
  const connector = await getConnectorById({ connectorId, actionsClient });

  return new InferenceChatModel({
    ...chatModelOptions,
    chatComplete: client.chatComplete,
    connector,
    logger,
  });
};
