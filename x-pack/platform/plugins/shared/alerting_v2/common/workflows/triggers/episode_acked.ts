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

export const EPISODE_ACKED_TRIGGER_ID = 'alerting.episodeAcked' as const;

export const episodeAckedPayloadSchema = episodeActionEnvelopeSchema.extend({});

export type EpisodeAckedPayload = z.infer<typeof episodeAckedPayloadSchema>;

export const episodeAckedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof episodeAckedPayloadSchema
> = {
  id: EPISODE_ACKED_TRIGGER_ID,
  eventSchema: episodeAckedPayloadSchema,
  title: i18n.translate('xpack.alertingVTwo.workflowTriggers.episodeAcked.title', {
    defaultMessage: 'Alerting - Episode acknowledged',
  }),
  description: i18n.translate('xpack.alertingVTwo.workflowTriggers.episodeAcked.description', {
    defaultMessage: 'Emitted when an alerting episode is acknowledged.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingVTwo.workflowTriggers.episodeAcked.documentation.details',
      {
        defaultMessage:
          'Emitted after an episode ack action is persisted. The payload includes event.episodeId, event.ruleId, and event.spaceId for trigger conditions.',
      }
    ),
  },
  snippets: {
    condition: 'event.ruleId: "my-rule-id"',
  },
};
