/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const configurationSchema = schema.object({
  workflow_id: schema.string(),
  wait_for_completion: schema.maybe(schema.boolean()),
});

export const configurationUpdateSchema = schema.object({
  workflow_id: schema.maybe(schema.string()),
  wait_for_completion: schema.maybe(schema.boolean()),
});
