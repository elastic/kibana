/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export const alertEventSchema = z.object({
  '@timestamp': z.string(),
  'rule.id': z.string(),
});
export type AlertEvent = z.infer<typeof alertEventSchema>;

export const alertTransitionSchema = z.object({
  episode_id: z.string(),
});
export type AlertTransition = z.infer<typeof alertTransitionSchema>;
