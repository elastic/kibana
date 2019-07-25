/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { SpacesClient } from '../../spaces_client';
import { CopyToSpaceError } from '../types';

export async function canImportIntoSpace(
  spaceId: string,
  spacesClient: SpacesClient,
  savedObjectsClient: SavedObjectsClientContract
): Promise<{ canImport: boolean; reason: undefined | CopyToSpaceError['error']['type'] }> {
  try {
    const [, canManage] = await Promise.all([
      spacesClient.get(spaceId),
      spacesClient.canManageSavedObjects(spaceId),
    ]);

    return {
      canImport: canManage,
      reason: canManage ? undefined : 'unauthorized_to_manage_saved_objects',
    };
  } catch (error) {
    const isNotFoundError = savedObjectsClient.errors.isNotFoundError(error);
    const isUnauthorizedToAccessSpaceError = error.isBoom && error.output.statusCode === 403;
    if (isNotFoundError || isUnauthorizedToAccessSpaceError) {
      return {
        canImport: false,
        reason: 'space_not_found',
      };
    }
    throw error;
  }
}
