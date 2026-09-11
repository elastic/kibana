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
      // Well above any realm-qualified username (e.g. a SAML NameID or LDAP DN). A value that did
      // exceed this would not be indexed, and the ownership `list` filter would then treat the
      // report as a legacy, username-owned document.
      ignore_above: 1024,
    },
  },
};
