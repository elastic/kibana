/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { type FieldDefinition } from '../../../common/types/domain/field_definition/latest';
import { CASE_FIELD_DEFINITION_SAVED_OBJECT } from '../../../common/constants';

const mappings = {
  dynamic: false,
  properties: {
    fieldDefinitionId: {
      type: 'keyword',
    },
    name: {
      type: 'keyword',
    },
    definition: {
      type: 'text',
    },
    owner: {
      type: 'keyword',
    },
    description: {
      type: 'text',
    },
  },
} as const;

export const caseFieldDefinitionSavedObjectType: SavedObjectsType = {
  name: CASE_FIELD_DEFINITION_SAVED_OBJECT,
  indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings,
};

// NOTE: maintain type "connection" with Domain Schema
mappings.properties satisfies Record<keyof FieldDefinition, unknown>;
