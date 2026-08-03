/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core-saved-objects-server';

/**
 * Mappings for the alerting v2 rule template saved object.
 * Only searchable fields that are declared on the create schema are mapped;
 * create-rule fields under `rule` stay opaque (Zod owns their validation).
 */
export const ruleTemplateMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    engine: { type: 'keyword', ignore_above: 1024 },
  },
};
