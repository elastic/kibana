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

export const ALERT_DEACTIVATED_TRIGGER_ID = 'alerting.actions.alertDeactivated' as const;

export const alertDeactivatedPayloadSchema = alertActionEnvelopeSchema.extend({
  reason: z
    .string()
    .min(1)
    .max(1024)
    .describe(
      i18n.translate('xpack.alertingVTwo.triggers.alertDeactivated.schema.reason', {
        defaultMessage: 'Reason the alert was deactivated.',
      })
    ),
});

export type AlertDeactivatedPayload = z.infer<typeof alertDeactivatedPayloadSchema>;

export const alertDeactivatedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof alertDeactivatedPayloadSchema
> = {
  id: ALERT_DEACTIVATED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: alertDeactivatedPayloadSchema,
  title: i18n.translate('xpack.alertingVTwo.workflowTriggers.alertDeactivated.title', {
    defaultMessage: 'Alerting - Alert deactivated',
  }),
  description: i18n.translate('xpack.alertingVTwo.workflowTriggers.alertDeactivated.description', {
    defaultMessage: 'Emitted when an alert is deactivated.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingVTwo.workflowTriggers.alertDeactivated.documentation.details',
      {
        defaultMessage:
          'Emitted after an alert deactivate action is persisted. The payload includes event.reason alongside event.alertId, event.ruleId, and event.spaceId for trigger conditions.',
      }
    ),
  },
  snippets: {
    condition: 'event.ruleId: "my-rule-id"',
  },
};
