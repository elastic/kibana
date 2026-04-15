/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const apiKeyToInvalidateSchemaV1 = schema.object({
  apiKeyId: schema.string(),
  createdAt: schema.string(),
});

// Added here as well because alerting and task_manager invalidate tasks are sharing the same saved object type
export const apiKeyToInvalidateSchemaV2 = schema.object({
  apiKeyId: schema.string(),
  createdAt: schema.string(),
  uiamApiKey: schema.maybe(schema.string()),
});

export type ApiKeyToInvalidate = TypeOf<typeof apiKeyToInvalidateSchemaV2>;
