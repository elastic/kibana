/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { z } from '@kbn/zod/v4';
import { isoDateTime } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { alertActionEnvelopeSchema } from './alert_action_envelope';

export const ALERT_SNOOZED_TRIGGER_ID = 'alerting.actions.alertSnoozed' as const;

export const alertSnoozedPayloadSchema = alertActionEnvelopeSchema.extend({
  expiry: isoDateTime()
    .nullable()
    .describe(
      i18n.translate('xpack.alertingVTwo.triggers.alertSnoozed.schema.expiry', {
        defaultMessage:
          'ISO datetime when the snooze expires, or null when the snooze has no expiry.',
      })
    ),
});

export type AlertSnoozedPayload = z.infer<typeof alertSnoozedPayloadSchema>;

export const alertSnoozedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof alertSnoozedPayloadSchema
> = {
  id: ALERT_SNOOZED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: alertSnoozedPayloadSchema,
  title: i18n.translate('xpack.alertingVTwo.workflowTriggers.alertSnoozed.title', {
    defaultMessage: 'Alerting - Alert snoozed',
  }),
  description: i18n.translate('xpack.alertingVTwo.workflowTriggers.alertSnoozed.description', {
    defaultMessage: 'Emitted when an alert is snoozed.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingVTwo.workflowTriggers.alertSnoozed.documentation.details',
      {
        defaultMessage:
          'Emitted after an alert snooze action is persisted. The payload includes event.expiry alongside event.alertId, event.ruleId, and event.spaceId for trigger conditions.',
      }
    ),
  },
  snippets: {
    condition: 'event.ruleId: "my-rule-id"',
  },
};
