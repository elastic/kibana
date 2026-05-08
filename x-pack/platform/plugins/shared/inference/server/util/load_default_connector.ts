/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  ElasticsearchClient,
  Logger,
  IUiSettingsClient,
} from '@kbn/core/server';
import type { InferenceConnector } from '@kbn/inference-common';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import type { ActionsClientProvider } from '../types';
import { getConnectorById } from './get_connector_by_id';
import { getConnectorList } from './get_connector_list';

const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

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
}): Promise<InferenceConnector | undefined> => {
  const [defaultConnectorId, defaultOnly] = await Promise.all([
    uiSettingsClient.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR, { request }),
    uiSettingsClient.get<boolean>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY, { request }),
  ]);

  if (defaultConnectorId && defaultConnectorId !== NO_DEFAULT_CONNECTOR) {
    try {
      return await getConnectorById({
        connectorId: defaultConnectorId,
        actions,
        request,
        esClient,
        logger,
      });
    } catch {
      // configured default doesn't exist, fall through
    }
  }

  if (defaultOnly) {
    return undefined;
  }

  try {
    return await getConnectorById({
      connectorId: defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION,
      actions,
      request,
      esClient,
      logger,
    });
  } catch {
    // kibana-wide default doesn't exist, fall through
  }

  const connectors = await getConnectorList({ actions, request, esClient, logger });
  return connectors.length > 0 ? connectors[0] : undefined;
};
