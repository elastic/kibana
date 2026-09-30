/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { casesSchema as casesSchemaV10 } from './v10';

/**
 * settings gains the optional `extractObservablesSource` keyword field that records
 * which override path set the extractObservables value at case-creation time.
 */
export const casesSchema = casesSchemaV10.extends({
  settings: schema.object({
    syncAlerts: schema.maybe(schema.boolean()),
    extractObservables: schema.maybe(schema.boolean()),
    extractObservablesSource: schema.maybe(schema.string({ maxLength: 32 })),
  }),
});
