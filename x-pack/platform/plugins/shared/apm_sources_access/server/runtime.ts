/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { APMSourcesAccessConfig } from '../common/config_schema';
import { getApmIndicesSavedObject } from './saved_objects/apm_indices';

/**
 * Resolves the APM indices: the ones of the configuration file, overridden by the ones saved in
 * the APM settings. Shared by the plugin's `server` entry and its tasks entry.
 */
export const createGetApmIndices =
  (config: APMSourcesAccessConfig) => async (savedObjectsClient: SavedObjectsClientContract) => {
    const apmIndicesFromSavedObject = await getApmIndicesSavedObject(savedObjectsClient);
    return { ...config.indices, ...apmIndicesFromSavedObject };
  };

export const createApmSourcesServices = (config: APMSourcesAccessConfig) => ({
  apmIndicesFromConfigFile: config.indices,
  getApmIndices: createGetApmIndices(config),
});
