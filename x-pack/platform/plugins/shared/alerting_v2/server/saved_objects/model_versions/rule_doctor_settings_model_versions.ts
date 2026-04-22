/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { ruleDoctorSettingsAttributesSchemaV1 } from '../schemas/rule_doctor_settings_attributes';

export const ruleDoctorSettingsModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: ruleDoctorSettingsAttributesSchemaV1.extends(
        {},
        { unknowns: 'ignore' }
      ),
      create: ruleDoctorSettingsAttributesSchemaV1,
    },
  },
};
