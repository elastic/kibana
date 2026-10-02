/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { alertActionEnvelopeSchema } from './alert_action_envelope';

export const ALERT_ACKED_TRIGGER_ID = 'alerting.actions.alertAcked' as const;

export const alertAckedPayloadSchema = alertActionEnvelopeSchema.extend({});

export type AlertAckedPayload = z.infer<typeof alertAckedPayloadSchema>;

export const alertAckedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof alertAckedPayloadSchema
> = {
  id: ALERT_ACKED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: alertAckedPayloadSchema,
  title: i18n.translate('xpack.alertingVTwo.workflowTriggers.alertAcked.title', {
    defaultMessage: 'Alerting - Alert acknowledged',
  }),
  description: i18n.translate('xpack.alertingVTwo.workflowTriggers.alertAcked.description', {
    defaultMessage: 'Emitted when an alert is acknowledged.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingVTwo.workflowTriggers.alertAcked.documentation.details',
      {
        defaultMessage:
          'Emitted after an alert ack action is persisted. The payload includes event.alertId, event.ruleId, and event.spaceId for trigger conditions.',
      }
    ),
  },
  snippets: {
    condition: 'event.ruleId: "my-rule-id"',
  },
};
