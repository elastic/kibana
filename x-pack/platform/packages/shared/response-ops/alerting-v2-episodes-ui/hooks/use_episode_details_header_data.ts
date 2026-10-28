/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AlertEpisode, AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import type { AlertEpisodeDetailsServices } from '../components/details/types';
import type { EpisodeActionState, AlertEpisodeGroupAction } from '../types/action';
import { isRuleLoading, type RuleState } from '../types/rule_state';
import { useFetchEpisodeQuery } from './use_fetch_episode_query';
import { useFetchEpisodeActions } from './use_fetch_episode_actions';
import { getGroupAction, useFetchGroupActions } from './use_fetch_group_actions';
import { useFetchRule } from './use_fetch_rule';
import { useEpisodeFlapping } from './use_episode_flapping';
import {
  isEpisodeActionStateLoaded,
  withEpisodeActionState,
} from '../utils/with_episode_action_state';

export interface UseEpisodeDetailsHeaderDataOptions {
  episodeId: string;
  /** Lets the series actions load in parallel with the episode when the caller already knows it. */
  groupHash: string | undefined;
  services: Pick<AlertEpisodeDetailsServices, 'data' | 'http' | 'expressions' | 'spaces'>;
}

export interface EpisodeDetailsHeaderData {
  isLoading: boolean;
  ruleState: RuleState;
  episode: AlertEpisode | undefined;
  status: AlertEpisodeStatus | undefined;
  severity: string | undefined | null;
  episodeAction: EpisodeActionState | undefined;
  groupAction: AlertEpisodeGroupAction | undefined;
  /**
   * `true` once the action state (ack, assignee, tags, snooze) of this episode
   * has loaded. Until then the episode has no action columns, so the actions
   * would be picked for the wrong state.
   */
  isActionStateLoaded: boolean;
  isFlapping: boolean;
}

/** Fetches and derives all data needed to render the episode details flyout header. */
export const useEpisodeDetailsHeaderData = ({
  episodeId,
  groupHash,
  services,
}: UseEpisodeDetailsHeaderDataOptions): EpisodeDetailsHeaderData => {
  const { data: episode, isLoading: isLoadingEpisode } = useFetchEpisodeQuery({
    episodeId,
    services,
  });

  const ruleId = episode?.['rule.id'];

  const episodeActionsQuery = useFetchEpisodeActions({ episodeIds: [episodeId], services });
  const { data: episodeActionsMap, isLoading: isLoadingEpisodeActions } = episodeActionsQuery;

  const resolvedGroupHash = groupHash ?? episode?.group_hash;
  const groupActionsQuery = useFetchGroupActions({
    groupHashes: resolvedGroupHash ? [resolvedGroupHash] : [],
    services,
  });
  const { data: groupActionsMap, isLoading: isLoadingGroupActions } = groupActionsQuery;

  const { ruleState } = useFetchRule({ id: ruleId, http: services.http });

  const { isFlapping } = useEpisodeFlapping({ episodeId, services });

  const status = episode?.['episode.status'];
  const severity = episode?.severity;
  const episodeAction = episodeActionsMap?.get(episodeId);
  const groupAction = resolvedGroupHash
    ? getGroupAction(groupActionsMap, ruleId, resolvedGroupHash)
    : undefined;

  const episodeWithActions = useMemo(
    () => withEpisodeActionState(episode, episodeAction, groupAction),
    [episode, episodeAction, groupAction]
  );

  const isActionStateLoaded =
    isEpisodeActionStateLoaded(episodeActionsQuery) &&
    (!resolvedGroupHash || isEpisodeActionStateLoaded(groupActionsQuery));

  const isLoading =
    isLoadingEpisode ||
    isLoadingEpisodeActions ||
    (Boolean(resolvedGroupHash) && isLoadingGroupActions) ||
    isRuleLoading(ruleState);

  return {
    isLoading,
    ruleState,
    episode: episodeWithActions,
    status,
    severity,
    episodeAction,
    groupAction,
    isActionStateLoaded,
    isFlapping,
  };
};
