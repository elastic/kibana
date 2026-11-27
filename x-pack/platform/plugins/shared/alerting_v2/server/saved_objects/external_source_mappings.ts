/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core-saved-objects-server';

/**
 * Mappings for the external source saved object.
 * For the full list of attributes, see ./schemas/external_source_attributes/v1.ts
 */
export const externalSourceMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    type: { type: 'keyword', ignore_above: 256 },
    kind: { type: 'keyword', ignore_above: 256 },
    metadata: {
      properties: {
        name: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
        description: { type: 'text' },
        tags: { type: 'keyword', ignore_above: 128 },
        routing_tags: { type: 'keyword', ignore_above: 128 },
      },
    },
  },
};
