/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const taskManagerClaimNudgeSchemaV1 = schema.object({
  updated_at: schema.string(),
  nonce: schema.string(),
});

export type TaskManagerClaimNudge = TypeOf<typeof taskManagerClaimNudgeSchemaV1>;
