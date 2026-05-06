/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, ElasticsearchClient, Logger, IUiSettingsClient } from '@kbn/core/server';
import type { InferenceConnector } from '@kbn/inference-common';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import type { ActionsClientProvider } from '../types';
import { getDefaultConnector } from '../../common/utils/get_default_connector';
import { getConnectorList } from './get_connector_list';

export const loadDefaultConnector = async ({
  actions,
  request,
  esClient,
  uiSettingsClient,
  logger,
}: {
  actions: ActionsClientProvider;
  request: KibanaRequest;
  esClient: ElasticsearchClient;
  uiSettingsClient: IUiSettingsClient;
  logger: Logger;
}): Promise<InferenceConnector> => {
  const [connectors, defaultConnectorId] = await Promise.all([
    getConnectorList({ actions, request, esClient, logger }),
    uiSettingsClient.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR, { request }),
  ]);
  return getDefaultConnector({ connectors, defaultConnectorId });
};
