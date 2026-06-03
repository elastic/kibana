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

export const EPISODE_TAGGED_TRIGGER_ID = 'alerting.episodeTagged' as const;

export const episodeTaggedPayloadSchema = episodeActionEnvelopeSchema.extend({
  tags: z.array(z.string()).describe(
    i18n.translate('xpack.alertingVTwo.triggers.episodeTagged.schema.tags', {
      defaultMessage: 'Tags added to the alerting episode.',
    })
  ),
});

export type EpisodeTaggedPayload = z.infer<typeof episodeTaggedPayloadSchema>;

export const episodeTaggedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof episodeTaggedPayloadSchema
> = {
  id: EPISODE_TAGGED_TRIGGER_ID,
  eventSchema: episodeTaggedPayloadSchema,
  title: i18n.translate('xpack.alertingVTwo.workflowTriggers.episodeTagged.title', {
    defaultMessage: 'Alerting - Episode tagged',
  }),
  description: i18n.translate('xpack.alertingVTwo.workflowTriggers.episodeTagged.description', {
    defaultMessage: 'Emitted when tags are added to an alerting episode.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingVTwo.workflowTriggers.episodeTagged.documentation.details',
      {
        defaultMessage:
          'Emitted after an episode tag action is persisted. The payload includes event.tags alongside event.episodeId, event.ruleId, and event.spaceId for trigger conditions.',
      }
    ),
  },
  snippets: {
    condition: 'event.tags: "my-tag"',
  },
};
