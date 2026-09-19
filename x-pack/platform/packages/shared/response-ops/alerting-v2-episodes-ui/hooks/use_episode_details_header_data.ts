/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisode, AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import type { AlertEpisodeDetailsServices } from '../components/details/types';
import type { EpisodeActionState, AlertEpisodeGroupAction } from '../types/action';
import { isRuleLoading, type RuleState } from '../types/rule_state';
import { useFetchEpisodeQuery } from './use_fetch_episode_query';
import { useFetchEpisodeActions } from './use_fetch_episode_actions';
import { getGroupActionKey, useFetchGroupActions } from './use_fetch_group_actions';
import { useFetchRule } from './use_fetch_rule';
import { useEpisodeFlapping } from './use_episode_flapping';

export interface UseEpisodeDetailsHeaderDataOptions {
  episodeId: string;
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
    groupHash,
    services,
  });

  const ruleId = episode?.['rule.id'];

  const { data: episodeActionsMap, isLoading: isLoadingEpisodeActions } = useFetchEpisodeActions({
    episodeIds: [episodeId],
    services,
  });

  const resolvedGroupHash = episode?.group_hash;
  const { data: groupActionsMap, isLoading: isLoadingGroupActions } = useFetchGroupActions({
    groupHashes: resolvedGroupHash ? [resolvedGroupHash] : [],
    services,
  });

  const { ruleState } = useFetchRule({ id: ruleId, http: services.http });

  const { isFlapping } = useEpisodeFlapping({ episodeId, services });

  const status = episode?.['episode.status'];
  const severity = episode?.severity;
  const episodeAction = episodeActionsMap?.get(episodeId);
  const groupAction = resolvedGroupHash
    ? groupActionsMap?.get(getGroupActionKey(ruleId, resolvedGroupHash))
    : undefined;

  const isLoading =
    isLoadingEpisode ||
    isLoadingEpisodeActions ||
    (Boolean(resolvedGroupHash) && isLoadingGroupActions) ||
    isRuleLoading(ruleState);

  return {
    isLoading,
    ruleState,
    episode,
    status,
    severity,
    episodeAction,
    groupAction,
    isFlapping,
  };
};
