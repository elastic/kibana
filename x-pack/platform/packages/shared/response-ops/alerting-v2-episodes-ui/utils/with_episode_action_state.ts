/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import type { AlertEpisodeGroupAction, EpisodeActionState } from '../types/action';

/**
 * Tells whether an action state query has loaded the data for its current
 * key. A failed query, or one still showing the data of a previous key, has
 * not: its data can't be read as "no actions".
 */
export const isEpisodeActionStateLoaded = ({
  isSuccess,
  isPreviousData,
}: {
  isSuccess: boolean;
  isPreviousData: boolean;
}): boolean => isSuccess && !isPreviousData;

const toAckAction = (value: string | null | undefined): AlertEpisode['last_ack_action'] =>
  value === 'ack' || value === 'unack' ? value : null;

const toSnoozeAction = (value: string | null | undefined): AlertEpisode['last_snooze_action'] =>
  value === 'snooze' || value === 'unsnooze' ? value : null;

/**
 * Adds the action columns to an episode loaded with `useFetchEpisodeQuery`,
 * which only reads the rule events. Episode actions (ack, unack, snooze, tags,
 * assignee) read these columns to decide what to show.
 */
export const withEpisodeActionState = (
  episode: AlertEpisode | undefined,
  episodeAction: EpisodeActionState | undefined,
  groupAction: AlertEpisodeGroupAction | undefined
): AlertEpisode | undefined => {
  if (!episode) {
    return undefined;
  }

  return {
    ...episode,
    last_ack_action: toAckAction(episodeAction?.lastAckAction),
    last_assignee_uid: episodeAction?.lastAssigneeUid ?? null,
    last_tags: episodeAction?.tags ?? [],
    last_snooze_action: toSnoozeAction(groupAction?.lastSnoozeAction),
    snoozed_until: groupAction?.snoozedUntil ?? null,
  };
};
