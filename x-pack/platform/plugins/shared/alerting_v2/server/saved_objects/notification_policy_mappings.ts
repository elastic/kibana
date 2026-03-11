/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core-saved-objects-server';

/**
 * Mappings for the notification policy saved object.
 */
export const notificationPolicyMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    name: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
    description: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
    destinations: {
      type: 'object',
      properties: {
        type: { type: 'keyword' },
        id: { type: 'keyword' },
      },
    },
    auth: {
      type: 'object',
      properties: {
        apiKey: { type: 'binary' },
        owner: { type: 'keyword' },
        createdByUser: { type: 'boolean' },
      },
    },
    createdBy: { type: 'keyword' },
    createdAt: { type: 'date' },
    updatedBy: { type: 'keyword' },
    updatedAt: { type: 'date' },
  },
};
