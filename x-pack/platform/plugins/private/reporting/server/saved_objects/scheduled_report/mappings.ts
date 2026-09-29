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
    // Deliberately unbounded, like `createdBy` which they are derived from: an `ignore_above`
    // value would leave the id out of the index, and the `list` filter reads an absent id as a
    // legacy, username-owned report.
    createdById: {
      type: 'keyword',
    },
    createdByApiKeyId: {
      type: 'keyword',
    },
  },
};
