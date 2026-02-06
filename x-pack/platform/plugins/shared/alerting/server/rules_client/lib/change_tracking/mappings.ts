/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mappings, type MappingsDefinition } from '@kbn/es-mappings';

/**
 * Elasticsearch mappings for change history documents.
 * Uses flattened type for variable structure fields (oldvalues, snapshot, metadata).
 */
export const changeHistoryMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date(),

    user: mappings.object({
      properties: {
        id: mappings.keyword(),
        name: mappings.keyword(),
      },
    }),

    event: mappings.object({
      properties: {
        id: mappings.keyword(),
        module: mappings.keyword(),
        dataset: mappings.keyword(),
        action: mappings.keyword(),
        type: mappings.keyword(),
        outcome: mappings.keyword(),
        reason: mappings.text(),
        group: mappings.object({
          properties: {
            id: mappings.keyword(),
          },
        }),
      },
    }),

    object: mappings.object({
      properties: {
        id: mappings.keyword(),
        type: mappings.keyword(),
        hash: mappings.keyword(),
        changes: mappings.keyword(),
        oldvalues: mappings.object({ properties: {} }), // mappings.flattened(),
        snapshot: mappings.object({ properties: {} }), // mappings.flattened(),
      },
    }),

    // metadata: mappings.flattened(),
    metadata: mappings.object({
      properties: {},
    }),

    kibana: mappings.object({
      properties: {
        space_id: mappings.keyword(),
        version: mappings.keyword(),
      },
    }),
  },
} satisfies MappingsDefinition;
