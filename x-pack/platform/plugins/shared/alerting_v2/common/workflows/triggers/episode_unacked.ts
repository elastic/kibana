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

export const EPISODE_UNACKED_TRIGGER_ID = 'alerting.episodeUnacked' as const;

export const episodeUnackedPayloadSchema = episodeActionEnvelopeSchema.extend({});

export type EpisodeUnackedPayload = z.infer<typeof episodeUnackedPayloadSchema>;

export const episodeUnackedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof episodeUnackedPayloadSchema
> = {
  id: EPISODE_UNACKED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: episodeUnackedPayloadSchema,
  title: i18n.translate('xpack.alertingVTwo.workflowTriggers.episodeUnacked.title', {
    defaultMessage: 'Alerting - Episode unacknowledged',
  }),
  description: i18n.translate('xpack.alertingVTwo.workflowTriggers.episodeUnacked.description', {
    defaultMessage: 'Emitted when acknowledgement is removed from an alerting episode.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingVTwo.workflowTriggers.episodeUnacked.documentation.details',
      {
        defaultMessage:
          'Emitted after an episode unack action is persisted. The payload includes event.episodeId, event.ruleId, and event.spaceId for trigger conditions.',
      }
    ),
  },
  snippets: {
    condition: 'event.ruleId: "my-rule-id"',
  },
};
