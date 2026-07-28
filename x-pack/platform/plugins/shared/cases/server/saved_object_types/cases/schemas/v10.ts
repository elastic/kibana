/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { casesSchema as casesSchemaV9 } from './v9';

/**
 * Assignees gain the optional `username`, `full_name` and `email` identity
 * fields alongside `uid`, matching the new mapping
 */
const AssigneeSchema = schema.object({
  uid: schema.string(),
  username: schema.maybe(schema.nullable(schema.string())),
  full_name: schema.maybe(schema.nullable(schema.string())),
  email: schema.maybe(schema.nullable(schema.string())),
});

export const casesSchema = casesSchemaV9.extends({
  assignees: schema.arrayOf(AssigneeSchema),
});
