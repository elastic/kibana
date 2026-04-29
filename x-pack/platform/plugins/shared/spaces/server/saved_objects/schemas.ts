/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
// These fields are not searched or aggregated on
export const SpacesSavedObjectSchemas = {
  '8.8.0': schema.object({
    name: schema.string({ minLength: 1 }),
    description: schema.maybe(schema.string()),
    initials: schema.maybe(schema.string()),
    color: schema.maybe(schema.string()),
    disabledFeatures: schema.maybe(schema.arrayOf(schema.string())),
    imageUrl: schema.maybe(schema.string()),
    _reserved: schema.maybe(schema.boolean()),
  }),
};
