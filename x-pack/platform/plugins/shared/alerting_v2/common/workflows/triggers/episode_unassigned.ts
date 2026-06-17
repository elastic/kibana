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

export const EPISODE_UNASSIGNED_TRIGGER_ID = 'alerting.episodeUnassigned' as const;

export const episodeUnassignedPayloadSchema = episodeActionEnvelopeSchema.extend({});

export type EpisodeUnassignedPayload = z.infer<typeof episodeUnassignedPayloadSchema>;

export const episodeUnassignedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof episodeUnassignedPayloadSchema
> = {
  id: EPISODE_UNASSIGNED_TRIGGER_ID,
  eventSchema: episodeUnassignedPayloadSchema,
  title: i18n.translate('xpack.alertingVTwo.workflowTriggers.episodeUnassigned.title', {
    defaultMessage: 'Alerting - Episode unassigned',
  }),
  description: i18n.translate('xpack.alertingVTwo.workflowTriggers.episodeUnassigned.description', {
    defaultMessage: 'Emitted when the assignee is cleared from an alerting episode.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingVTwo.workflowTriggers.episodeUnassigned.documentation.details',
      {
        defaultMessage:
          'Emitted after an episode assign action is persisted with a null assignee. The payload includes event.episodeId, event.ruleId, and event.spaceId for trigger conditions.',
      }
    ),
  },
  snippets: {
    condition: 'event.ruleId: "my-rule-id"',
  },
};
