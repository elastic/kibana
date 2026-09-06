/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { parseEpisodeDataJson } from '@kbn/alerting-v2-utils';
import { useFetchEpisodeQuery } from './use_fetch_episode_query';
import { useFetchRule } from './use_fetch_rule';
import { isRuleLoaded, type RuleState } from '../types/rule_state';

export interface UseEpisodeServices {
  data: DataPublicPluginStart;
  spaces: SpacesPluginStart;
  http: HttpStart;
}

export interface UseEpisodeOptions {
  episodeId: string | undefined;
  groupHash?: string;
  services: UseEpisodeServices;
}

export interface UseEpisodeResult {
  episode: AlertEpisode | undefined;
  ruleState: RuleState;
  ruleName: string | undefined;
  groupingFields: readonly string[] | undefined;
  isRuleLoaded: boolean;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Loads an episode and its rule, and derives display name and grouping fields.
 */
export const useEpisode = ({
  episodeId,
  groupHash,
  services,
}: UseEpisodeOptions): UseEpisodeResult => {
  const {
    data: episode,
    isLoading,
    isError,
  } = useFetchEpisodeQuery({
    episodeId,
    groupHash,
    services: { data: services.data, spaces: services.spaces },
  });

  const { ruleState } = useFetchRule({
    id: episode?.['rule.id'],
    http: services.http,
  });

  const ruleLoaded = isRuleLoaded(ruleState);
  const episodeData = parseEpisodeDataJson(episode?.episode_data);
  const episodeDataRuleName =
    typeof episodeData.rule_name === 'string' ? episodeData.rule_name : undefined;
  const loadedRuleName = ruleLoaded ? ruleState.rule.metadata.name : undefined;

  return {
    episode,
    ruleState,
    ruleName: loadedRuleName ?? episodeDataRuleName,
    groupingFields: ruleLoaded ? ruleState.rule.grouping?.fields : undefined,
    isRuleLoaded: ruleLoaded,
    isLoading,
    isError,
  };
};
