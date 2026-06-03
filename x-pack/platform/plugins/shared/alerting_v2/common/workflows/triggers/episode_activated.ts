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

export const EPISODE_ACTIVATED_TRIGGER_ID = 'alerting.episodeActivated' as const;

export const episodeActivatedPayloadSchema = episodeActionEnvelopeSchema.extend({
  reason: z
    .string()
    .min(1)
    .describe(
      i18n.translate('xpack.alertingVTwo.triggers.episodeActivated.schema.reason', {
        defaultMessage: 'Reason the alerting episode was activated.',
      })
    ),
});

export type EpisodeActivatedPayload = z.infer<typeof episodeActivatedPayloadSchema>;

export const episodeActivatedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof episodeActivatedPayloadSchema
> = {
  id: EPISODE_ACTIVATED_TRIGGER_ID,
  eventSchema: episodeActivatedPayloadSchema,
  title: i18n.translate('xpack.alertingVTwo.workflowTriggers.episodeActivated.title', {
    defaultMessage: 'Alerting - Episode activated',
  }),
  description: i18n.translate('xpack.alertingVTwo.workflowTriggers.episodeActivated.description', {
    defaultMessage: 'Emitted when an alerting episode is activated.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingVTwo.workflowTriggers.episodeActivated.documentation.details',
      {
        defaultMessage:
          'Emitted after an episode activate action is persisted. The payload includes event.reason alongside event.episodeId, event.ruleId, and event.spaceId for trigger conditions.',
      }
    ),
  },
  snippets: {
    condition: 'event.ruleId: "my-rule-id"',
  },
};
