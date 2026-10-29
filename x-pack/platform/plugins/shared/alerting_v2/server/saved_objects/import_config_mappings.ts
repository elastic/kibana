/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core-saved-objects-server';

/**
 * Mappings for the import config saved object.
 * For the full list of attributes, see ./schemas/import_config_attributes/v1.ts
 */
export const importConfigMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    name: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
    description: { type: 'text' },
    kind: { type: 'keyword', ignore_above: 64 },
    enabled: { type: 'boolean' },
    source: { type: 'keyword', ignore_above: 256 },
    connector_id: { type: 'keyword', ignore_above: 256 },
    workflow_id: { type: 'keyword', ignore_above: 256 },
    tags: { type: 'keyword', ignore_above: 128 },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
  },
};
