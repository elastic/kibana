/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core/server';

export const workplaceConnectorMappings: SavedObjectsTypeMappingDefinition = {
  properties: {
    name: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    type: {
      type: 'keyword',
    },
    config: {
      type: 'object',
      enabled: false,
    },
    secrets: {
      type: 'binary',
    },
    createdAt: {
      type: 'date',
    },
    updatedAt: {
      type: 'date',
    },
    workflowId: {
      type: 'keyword',
    },
    // New fields for multi-feature support
    features: {
      type: 'keyword',
    },
    workflowIds: {
      type: 'keyword',
    },
    toolIds: {
      type: 'keyword',
    },
    kscIds: {
      type: 'keyword',
    },
  },
};
