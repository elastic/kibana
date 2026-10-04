/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { INTEGRATION_SAVED_OBJECT_TYPE } from './services/saved_objects/constants';

/**
 * Returns whether an Automatic Import integration-config saved object exists
 * in the given space. Uses the caller-supplied client so Fleet can pass the
 * plugin's internal repository and skip upload-user Automatic Import privileges.
 */
export async function hasIntegration(
  savedObjectsClient: SavedObjectsClientContract,
  integrationId: string,
  spaceId: string
): Promise<boolean> {
  try {
    await savedObjectsClient.get(INTEGRATION_SAVED_OBJECT_TYPE, integrationId, {
      namespace: spaceId,
    });
    return true;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
}
