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
      // Well above any realm-qualified username (e.g. a SAML NameID or LDAP DN). An unindexed
      // value would make the `list` filter treat the report as legacy, username-owned.
      ignore_above: 1024,
    },
    createdByApiKeyId: {
      type: 'keyword',
      ignore_above: 1024,
    },
  },
};
