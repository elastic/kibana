/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const ackActionSchema = z.object({
  action_type: z.literal('ack'),
  episode_id: z.string(),
});

const unackActionSchema = z.object({
  action_type: z.literal('unack'),
  episode_id: z.string(),
});

const tagActionSchema = z.object({
  action_type: z.literal('tag'),
  tags: z.array(z.string()),
});

const untagActionSchema = z.object({
  action_type: z.literal('untag'),
  tags: z.array(z.string()),
});

const snoozeActionSchema = z.object({
  action_type: z.literal('snooze'),
});

const unsnoozeActionSchema = z.object({
  action_type: z.literal('unsnooze'),
});

const activateActionSchema = z.object({
  action_type: z.literal('activate'),
  reason: z.string(),
});

const deactivateActionSchema = z.object({
  action_type: z.literal('deactivate'),
  reason: z.string(),
});

export const createAlertActionBodySchema = z.discriminatedUnion('action_type', [
  ackActionSchema,
  unackActionSchema,
  tagActionSchema,
  untagActionSchema,
  snoozeActionSchema,
  unsnoozeActionSchema,
  activateActionSchema,
  deactivateActionSchema,
]);

export type CreateAlertActionBody = z.infer<typeof createAlertActionBodySchema>;

export const createAlertActionParamsSchema = z.object({
  group_hash: z.string(),
});

export type CreateAlertActionParams = z.infer<typeof createAlertActionParamsSchema>;

export const bulkCreateAlertActionItemBodySchema = createAlertActionBodySchema.and(
  z.object({ group_hash: z.string() })
);
export type BulkCreateAlertActionItemBody = z.infer<typeof bulkCreateAlertActionItemBodySchema>;

export const bulkCreateAlertActionBodySchema = z
  .array(bulkCreateAlertActionItemBodySchema)
  .min(1, 'At least one action must be provided')
  .max(100, 'Cannot process more than 100 actions in a single request');
export type BulkCreateAlertActionBody = z.infer<typeof bulkCreateAlertActionBodySchema>;
