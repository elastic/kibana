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

const ackActionSchema = z.object({
  ...baseActionSchema.shape,
  action_type: z.literal('ack'),
});

const unackActionSchema = z.object({
  ...baseActionSchema.shape,
  action_type: z.literal('unack'),
});

const tagActionSchema = z.object({
  ...baseActionSchema.shape,
  action_type: z.literal('tag'),
  tags: z.array(z.string()),
});

const untagActionSchema = z.object({
  ...baseActionSchema.shape,
  action_type: z.literal('untag'),
  tags: z.array(z.string()),
});

const snoozeActionSchema = z.object({
  ...baseActionSchema.shape,
  action_type: z.literal('snooze'),
});

const unsnoozeActionSchema = z.object({
  ...baseActionSchema.shape,
  action_type: z.literal('unsnooze'),
});

const activateActionSchema = z.object({
  ...baseActionSchema.shape,
  action_type: z.literal('activate'),
  reason: z.string(),
});

const deactivateActionSchema = z.object({
  ...baseActionSchema.shape,
  action_type: z.literal('deactivate'),
  reason: z.string(),
});

export const alertActionSchema = z.discriminatedUnion('action_type', [
  ackActionSchema,
  unackActionSchema,
  tagActionSchema,
  untagActionSchema,
  snoozeActionSchema,
  unsnoozeActionSchema,
  activateActionSchema,
  deactivateActionSchema,
]);

export type AlertAction = z.infer<typeof alertActionSchema>;

export const alertActionParamsSchema = z.object({
  alert_series_id: z.string(),
});

export type AlertActionParams = z.infer<typeof alertActionParamsSchema>;

export const bulkAlertActionItemSchema = alertActionSchema.and(
  z.object({ alert_series_id: z.string() })
);

export type BulkAlertActionItem = z.infer<typeof bulkAlertActionItemSchema>;

export const bulkAlertActionBodySchema = z.array(bulkAlertActionItemSchema).min(1);

export type BulkAlertActionBody = z.infer<typeof bulkAlertActionBodySchema>;
