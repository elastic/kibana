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

export const ALERT_TAGGED_TRIGGER_ID = 'alerting.actions.alertTagged' as const;

export const alertTaggedPayloadSchema = alertActionEnvelopeSchema.extend({
  tags: z
    .array(z.string().min(1).max(128))
    .max(20)
    .describe(
      i18n.translate('xpack.alertingVTwo.triggers.alertTagged.schema.tags', {
        defaultMessage: 'Tags added to the alert.',
      })
    ),
});

export type AlertTaggedPayload = z.infer<typeof alertTaggedPayloadSchema>;

export const alertTaggedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof alertTaggedPayloadSchema
> = {
  id: ALERT_TAGGED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: alertTaggedPayloadSchema,
  title: i18n.translate('xpack.alertingVTwo.workflowTriggers.alertTagged.title', {
    defaultMessage: 'Alerting - Alert tagged',
  }),
  description: i18n.translate('xpack.alertingVTwo.workflowTriggers.alertTagged.description', {
    defaultMessage: 'Emitted when tags are added to an alert.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingVTwo.workflowTriggers.alertTagged.documentation.details',
      {
        defaultMessage:
          'Emitted after an alert tag action is persisted. The payload includes event.tags alongside event.alertId, event.ruleId, and event.spaceId for trigger conditions.',
      }
    ),
  },
  snippets: {
    condition: 'event.tags: "my-tag"',
  },
};
