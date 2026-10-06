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

export const ALERT_UNASSIGNED_TRIGGER_ID = 'alerting.actions.alertUnassigned' as const;

export const alertUnassignedPayloadSchema = alertActionEnvelopeSchema.extend({});

export type AlertUnassignedPayload = z.infer<typeof alertUnassignedPayloadSchema>;

export const alertUnassignedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof alertUnassignedPayloadSchema
> = {
  id: ALERT_UNASSIGNED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: alertUnassignedPayloadSchema,
  title: i18n.translate('xpack.alertingVTwo.workflowTriggers.alertUnassigned.title', {
    defaultMessage: 'Alerting - Alert unassigned',
  }),
  description: i18n.translate('xpack.alertingVTwo.workflowTriggers.alertUnassigned.description', {
    defaultMessage: 'Emitted when the assignee is cleared from an alert.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingVTwo.workflowTriggers.alertUnassigned.documentation.details',
      {
        defaultMessage:
          'Emitted after an alert assign action is persisted with a null assignee. The payload includes event.alertId, event.ruleId, and event.spaceId for trigger conditions.',
      }
    ),
  },
  snippets: {
    condition: 'event.ruleId: "my-rule-id"',
  },
};
