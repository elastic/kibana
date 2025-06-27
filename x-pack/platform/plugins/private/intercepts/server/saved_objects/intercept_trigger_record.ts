/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsType, SavedObjectsFieldMapping } from '@kbn/core/server';
import type { InferObjectSchema } from './types';

const interceptTriggerV1 = schema.object({
  firstRegisteredAt: schema.string(),
  /**
   * The interval at which the intercept should be displayed to the user.
   */
  triggerAfter: schema.string(),
  /**
   * The version of kibana where this intercept trigger was installed.
   */
  installedOn: schema.string(),
  /**
   * Flag to denote if the trigger should run in perpetuity or not. set to false for a trigger that should run only once.
   */
  recurrent: schema.boolean(),
});

export type InterceptTriggerRecord = InferObjectSchema<typeof interceptTriggerV1>;

type InterceptTriggerSavedObjectProperties = Record<
  keyof InterceptTriggerRecord,
  SavedObjectsFieldMapping
>;

const interceptTriggerProperties: InterceptTriggerSavedObjectProperties = {
  firstRegisteredAt: {
    type: 'date',
  },
  triggerAfter: {
    type: 'text',
  },
  installedOn: {
    type: 'keyword',
  },
  recurrent: {
    type: 'boolean',
  },
};

export const interceptTriggerRecordSavedObject: SavedObjectsType<InterceptTriggerRecord> = {
  name: 'intercept_trigger_record',
  hidden: true,
  hiddenFromHttpApis: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: interceptTriggerProperties,
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: interceptTriggerV1.extends({}, { unknowns: 'ignore' }),
        create: interceptTriggerV1,
      },
    },
  },
};
