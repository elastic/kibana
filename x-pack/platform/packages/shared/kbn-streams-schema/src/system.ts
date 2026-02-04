/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionSchema, type Condition } from '@kbn/streamlang';
import { z } from '@kbn/zod';

export interface System {
  type: 'system';
  name: string;
  description: string;
  filter: Condition;
}

export const systemSchema: z.Schema<System> = z.object({
  type: z.literal('system'),
  name: z.string(),
  description: z.string(),
  filter: conditionSchema,
});

export function isSystem(system: any): system is System {
  return systemSchema.safeParse(system).success;
}
