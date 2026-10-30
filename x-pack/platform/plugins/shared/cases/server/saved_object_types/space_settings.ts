/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';
import {
  CASES_SPACE_SETTINGS_SAVED_OBJECT,
  MAX_CASE_STATUSES,
  MAX_CASE_STATUS_KEY_LENGTH,
  MAX_CASE_STATUS_LABEL_LENGTH,
} from '../../common/constants';

const caseStatusDefinitionSchema = schema.object({
  key: schema.string({ minLength: 1, maxLength: MAX_CASE_STATUS_KEY_LENGTH }),
  label: schema.string({ minLength: 1, maxLength: MAX_CASE_STATUS_LABEL_LENGTH }),
  // The zod contract checks the allowed values; the stored schema only bounds them.
  color: schema.string({ maxLength: 32 }),
  category: schema.string({ maxLength: 32 }),
  order: schema.number({ min: 0 }),
  isDefault: schema.boolean(),
  disabled: schema.boolean(),
});

const spaceSettingsSchemaV1 = schema.object({
  statuses: schema.arrayOf(caseStatusDefinitionSchema, { maxSize: MAX_CASE_STATUSES }),
});

/**
 * Space-level Cases settings: one document per space. Nothing searches its content, so the
 * attributes stay unmapped.
 */
export const casesSpaceSettingsSavedObjectType: SavedObjectsType = {
  name: CASES_SPACE_SETTINGS_SAVED_OBJECT,
  indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {},
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: spaceSettingsSchemaV1,
        forwardCompatibility: spaceSettingsSchemaV1.extends({}, { unknowns: 'ignore' }),
      },
    },
  },
};
