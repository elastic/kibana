/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { CONNECTOR_SLOT_NAMES } from '../saved_objects/significant_events/model_settings_config';
import type { ConnectorSlotName } from '../saved_objects/significant_events/model_settings_config';
import type { ConnectorSlotUpdate } from '../saved_objects/significant_events/model_settings_config_client';
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
  const { connectors: currentConnectors } = await client.getSettingsWithSource();

  const slotsNeedingUpdate = CONNECTOR_SLOT_NAMES.filter(
    (slotName) => currentConnectors[slotName]?.source !== 'user'
  );

  if (slotsNeedingUpdate.length === 0) {
    logger.debug('All SigEvents connector slots are user-configured, skipping seed');
    return;
  }

  // EIS connectors are inference endpoints — fetch them directly from ES (no KibanaRequest needed).
  const { endpoints = [] } = await esClient.inference.get();
  const availableIds = new Set(
    endpoints.filter((ep) => ep.task_type === 'chat_completion').map((ep) => ep.inference_id)
  );

  const updates: Partial<Record<ConnectorSlotName, ConnectorSlotUpdate>> = {};
  const staleSlots: ConnectorSlotName[] = [];

  for (const slotName of slotsNeedingUpdate) {
    const defaultId = DEFAULT_CONNECTOR_IDS[slotName];
    const storedId = currentConnectors[slotName]?.id;

    if (storedId && !availableIds.has(storedId)) {
      // Stored ID is no longer available in EIS — stale
      if (availableIds.has(defaultId)) {
        updates[slotName] = { id: defaultId, source: 'system' };
      } else {
        staleSlots.push(slotName);
      }
    } else if (!storedId || storedId !== defaultId) {
      // Absent or pointing at something other than the current default
      if (availableIds.has(defaultId)) {
        updates[slotName] = { id: defaultId, source: 'system' };
      }
    }
    // else: storedId === defaultId and still available — nothing to do
  }

  if (staleSlots.length > 0) {
    logger.warn(
      `SigEvents connector slots have stale IDs with no available replacement: ${staleSlots.join(
        ', '
      )}`
    );
  }

  if (Object.keys(updates).length === 0) {
    logger.debug('No SigEvents connector updates needed');
    return;
  }

  await client.updateSettingsWithSource({ connectors: updates });
  logger.info(`Seeded default SigEvents connector settings: ${Object.keys(updates).join(', ')}`);
};
