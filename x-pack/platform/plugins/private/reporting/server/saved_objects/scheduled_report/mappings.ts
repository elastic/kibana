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
      // Generous bound: the value can embed a realm-qualified username (e.g. SAML NameIDs or
      // LDAP DNs), and the ownership `list` filter relies on this field being indexed.
      ignore_above: 1024,
    },
  },
};
