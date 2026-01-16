/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const baseActionSchema = z.object({
  episode_id: z.string().optional(),
});

const ackActionSchema = baseActionSchema.extend({
  action_type: z.literal('ack'),
});

const unackActionSchema = baseActionSchema.extend({
  action_type: z.literal('unack'),
});

const tagActionSchema = baseActionSchema.extend({
  action_type: z.literal('tag'),
  tags: z.array(z.string()),
});

const untagActionSchema = baseActionSchema.extend({
  action_type: z.literal('untag'),
  tags: z.array(z.string()),
});

const snoozeActionSchema = baseActionSchema.extend({
  action_type: z.literal('snooze'),
});

const unsnoozeActionSchema = baseActionSchema.extend({
  action_type: z.literal('unsnooze'),
});

const activateActionSchema = baseActionSchema.extend({
  action_type: z.literal('activate'),
  reason: z.string(),
});

const deactivateActionSchema = baseActionSchema.extend({
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
  alert_series_id: z.string(),
});

export type CreateAlertActionParams = z.infer<typeof createAlertActionParamsSchema>;

export const bulkCreateAlertActionItemDataSchema = createAlertActionDataSchema.and(
  z.object({ alert_series_id: z.string() })
);
export type BulkCreateAlertActionItemData = z.infer<typeof bulkCreateAlertActionItemDataSchema>;

export const bulkCreateAlertActionDataSchema = z.array(bulkCreateAlertActionItemDataSchema).min(1);
export type BulkCreateAlertActionData = z.infer<typeof bulkCreateAlertActionDataSchema>;
