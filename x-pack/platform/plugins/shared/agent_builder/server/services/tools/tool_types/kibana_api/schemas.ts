/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const kibanaApiOperationSchema = schema.object(
  {
    operation_id: schema.string(),
    method: schema.string(),
    path_template: schema.string(),
  },
  { unknowns: 'ignore' }
);

export const configurationSchema = schema.object({
  operations: schema.arrayOf(kibanaApiOperationSchema, { minSize: 1 }),
});

export const configurationUpdateSchema = schema.object({
  operations: schema.maybe(schema.arrayOf(kibanaApiOperationSchema, { minSize: 1 })),
});
