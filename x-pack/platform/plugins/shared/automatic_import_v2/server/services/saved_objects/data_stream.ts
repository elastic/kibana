/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { dataStreamSchemaV1 } from './schemas/data_stream_schema';
import { DATA_STREAM_SAVED_OBJECT_TYPE } from './constants';

export const dataStreamSavedObjectType: SavedObjectsType = {
  name: DATA_STREAM_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      data_stream_id: {
        // Unique identifier for this data_stream
        type: 'keyword',
      },
      integration_id: {
        // Foreign key to parent integration
        type: 'keyword',
      },
      created_by: {
        type: 'keyword',
      },
      job_info: {
        type: 'nested',
        properties: {
          job_id: {
            type: 'keyword',
          },
          job_type: {
            type: 'keyword',
          },
          status: {
            type: 'keyword',
          },
        },
      },
      metadata: {
        properties: {
          // sample_count , version , created_at etc.,
        },
      },
      result: {
        properties: {
          // ingest_pipeline , field_mapping etc.,
        },
      },
    },
  },
  management: {
    icon: 'data_stream',
    defaultSearchField: 'data_stream_id',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.data_stream_id;
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: dataStreamSchemaV1.extends({}, { unknowns: 'ignore' }),
        create: dataStreamSchemaV1,
      },
    },
  },
};
