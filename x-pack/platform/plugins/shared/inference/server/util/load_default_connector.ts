/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { InferenceConnector } from '@kbn/inference-common';
import { getDefaultConnector } from '../../common/utils/get_default_connector';
import { getConnectorList } from './get_connector_list';

export const loadDefaultConnector = async ({
  actions,
  request,
  esClient,
  logger
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<InferenceConnector> => {
  const connectors = await getConnectorList({ actions, request, esClient, logger });
  return getDefaultConnector({ connectors });
};
