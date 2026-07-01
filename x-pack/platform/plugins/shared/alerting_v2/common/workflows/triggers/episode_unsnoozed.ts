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

export const EPISODE_UNSNOOZED_TRIGGER_ID = 'alerting.episodeUnsnoozed' as const;

export const episodeUnsnoozedPayloadSchema = episodeActionEnvelopeSchema.extend({});

export type EpisodeUnsnoozedPayload = z.infer<typeof episodeUnsnoozedPayloadSchema>;

export const episodeUnsnoozedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof episodeUnsnoozedPayloadSchema
> = {
  id: EPISODE_UNSNOOZED_TRIGGER_ID,
  eventSchema: episodeUnsnoozedPayloadSchema,
  title: i18n.translate('xpack.alertingVTwo.workflowTriggers.episodeUnsnoozed.title', {
    defaultMessage: 'Alerting - Episode unsnoozed',
  }),
  description: i18n.translate('xpack.alertingVTwo.workflowTriggers.episodeUnsnoozed.description', {
    defaultMessage: 'Emitted when snooze is removed from an alerting episode.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingVTwo.workflowTriggers.episodeUnsnoozed.documentation.details',
      {
        defaultMessage:
          'Emitted after an episode unsnooze action is persisted. The payload includes event.episodeId, event.ruleId, and event.spaceId for trigger conditions.',
      }
    ),
  },
  snippets: {
    condition: 'event.ruleId: "my-rule-id"',
  },
};
