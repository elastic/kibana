/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, SavedObjectsBulkResponse } from '@kbn/core/server';
import { MaintenanceWindowAttributes } from '../types';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '../../../../common';

export interface BulkGetMaintenanceWindowObject {
  id: string;
}

export interface BulkGetMaintenanceWindowSoParams {
  objects: BulkGetMaintenanceWindowObject[];
  savedObjectsClient: SavedObjectsClientContract;
}

export const bulkGetMaintenanceWindowSo = (
  params: BulkGetMaintenanceWindowSoParams
): Promise<SavedObjectsBulkResponse<MaintenanceWindowAttributes>> => {
  const { objects, savedObjectsClient } = params;

  return savedObjectsClient.bulkGet<MaintenanceWindowAttributes>(
    objects.map((object) => ({
      id: object.id,
      type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
    }))
  );
};
