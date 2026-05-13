/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const backgroundTaskNodeSchemaV1 = schema.object({
  id: schema.string(),
  last_seen: schema.string(),
});

export const backgroundTaskNodeSchemaV2 = schema.object({
  id: schema.string(),
  last_seen: schema.string(),
  address: schema.maybe(schema.string()),
});

export type BackgroundTaskNode = TypeOf<typeof backgroundTaskNodeSchemaV2>;
