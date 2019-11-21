/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
import { SavedObjectsLegacyService } from 'src/legacy/server/kbn_server';
import { callWithInternalUserFactory } from '../../client/call_with_internal_user_factory';

export interface MlTelemetry {
  file_data_visualizer: {
    index_creation_count: number;
  };
}

export interface MlTelemetrySavedObject {
  attributes: MlTelemetry;
}

export const ML_TELEMETRY_DOC_ID = 'ml-telemetry';

export function createMlTelemetry(count: number = 0): MlTelemetry {
  return {
    file_data_visualizer: {
      index_creation_count: count,
    },
  };
}
// savedObjects
export function storeMlTelemetry(
  elasticsearchPlugin: ElasticsearchPlugin,
  savedObjects: SavedObjectsLegacyService,
  mlTelemetry: MlTelemetry
): void {
  const savedObjectsClient = getSavedObjectsClient(elasticsearchPlugin, savedObjects);
  savedObjectsClient.create('ml-telemetry', mlTelemetry, {
    id: ML_TELEMETRY_DOC_ID,
    overwrite: true,
  });
}
// needs savedObjects and elasticsearchPlugin
export function getSavedObjectsClient(
  elasticsearchPlugin: ElasticsearchPlugin,
  savedObjects: SavedObjectsLegacyService
): any {
  const { SavedObjectsClient, getSavedObjectsRepository } = savedObjects;
  const callWithInternalUser = callWithInternalUserFactory(elasticsearchPlugin);
  const internalRepository = getSavedObjectsRepository(callWithInternalUser);
  return new SavedObjectsClient(internalRepository);
}

export async function incrementFileDataVisualizerIndexCreationCount(
  elasticsearchPlugin: ElasticsearchPlugin,
  savedObjects: SavedObjectsLegacyService
): Promise<void> {
  const savedObjectsClient = getSavedObjectsClient(elasticsearchPlugin, savedObjects);

  try {
    const { attributes } = await savedObjectsClient.get('telemetry', 'telemetry');
    if (attributes.enabled === false) {
      return;
    }
  } catch (error) {
    // if we aren't allowed to get the telemetry document,
    // we assume we couldn't opt in to telemetry and won't increment the index count.
    return;
  }

  let indicesCount = 1;

  try {
    const { attributes } = (await savedObjectsClient.get(
      'ml-telemetry',
      ML_TELEMETRY_DOC_ID
    )) as MlTelemetrySavedObject;
    indicesCount = attributes.file_data_visualizer.index_creation_count + 1;
  } catch (e) {
    /* silently fail, this will happen if the saved object doesn't exist yet. */
  }

  const mlTelemetry = createMlTelemetry(indicesCount);
  storeMlTelemetry(elasticsearchPlugin, savedObjects, mlTelemetry);
}
