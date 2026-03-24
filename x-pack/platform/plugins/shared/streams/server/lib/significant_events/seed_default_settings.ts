/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ModelSettingsConfigService } from '../saved_objects/significant_events/model_settings_config_service';
import { DEFAULT_CONNECTOR_IDS } from './constants';

export const seedDefaultSettings = async ({
  soClient,
  esClient,
  modelSettingsConfigService,
  logger,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  modelSettingsConfigService: ModelSettingsConfigService;
  logger: Logger;
}): Promise<void> => {
  const client = modelSettingsConfigService.getClient({ soClient });
  const currentSettings = await client.getSettings();

  if (
    currentSettings.connectorIdKnowledgeIndicatorExtraction ||
    currentSettings.connectorIdRuleGeneration ||
    currentSettings.connectorIdDiscovery
  ) {
    logger.debug('SigEvents connector settings already configured, skipping seed');
    return;
  }

  // EIS connectors are inference endpoints — fetch them directly from ES (no KibanaRequest needed).
  const { endpoints = [] } = await esClient.inference.get();
  const availableIds = new Set(
    endpoints.filter((ep) => ep.task_type === 'chat_completion').map((ep) => ep.inference_id)
  );

  const filteredSettings: {
    connectorIdKnowledgeIndicatorExtraction?: string;
    connectorIdRuleGeneration?: string;
    connectorIdDiscovery?: string;
  } = {};

  if (availableIds.has(DEFAULT_CONNECTOR_IDS.knowledgeIndicatorExtraction)) {
    filteredSettings.connectorIdKnowledgeIndicatorExtraction =
      DEFAULT_CONNECTOR_IDS.knowledgeIndicatorExtraction;
  }
  if (availableIds.has(DEFAULT_CONNECTOR_IDS.ruleGeneration)) {
    filteredSettings.connectorIdRuleGeneration = DEFAULT_CONNECTOR_IDS.ruleGeneration;
  }
  if (availableIds.has(DEFAULT_CONNECTOR_IDS.discovery)) {
    filteredSettings.connectorIdDiscovery = DEFAULT_CONNECTOR_IDS.discovery;
  }

  if (Object.keys(filteredSettings).length === 0) {
    logger.debug('No desired SigEvents connectors available in this environment, skipping seed');
    return;
  }

  await client.updateSettings(filteredSettings);
  logger.info(
    `Seeded default SigEvents connector settings: ${Object.keys(filteredSettings).join(', ')}`
  );
};
