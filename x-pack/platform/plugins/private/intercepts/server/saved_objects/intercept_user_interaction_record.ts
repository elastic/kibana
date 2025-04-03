/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType, SavedObjectsFieldMapping } from '@kbn/core/server';

interface TriggerMetaData {
  lastInteractedInterceptId: number;
}

export interface InterceptInteractionUserRecordAttributes {
  userId: string;
  triggerId: string; // id of the trigger that the user interacted with
  metadata: TriggerMetaData;
}

type InterceptInteractionUserRecordSavedObjectProperties = Record<
  keyof InterceptInteractionUserRecordAttributes,
  SavedObjectsFieldMapping
>;

const interceptInteractionUserRecordProperties: InterceptInteractionUserRecordSavedObjectProperties =
  {
    userId: {
      type: 'keyword',
    },
    triggerId: {
      type: 'keyword',
    },
    metadata: {
      type: 'object',
      dynamic: false,
    },
  };

const interceptInteractionV1 = schema.object({
  userId: schema.string(),
  triggerId: schema.string(),
  metadata: schema.object(
    {
      lastInteractedInterceptId: schema.number(),
    },
    { unknowns: 'allow' }
  ),
});

export const interceptInteractionUserRecordSavedObject: SavedObjectsType = {
  name: 'intercept_interaction_record',
  hidden: true,
  hiddenFromHttpApis: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: interceptInteractionUserRecordProperties,
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: interceptInteractionV1.extends({}, { unknowns: 'ignore' }),
        create: interceptInteractionV1,
      },
    },
  },
};
