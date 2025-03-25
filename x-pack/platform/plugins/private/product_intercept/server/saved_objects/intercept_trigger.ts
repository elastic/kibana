/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsType, SavedObjectsFieldMapping } from '@kbn/core/server';

export interface InterceptTriggerRecord {
  firstRegisteredAt: string;
  /**
   * The interval at which the intercept should be displayed to the user.
   */
  triggerInterval: string;
  installedOn: string;
}

type InterceptTriggerSavedObjectProperties = Record<
  keyof InterceptTriggerRecord,
  SavedObjectsFieldMapping
>;

const interceptTriggerProperties: InterceptTriggerSavedObjectProperties = {
  firstRegisteredAt: {
    type: 'date',
  },
  triggerInterval: {
    type: 'text',
  },
  installedOn: {
    type: 'keyword',
  },
};

const interceptTriggerV1 = schema.object({
  firstRegisteredAt: schema.string(),
  triggerInterval: schema.string(),
  installedOn: schema.string(),
});

export const interceptTriggerRecordSavedObject: SavedObjectsType<InterceptTriggerRecord> = {
  name: 'intercept_trigger',
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
