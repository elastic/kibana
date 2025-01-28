/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsCreateOptions,
  SavedObject,
} from '@kbn/core/server';
import { MaintenanceWindowAttributes } from '../types';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '../../../../common';

export interface CreateMaintenanceWindowSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  maintenanceWindowAttributes: MaintenanceWindowAttributes;
  savedObjectsCreateOptions?: SavedObjectsCreateOptions;
}

export const createMaintenanceWindowSo = (
  params: CreateMaintenanceWindowSoParams
): Promise<SavedObject<MaintenanceWindowAttributes>> => {
  const { savedObjectsClient, maintenanceWindowAttributes, savedObjectsCreateOptions } = params;

  return savedObjectsClient.create<MaintenanceWindowAttributes>(
    MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
    maintenanceWindowAttributes,
    savedObjectsCreateOptions
  );
};
