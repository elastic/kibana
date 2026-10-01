/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { episodeActionEnvelopeSchema } from './episode_action_envelope';

export const ALERT_UNSNOOZED_TRIGGER_ID = 'alerting.userActions.alertUnsnoozed' as const;

export const alertUnsnoozedPayloadSchema = episodeActionEnvelopeSchema.extend({});

export type AlertUnsnoozedPayload = z.infer<typeof alertUnsnoozedPayloadSchema>;

export const alertUnsnoozedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof alertUnsnoozedPayloadSchema
> = {
  id: ALERT_UNSNOOZED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: alertUnsnoozedPayloadSchema,
  title: i18n.translate('xpack.alertingVTwo.workflowTriggers.alertUnsnoozed.title', {
    defaultMessage: 'Alerting - Alert unsnoozed',
  }),
  description: i18n.translate('xpack.alertingVTwo.workflowTriggers.alertUnsnoozed.description', {
    defaultMessage: 'Emitted when snooze is removed from an alert.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingVTwo.workflowTriggers.alertUnsnoozed.documentation.details',
      {
        defaultMessage:
          'Emitted after an alert unsnooze action is persisted. The payload includes event.episodeId, event.ruleId, and event.spaceId for trigger conditions.',
      }
    ),
  },
  snippets: {
    condition: 'event.ruleId: "my-rule-id"',
  },
};
