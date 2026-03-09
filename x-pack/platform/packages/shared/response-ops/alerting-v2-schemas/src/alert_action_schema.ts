/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const ackActionSchema = z.object({
  action_type: z.literal('ack').describe('Acknowledges an alert.'),
  episode_id: z.string().describe('The episode identifier for the alert to acknowledge.'),
});

const unackActionSchema = z.object({
  action_type: z.literal('unack').describe('Removes acknowledgement from an alert.'),
  episode_id: z.string().describe('The episode identifier for the alert to unacknowledge.'),
});

const tagActionSchema = z.object({
  action_type: z.literal('tag').describe('Adds tags to an alert.'),
  tags: z.array(z.string()).describe('List of tags to add to the alert.'),
});

const untagActionSchema = z.object({
  action_type: z.literal('untag').describe('Removes tags from an alert.'),
  tags: z.array(z.string()).describe('List of tags to remove from the alert.'),
});

const snoozeActionSchema = z.object({
  action_type: z.literal('snooze').describe('Snoozes an alert.'),
});

const unsnoozeActionSchema = z.object({
  action_type: z.literal('unsnooze').describe('Removes snooze from an alert.'),
});

const activateActionSchema = z.object({
  action_type: z.literal('activate').describe('Activates an alert.'),
  reason: z.string().describe('Reason for activating the alert.'),
});

const deactivateActionSchema = z.object({
  action_type: z.literal('deactivate').describe('Deactivates an alert.'),
  reason: z.string().describe('Reason for deactivating the alert.'),
});

export const createAlertActionBodySchema = z
  .discriminatedUnion('action_type', [
    ackActionSchema,
    unackActionSchema,
    tagActionSchema,
    untagActionSchema,
    snoozeActionSchema,
    unsnoozeActionSchema,
    activateActionSchema,
    deactivateActionSchema,
  ])
  .describe(
    'Request body for creating a single alert action. One of: ack, unack, tag, untag, snooze, unsnooze, activate, deactivate.'
  );

export type CreateAlertActionBody = z.infer<typeof createAlertActionBodySchema>;

export const createAlertActionParamsSchema = z
  .object({
    group_hash: z.string().describe('Hash identifying the alert group to apply the action to.'),
  })
  .describe('Path parameters for the create alert action endpoint.');

export type CreateAlertActionParams = z.infer<typeof createAlertActionParamsSchema>;

export const bulkCreateAlertActionItemBodySchema = createAlertActionBodySchema.and(
  z
    .object({
      group_hash: z.string().describe('Hash identifying the alert group to apply the action to.'),
    })
    .describe('Alert action payload with group identifier for bulk requests.')
);
export type BulkCreateAlertActionItemBody = z.infer<typeof bulkCreateAlertActionItemBodySchema>;

export const bulkCreateAlertActionBodySchema = z
  .array(bulkCreateAlertActionItemBodySchema)
  .min(1, 'At least one action must be provided')
  .max(100, 'Cannot process more than 100 actions in a single request')
  .describe(
    'Request body for bulk create alert actions. Array of 1 to 100 actions, each with group_hash and action payload.'
  );
export type BulkCreateAlertActionBody = z.infer<typeof bulkCreateAlertActionBodySchema>;
