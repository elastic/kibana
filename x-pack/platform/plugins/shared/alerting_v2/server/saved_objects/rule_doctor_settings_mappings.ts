/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core-saved-objects-server';

export const ruleDoctorSettingsMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    scheduleEnabled: { type: 'boolean' },
    scheduleType: { type: 'keyword' },
  },
};
