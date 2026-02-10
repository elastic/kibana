/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { Condition } from '@kbn/streamlang';
import { conditionSchema } from '@kbn/streamlang';
import {
  STREAM_NAME,
  SYSTEM_UUID,
  SYSTEM_DESCRIPTION,
  SYSTEM_FILTER,
  SYSTEM_NAME,
  SYSTEM_TYPE,
} from './fields';

export interface StoredSystem {
  [SYSTEM_TYPE]: 'system';
  [SYSTEM_UUID]: string;
  [SYSTEM_NAME]: string;
  [SYSTEM_DESCRIPTION]: string;
  [STREAM_NAME]: string;
  [SYSTEM_FILTER]?: Condition;
}

export const storedSystemSchema: z.Schema<StoredSystem> = z.object({
  [SYSTEM_TYPE]: z.literal('system'),
  [SYSTEM_UUID]: z.string(),
  [SYSTEM_NAME]: z.string(),
  [SYSTEM_DESCRIPTION]: z.string(),
  [STREAM_NAME]: z.string(),
  [SYSTEM_FILTER]: z.optional(conditionSchema),
});
