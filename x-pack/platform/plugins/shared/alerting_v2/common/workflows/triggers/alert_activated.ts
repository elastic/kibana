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

export const ALERT_ACTIVATED_TRIGGER_ID = 'alerting.userActions.alertActivated' as const;

export const alertActivatedPayloadSchema = alertActionEnvelopeSchema.extend({
  reason: z
    .string()
    .min(1)
    .max(1024)
    .describe(
      i18n.translate('xpack.alertingVTwo.triggers.alertActivated.schema.reason', {
        defaultMessage: 'Reason the alert was activated.',
      })
    ),
});

export type AlertActivatedPayload = z.infer<typeof alertActivatedPayloadSchema>;

export const alertActivatedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof alertActivatedPayloadSchema
> = {
  id: ALERT_ACTIVATED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: alertActivatedPayloadSchema,
  title: i18n.translate('xpack.alertingVTwo.workflowTriggers.alertActivated.title', {
    defaultMessage: 'Alerting - Alert activated',
  }),
  description: i18n.translate('xpack.alertingVTwo.workflowTriggers.alertActivated.description', {
    defaultMessage: 'Emitted when an alert is activated.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingVTwo.workflowTriggers.alertActivated.documentation.details',
      {
        defaultMessage:
          'Emitted after an alert activate action is persisted. The payload includes event.reason alongside event.alertId, event.ruleId, and event.spaceId for trigger conditions.',
      }
    ),
  },
  snippets: {
    condition: 'event.ruleId: "my-rule-id"',
  },
};
