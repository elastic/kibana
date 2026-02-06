/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export function taskActionSchema<T extends z.ZodRawShape>(scheduleParams: T) {
  return z.discriminatedUnion('action', [
    z.object({
      action: z.literal('schedule').describe('Schedule a new generation task'),
      ...scheduleParams,
    }),
    z.object({
      action: z.literal('cancel').describe('Cancel an in-progress generation task'),
    }),
    z.object({
      action: z.literal('acknowledge').describe('Acknowledge a completed generation task'),
    }),
  ]);
}
