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

export const createAlertActionDataSchema = z.discriminatedUnion('action_type', [
  ackActionSchema,
  unackActionSchema,
  tagActionSchema,
  untagActionSchema,
  snoozeActionSchema,
  unsnoozeActionSchema,
  activateActionSchema,
  deactivateActionSchema,
]);

export type CreateAlertActionData = z.infer<typeof createAlertActionDataSchema>;

export const createAlertActionParamsSchema = z.object({
  group_hash: z.string(),
});

export type CreateAlertActionParams = z.infer<typeof createAlertActionParamsSchema>;

export const bulkCreateAlertActionItemDataSchema = createAlertActionDataSchema.and(
  z.object({ group_hash: z.string() })
);
export type BulkCreateAlertActionItemData = z.infer<typeof bulkCreateAlertActionItemDataSchema>;

export const bulkCreateAlertActionDataSchema = z.array(bulkCreateAlertActionItemDataSchema).min(1);
export type BulkCreateAlertActionData = z.infer<typeof bulkCreateAlertActionDataSchema>;
