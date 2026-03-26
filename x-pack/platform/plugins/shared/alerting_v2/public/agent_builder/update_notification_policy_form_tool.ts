/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { NotificationPolicyFormState } from '../components/notification_policy/form/types';

const updateNotificationPolicyFormSchema = z.object({
  name: z.string().optional().describe('Notification policy name.'),
  description: z.string().optional().describe('Notification policy description.'),
  matcher: z
    .string()
    .optional()
    .describe('KQL matcher expression (e.g. \'rule.labels : "team:ops"\').'),
  group_by: z
    .array(z.string())
    .optional()
    .describe('Fields to group notifications by (e.g. ["host.name"]).'),
  frequency: z
    .object({
      type: z.enum(['immediate', 'throttle']).describe('Frequency type.'),
      interval: z
        .string()
        .optional()
        .describe('Throttle interval (e.g. "5m", "1h"). Required when type is "throttle".'),
    })
    .optional()
    .describe('Notification frequency configuration.'),
  destinations: z
    .array(
      z.object({
        type: z.literal('workflow').describe('Destination type.'),
        id: z.string().describe('Workflow ID.'),
      })
    )
    .optional()
    .describe('Workflow destinations to route notifications to.'),
});

type UpdateNotificationPolicyFormParams = z.infer<typeof updateNotificationPolicyFormSchema>;

const mapParamsToFormValues = (
  params: UpdateNotificationPolicyFormParams
): Partial<NotificationPolicyFormState> => {
  const values: Partial<NotificationPolicyFormState> = {};

  if (params.name !== undefined) {
    values.name = params.name;
  }

  if (params.description !== undefined) {
    values.description = params.description;
  }

  if (params.matcher !== undefined) {
    values.matcher = params.matcher;
  }

  if (params.group_by) {
    values.groupBy = params.group_by;
  }

  if (params.frequency) {
    values.frequency =
      params.frequency.type === 'throttle'
        ? { type: 'throttle', interval: params.frequency.interval ?? '5m' }
        : { type: 'immediate' };
  }

  if (params.destinations) {
    values.destinations = params.destinations;
  }

  return values;
};

export const createUpdateNotificationPolicyFormTool = (
  setFormValues: (values: Partial<NotificationPolicyFormState>) => void
): BrowserApiToolDefinition<UpdateNotificationPolicyFormParams> => ({
  id: 'alerting_v2_update_notification_policy_form',
  description:
    'PREFERRED method for notification policy changes — updates the form the user currently has open. ' +
    'Call this instead of the draft/finalize pipeline whenever it is available. ' +
    'Only include the fields that need to change. The form will be updated in place without a page reload.',
  schema: updateNotificationPolicyFormSchema,
  handler: (params) => {
    const formValues = mapParamsToFormValues(params);
    setFormValues(formValues);
  },
});
