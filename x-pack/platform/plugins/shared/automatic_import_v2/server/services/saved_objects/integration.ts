/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { integrationSchemaV1, integrationSchemaV2 } from './schemas/integration_schema';
import { INTEGRATION_SAVED_OBJECT_TYPE } from './constants';

export const integrationSavedObjectType: SavedObjectsType = {
  name: INTEGRATION_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      integration_id: { type: 'keyword' },
      // Deprecated: kept for backwards compatibility with existing saved objects.
      data_stream_count: { type: 'integer' },
      created_by: { type: 'keyword' },
      created_by_profile_uid: { type: 'keyword' },
      // Deprecated: status is now derived from data streams. Kept for backward compatibility.
      status: { type: 'keyword' },
      metadata: {
        properties: {
          // version , description , created_at etc.,
        },
      },
    },
  },
  management: {
    icon: 'integration',
    defaultSearchField: 'integration_id',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.integration_id;
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: integrationSchemaV1.extends({}, { unknowns: 'ignore' }),
        create: integrationSchemaV1,
      },
    },
    2: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            created_by_profile_uid: { type: 'keyword' },
          },
        },
        {
          type: 'mappings_deprecation',
          deprecatedMappings: ['data_stream_count', 'status'],
        },
      ],
      schemas: {
        forwardCompatibility: integrationSchemaV2.extends({}, { unknowns: 'ignore' }),
        create: integrationSchemaV2,
      },
    },
  },
};
