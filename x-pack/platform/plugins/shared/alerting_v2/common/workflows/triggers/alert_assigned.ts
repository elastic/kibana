/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { alertActionEnvelopeSchema } from './alert_action_envelope';

export const ALERT_ASSIGNED_TRIGGER_ID = 'alerting.userActions.alertAssigned' as const;

export const alertAssignedPayloadSchema = alertActionEnvelopeSchema.extend({
  assigneeUid: z
    .string()
    .min(1)
    .max(256)
    .describe(
      i18n.translate('xpack.alertingVTwo.triggers.alertAssigned.schema.assigneeUid', {
        defaultMessage: 'User-profile uid of the new assignee.',
      })
    ),
});

export type AlertAssignedPayload = z.infer<typeof alertAssignedPayloadSchema>;

export const alertAssignedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof alertAssignedPayloadSchema
> = {
  id: ALERT_ASSIGNED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: alertAssignedPayloadSchema,
  title: i18n.translate('xpack.alertingVTwo.workflowTriggers.alertAssigned.title', {
    defaultMessage: 'Alerting - Alert assigned',
  }),
  description: i18n.translate('xpack.alertingVTwo.workflowTriggers.alertAssigned.description', {
    defaultMessage: 'Emitted when an alert is assigned to a user.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingVTwo.workflowTriggers.alertAssigned.documentation.details',
      {
        defaultMessage:
          'Emitted after an alert assign action is persisted with a non-null assignee. The payload includes event.alertId, event.ruleId, event.spaceId, and event.assigneeUid for trigger conditions.',
      }
    ),
    examples: [
      i18n.translate('xpack.alertingVTwo.workflowTriggers.alertAssigned.documentation.example', {
        defaultMessage: `## Run for a specific rule
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.ruleId: "my-rule-id"'
\`\`\``,
        values: {
          triggerId: ALERT_ASSIGNED_TRIGGER_ID,
        },
      }),
    ],
  },
  snippets: {
    condition: 'event.assigneeUid: "user-profile-uid"',
  },
};
