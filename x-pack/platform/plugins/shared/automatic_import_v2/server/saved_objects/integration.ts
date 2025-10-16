/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsType } from "@kbn/core/server";
import { integrationSchemaV1 } from "./schemas/integration_schema";
import { AUTOMATIC_IMPORT_INTEGRATION_SAVED_OBJECT_TYPE } from "./constants";

export const integrationSavedObjectType: SavedObjectsType = {
  name: AUTOMATIC_IMPORT_INTEGRATION_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: "multiple-isolated",
  mappings: {
    dynamic: false,
    properties: {
      integration_id: { type: "keyword" },
      data_stream_count: { type: "integer" },
      status: { type: "keyword" },
      metadata: {
        type: "object",
        properties: {
          title: { type: 'keyword', index: false },
          description: { type: 'text', index: false },
          updated_at: { type: 'date', index: false },
          created_at: { type: 'date', index: false },
        },
      },
    }
  },
  management: {
    icon: "integration",
    defaultSearchField: "integration_id",
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.integration_id;
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: integrationSchemaV1.extends({}, { unknowns: "ignore" }),
        create: integrationSchemaV1,
      },
    },
  },
}

