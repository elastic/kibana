/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

export const EPISODE_ASSIGNED_TRIGGER_ID = 'alertingV2.episodeAssigned' as const;

export const episodeAssignedPayloadSchema = z
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

export type EpisodeAssignedPayload = z.infer<typeof episodeAssignedPayloadSchema>;

export const episodeAssignedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof episodeAssignedPayloadSchema
> = {
  id: EPISODE_ASSIGNED_TRIGGER_ID,
  eventSchema: episodeAssignedPayloadSchema,
};
