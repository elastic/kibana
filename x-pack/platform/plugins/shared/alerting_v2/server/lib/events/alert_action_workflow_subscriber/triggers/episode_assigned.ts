/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ServerTriggerDefinition } from '@kbn/workflows-extensions/server';
import {
  EPISODE_ASSIGNED_EVENT_TYPE,
  type EpisodeAssignedEvent,
} from '../../alert_action_event_publisher/events';
import type { AlertActionWorkflowTriggerBinding } from './types';

export const EPISODE_ASSIGNED_TRIGGER_ID = 'alerting_v2.episode-assigned' as const;

const episodeAssignedPayloadSchema = z
  .object({
    occurredAt: z.string().describe(
      i18n.translate('xpack.alertingVTwo.triggers.episodeAssigned.schema.occurredAt', {
        defaultMessage: 'ISO timestamp of when the assignment occurred.',
      })
    ),
    groupHash: z.string().describe(
      i18n.translate('xpack.alertingVTwo.triggers.episodeAssigned.schema.groupHash', {
        defaultMessage: 'Stable hash of the alert grouping the episode belongs to.',
      })
    ),
    episodeId: z.string().describe(
      i18n.translate('xpack.alertingVTwo.triggers.episodeAssigned.schema.episodeId', {
        defaultMessage: 'Identifier of the alerting episode whose assignee changed.',
      })
    ),
    ruleId: z.string().describe(
      i18n.translate('xpack.alertingVTwo.triggers.episodeAssigned.schema.ruleId', {
        defaultMessage: 'Identifier of the alerting rule the episode belongs to.',
      })
    ),
    spaceId: z.string().describe(
      i18n.translate('xpack.alertingVTwo.triggers.episodeAssigned.schema.spaceId', {
        defaultMessage: 'Kibana space the episode lives in.',
      })
    ),
    actorUid: z
      .string()
      .nullable()
      .describe(
        i18n.translate('xpack.alertingVTwo.triggers.episodeAssigned.schema.actorUid', {
          defaultMessage:
            'User-profile uid of the actor who changed the assignee, or null when performed by an internal/system context.',
        })
      ),
    assigneeUid: z
      .string()
      .nullable()
      .describe(
        i18n.translate('xpack.alertingVTwo.triggers.episodeAssigned.schema.assigneeUid', {
          defaultMessage:
            'User-profile uid of the new assignee, or null when the episode was unassigned.',
        })
      ),
  })
  .strict();

const definition: ServerTriggerDefinition<typeof episodeAssignedPayloadSchema> = {
  id: EPISODE_ASSIGNED_TRIGGER_ID,
  eventSchema: episodeAssignedPayloadSchema,
};

/**
 * Binding from the bus `episode.assigned` event to the
 * `alerting_v2.episode-assigned` workflow trigger.
 *
 * Adding a new field to either side requires updating
 * {@link episodeAssignedPayloadSchema} and {@link episodeAssignedTrigger.toPayload}
 * together so the registered schema and the runtime payload stay in lockstep.
 */
export const episodeAssignedTrigger: AlertActionWorkflowTriggerBinding<
  EpisodeAssignedEvent,
  typeof episodeAssignedPayloadSchema
> = {
  eventType: EPISODE_ASSIGNED_EVENT_TYPE,
  triggerId: EPISODE_ASSIGNED_TRIGGER_ID,
  definition,
  toPayload: (event) => ({
    occurredAt: event.occurredAt,
    groupHash: event.groupHash,
    episodeId: event.episodeId,
    ruleId: event.ruleId,
    spaceId: event.spaceId,
    actorUid: event.actorUid,
    assigneeUid: event.payload.assigneeUid,
  }),
};
