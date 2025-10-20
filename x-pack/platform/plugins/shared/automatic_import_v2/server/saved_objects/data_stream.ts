/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsType } from "@kbn/core/server";
import { dataStreamSchemaV1 } from "./schemas/data_stream_schema";
import { DATA_STREAM_SAVED_OBJECT_TYPE } from "./constants";

export const dataStreamSavedObjectType: SavedObjectsType = {
  name: DATA_STREAM_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: "multiple-isolated",
  mappings: {
    dynamic: false,
    properties: {
      data_stream_id: {
        // Unique identifier for this data_stream
        type: "keyword",
      },
      integration_id: {
        // Foreign key to parent integration
        type: "keyword",
      },
      job_info: {
        type: "nested",
        properties: {
          job_id: {
            type: "keyword",
          },
          job_type: {
            type: "keyword",
          },
          status: {
            type: "keyword",
          },
        },
      },
      metadata: {
        properties: {
          sample_count: { type: 'integer', index: false },
          version: { type: 'integer', index: false },
          created_at: { type: 'date', index: false },
        },
      },
      result: {
        properties: {
          ingest_pipeline: {
            type: 'text', index: false,
          },
          field_mapping: {
            type: "flattened",
            index: false,
          },
        },
      },
    }
  },
  management: {
    icon: "data_stream",
    defaultSearchField: "data_stream_id",
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.data_stream_id;
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: dataStreamSchemaV1.extends({}, { unknowns: "ignore" }),
        create: dataStreamSchemaV1,
      },
    },
  },
}
