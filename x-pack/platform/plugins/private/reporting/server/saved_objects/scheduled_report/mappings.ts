/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core/server';

export const scheduledReportMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    title: {
      type: 'text',
    },
    createdBy: {
      type: 'keyword',
    },
    createdById: {
      type: 'keyword',
      // Oversized realm-qualified IDs are hashed before storage so they remain indexed and cannot
      // be mistaken for legacy documents by the ownership filter.
      ignore_above: 1024,
    },
    createdByApiKeyId: {
      type: 'keyword',
      ignore_above: 1024,
    },
  },
};
