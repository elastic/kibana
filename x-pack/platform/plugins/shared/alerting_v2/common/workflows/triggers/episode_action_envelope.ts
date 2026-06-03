/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';

/**
 * Shared envelope fields carried by every alert-action workflow trigger payload.
 *
 * Each per-type trigger schema composes this shape (optionally extending it
 * with action-specific fields) so the envelope wording and validation stay
 * consistent across triggers. Keep this in lockstep with the bus envelope in
 * `server/lib/events/alert_action_event_publisher/events.ts`.
 */
export const episodeActionEnvelopeShape = {
  occurredAt: z.iso.datetime().describe(
    i18n.translate('xpack.alertingVTwo.triggers.episodeAction.schema.occurredAt', {
      defaultMessage: 'ISO timestamp of when the action occurred.',
    })
  ),
  groupHash: z
    .string()
    .min(1)
    .max(128)
    .describe(
      i18n.translate('xpack.alertingVTwo.triggers.episodeAction.schema.groupHash', {
        defaultMessage: 'Stable hash of the alert grouping the episode belongs to.',
      })
    ),
  episodeId: z
    .string()
    .min(1)
    .max(256)
    .describe(
      i18n.translate('xpack.alertingVTwo.triggers.episodeAction.schema.episodeId', {
        defaultMessage: 'Identifier of the alerting episode the action was applied to.',
      })
    ),
  ruleId: z
    .string()
    .min(1)
    .max(256)
    .describe(
      i18n.translate('xpack.alertingVTwo.triggers.episodeAction.schema.ruleId', {
        defaultMessage: 'Identifier of the alerting rule the episode belongs to.',
      })
    ),
  spaceId: z
    .string()
    .min(1)
    .max(256)
    .describe(
      i18n.translate('xpack.alertingVTwo.triggers.episodeAction.schema.spaceId', {
        defaultMessage: 'Kibana space the episode lives in.',
      })
    ),
  actorUid: z
    .string()
    .min(1)
    .max(256)
    .nullable()
    .describe(
      i18n.translate('xpack.alertingVTwo.triggers.episodeAction.schema.actorUid', {
        defaultMessage:
          'User-profile uid of the actor who performed the action, or null when performed by an internal/system context.',
      })
    ),
} as const;

/** Trigger payload schema for actions that carry only the shared envelope. */
export const episodeActionEnvelopeSchema = z.object(episodeActionEnvelopeShape).strict();

export type EpisodeActionEnvelopePayload = z.infer<typeof episodeActionEnvelopeSchema>;
