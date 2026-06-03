/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { episodeActionEnvelopeShape } from './episode_action_envelope';

export const EPISODE_SNOOZED_TRIGGER_ID = 'alerting.episodeSnoozed' as const;

export const episodeSnoozedPayloadSchema = z
  .object({
    ...episodeActionEnvelopeShape,
    expiry: z.iso
      .datetime()
      .nullable()
      .describe(
        i18n.translate('xpack.alertingVTwo.triggers.episodeSnoozed.schema.expiry', {
          defaultMessage:
            'ISO datetime when the snooze expires, or null when the snooze has no expiry.',
        })
      ),
  })
  .strict();

export type EpisodeSnoozedPayload = z.infer<typeof episodeSnoozedPayloadSchema>;

export const episodeSnoozedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof episodeSnoozedPayloadSchema
> = {
  id: EPISODE_SNOOZED_TRIGGER_ID,
  eventSchema: episodeSnoozedPayloadSchema,
  title: i18n.translate('xpack.alertingVTwo.workflowTriggers.episodeSnoozed.title', {
    defaultMessage: 'Alerting - Episode snoozed',
  }),
  description: i18n.translate('xpack.alertingVTwo.workflowTriggers.episodeSnoozed.description', {
    defaultMessage: 'Emitted when an alerting episode is snoozed.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingVTwo.workflowTriggers.episodeSnoozed.documentation.details',
      {
        defaultMessage:
          'Emitted after an episode snooze action is persisted. The payload includes event.expiry alongside event.episodeId, event.ruleId, and event.spaceId for trigger conditions.',
      }
    ),
  },
  snippets: {
    condition: 'event.ruleId: "my-rule-id"',
  },
};
