/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsClientContract, SavedObjectsServiceSetup } from '@kbn/core/server';
import { CloudDataAttributes } from '../../common/types';
import { CLOUD_DATA_SAVED_OBJECT_ID } from '../routes/constants';

export const CLOUD_DATA_SAVED_OBJECT_TYPE = 'cloud' as const;

export function setupSavedObjects(savedObjects: SavedObjectsServiceSetup, logger: Logger) {
  savedObjects.registerType({
    name: CLOUD_DATA_SAVED_OBJECT_TYPE,
    hidden: true,
    hiddenFromHttpApis: true,
    namespaceType: 'agnostic',
    mappings: {
      dynamic: false,
      properties: {},
    },
    management: {
      importableAndExportable: false,
    },
    modelVersions: {},
  });
}

// needs a client with permissions to read the cloud data saved object
export async function getOnboardingToken(
  savedObjectsClient: SavedObjectsClientContract
): Promise<string | null> {
  let cloudDataSo = null;
  try {
    cloudDataSo = await savedObjectsClient.get<CloudDataAttributes>(
      CLOUD_DATA_SAVED_OBJECT_TYPE,
      CLOUD_DATA_SAVED_OBJECT_ID
    );
  } catch (error) {
    cloudDataSo = null;
  }
  return cloudDataSo?.attributes.onboardingData?.token || null;
}
