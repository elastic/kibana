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
      // Required on new keyword fields. Well above any realm-qualified username (e.g. a SAML
      // NameID or LDAP DN); a longer id would be left out of the index, and the `list` filter
      // reads an absent id as a legacy, username-owned report.
      ignore_above: 1024,
    },
    createdByApiKeyId: {
      type: 'keyword',
      ignore_above: 1024,
    },
  },
};
