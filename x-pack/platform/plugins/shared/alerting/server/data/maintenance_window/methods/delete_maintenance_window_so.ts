/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, SavedObjectsDeleteOptions } from '@kbn/core/server';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '../../../../common';

export interface DeleteMaintenanceWindowSoParams {
  id: string;
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectsDeleteOptions?: SavedObjectsDeleteOptions;
}

export const deleteMaintenanceWindowSo = (params: DeleteMaintenanceWindowSoParams): Promise<{}> => {
  const { id, savedObjectsClient, savedObjectsDeleteOptions } = params;

  return savedObjectsClient.delete(
    MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
    id,
    savedObjectsDeleteOptions
  );
};
