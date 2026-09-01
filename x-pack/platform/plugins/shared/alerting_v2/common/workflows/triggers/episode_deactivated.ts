/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { episodeActionEnvelopeSchema } from './episode_action_envelope';

export const EPISODE_DEACTIVATED_TRIGGER_ID = 'alerting.episodeDeactivated' as const;

export const episodeDeactivatedPayloadSchema = episodeActionEnvelopeSchema.extend({
  reason: z
    .string()
    .min(1)
    .max(1024)
    .describe(
      i18n.translate('xpack.alertingVTwo.triggers.episodeDeactivated.schema.reason', {
        defaultMessage: 'Reason the alerting episode was deactivated.',
      })
    ),
});

export type EpisodeDeactivatedPayload = z.infer<typeof episodeDeactivatedPayloadSchema>;

export const episodeDeactivatedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof episodeDeactivatedPayloadSchema
> = {
  id: EPISODE_DEACTIVATED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: episodeDeactivatedPayloadSchema,
  title: i18n.translate('xpack.alertingVTwo.workflowTriggers.episodeDeactivated.title', {
    defaultMessage: 'Alerting - Episode deactivated',
  }),
  description: i18n.translate(
    'xpack.alertingVTwo.workflowTriggers.episodeDeactivated.description',
    {
      defaultMessage: 'Emitted when an alerting episode is deactivated.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.alertingVTwo.workflowTriggers.episodeDeactivated.documentation.details',
      {
        defaultMessage:
          'Emitted after an episode deactivate action is persisted. The payload includes event.reason alongside event.episodeId, event.ruleId, and event.spaceId for trigger conditions.',
      }
    ),
  },
  snippets: {
    condition: 'event.ruleId: "my-rule-id"',
  },
};
