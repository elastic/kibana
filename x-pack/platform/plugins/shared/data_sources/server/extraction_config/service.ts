/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { EXTRACTION_CONFIG_SO_TYPE, EXTRACTION_CONFIG_SO_ID } from './saved_object';
import type { ExtractionConfigAttributes, ExtractionGlobalConfig } from './types';

export const DEFAULT_EXTRACTION_CONFIG: ExtractionGlobalConfig = {
  method: 'tika',
};

export async function getExtractionConfig(
  savedObjectsClient: SavedObjectsClientContract
): Promise<ExtractionGlobalConfig> {
  try {
    const so = await savedObjectsClient.get<ExtractionConfigAttributes>(
      EXTRACTION_CONFIG_SO_TYPE,
      EXTRACTION_CONFIG_SO_ID
    );
    return {
      method: so.attributes.method,
      inferenceId: so.attributes.inferenceId,
      workflowId: so.attributes.workflowId,
      connectorId: so.attributes.connectorId,
      formatOverrides: so.attributes.formatOverrides,
    };
  } catch (err: unknown) {
    const statusCode = (err as { output?: { statusCode?: number } })?.output?.statusCode;
    if (statusCode === 404) {
      return DEFAULT_EXTRACTION_CONFIG;
    }
    throw err;
  }
}

export async function updateExtractionConfig(
  savedObjectsClient: SavedObjectsClientContract,
  config: ExtractionGlobalConfig
): Promise<ExtractionGlobalConfig> {
  const attributes: ExtractionConfigAttributes = {
    method: config.method,
    inferenceId: config.inferenceId,
    workflowId: config.workflowId,
    connectorId: config.connectorId,
    formatOverrides: config.formatOverrides,
  };

  await savedObjectsClient.create<ExtractionConfigAttributes>(
    EXTRACTION_CONFIG_SO_TYPE,
    attributes,
    { id: EXTRACTION_CONFIG_SO_ID, overwrite: true }
  );

  return config;
}
