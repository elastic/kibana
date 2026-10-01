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

export const ALERT_UNACKED_TRIGGER_ID = 'alerting.userActions.alertUnacked' as const;

export const alertUnackedPayloadSchema = episodeActionEnvelopeSchema.extend({});

export type AlertUnackedPayload = z.infer<typeof alertUnackedPayloadSchema>;

export const alertUnackedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof alertUnackedPayloadSchema
> = {
  id: ALERT_UNACKED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: alertUnackedPayloadSchema,
  title: i18n.translate('xpack.alertingVTwo.workflowTriggers.alertUnacked.title', {
    defaultMessage: 'Alerting - Alert unacknowledged',
  }),
  description: i18n.translate('xpack.alertingVTwo.workflowTriggers.alertUnacked.description', {
    defaultMessage: 'Emitted when acknowledgement is removed from an alert.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingVTwo.workflowTriggers.alertUnacked.documentation.details',
      {
        defaultMessage:
          'Emitted after an alert unack action is persisted. The payload includes event.episodeId, event.ruleId, and event.spaceId for trigger conditions.',
      }
    ),
  },
  snippets: {
    condition: 'event.ruleId: "my-rule-id"',
  },
};
