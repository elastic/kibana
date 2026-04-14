/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceSetup } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '../../common';
import { maintenanceWindowMappings } from './mapping';
import { maintenanceWindowModelVersions } from './model_versions';

export const registerSavedObject = (savedObjects: SavedObjectsServiceSetup) => {
  savedObjects.registerType(maintenanceWindowSavedObjectType);
};

export const maintenanceWindowSavedObjectType: SavedObjectsType = {
  name: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'multiple-isolated' as const,
  mappings: maintenanceWindowMappings,
  modelVersions: maintenanceWindowModelVersions,
};
