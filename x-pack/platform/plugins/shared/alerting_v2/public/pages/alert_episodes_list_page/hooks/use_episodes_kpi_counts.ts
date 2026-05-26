/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { TimeRange } from '@kbn/es-query';
import type { AlertEpisode, EpisodesFilterState } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { useFetchAlertingEpisodesQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_alerting_episodes_query';
import type { UseFetchAlertingEpisodesQueryOptions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_alerting_episodes_query';
import { useFetchRules } from '../../../hooks/use_fetch_rules';
import { buildRulesListFilter } from '../../rules_list_page/utils';

const KPI_COUNT_PAGE_SIZE = 1000;

const HIGH_SEVERITY_VALUES = new Set(['HIGH', 'CRITICAL']);

const getEpisodeSeverity = (episode: AlertEpisode): string | undefined => {
  if (!episode.episode_data) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(episode.episode_data) as { severity?: string };
    return parsed.severity?.toUpperCase();
  } catch {
    return undefined;
  }
};

const buildCountFilterState = (filterState: EpisodesFilterState): EpisodesFilterState => ({
  queryString: filterState.queryString,
  ruleId: filterState.ruleId,
  tags: filterState.tags,
  status: undefined,
  alertsKpi: undefined,
  actionKpi: undefined,
  highSeverityOnly: undefined,
  assigneeUid: undefined,
});

export interface EpisodesKpiCounts {
  activeAlerts: number;
  highSeverityAlerts: number;
  totalAlerts: number;
  assignedToMe: number;
  unassigned: number;
  acknowledged: number;
  snoozed: number;
  totalRules: number;
  firingRules: number;
  enabledRules: number;
}

interface UseEpisodesKpiCountsParams {
  filterState: EpisodesFilterState;
  timeRange: TimeRange;
  currentUserProfileUid?: string;
  services: UseFetchAlertingEpisodesQueryOptions['services'];
}

export const useEpisodesKpiCounts = ({
  filterState,
  timeRange,
  currentUserProfileUid,
  services,
}: UseEpisodesKpiCountsParams) => {
  const countFilterState = useMemo(() => buildCountFilterState(filterState), [filterState]);

  const { data: episodesForCounts, isLoading: isLoadingEpisodes } = useFetchAlertingEpisodesQuery({
    pageSize: KPI_COUNT_PAGE_SIZE,
    services,
    filterState: countFilterState,
    timeRange,
    currentUserProfileUid,
  });

  const { data: allRulesData, isLoading: isLoadingAllRules } = useFetchRules({
    page: 1,
    perPage: 1,
  });

  const { data: enabledRulesData, isLoading: isLoadingEnabledRules } = useFetchRules({
    page: 1,
    perPage: 1,
    filter: buildRulesListFilter({ enabled: 'true' }),
  });

  const episodeCounts = useMemo((): Omit<
    EpisodesKpiCounts,
    'totalRules' | 'firingRules' | 'enabledRules'
  > => {
    const episodes = episodesForCounts ?? [];

    return {
      activeAlerts: episodes.filter(
        (ep) => ep['episode.status'] === 'active' && ep.last_deactivate_action !== 'deactivate'
      ).length,
      highSeverityAlerts: episodes.filter((ep) => {
        const severity = getEpisodeSeverity(ep);
        return severity != null && HIGH_SEVERITY_VALUES.has(severity);
      }).length,
      totalAlerts: episodes.length,
      assignedToMe: currentUserProfileUid
        ? episodes.filter((ep) => ep.last_assignee_uid === currentUserProfileUid).length
        : 0,
      unassigned: episodes.filter((ep) => ep.last_assignee_uid == null).length,
      acknowledged: episodes.filter((ep) => ep.last_ack_action === 'ack').length,
      snoozed: episodes.filter((ep) => ep.last_snooze_action === 'snooze').length,
    };
  }, [episodesForCounts, currentUserProfileUid]);

  const firingRules = useMemo(() => {
    const activeRuleIds = new Set(
      (episodesForCounts ?? [])
        .filter(
          (ep) => ep['episode.status'] === 'active' && ep.last_deactivate_action !== 'deactivate'
        )
        .map((ep) => ep['rule.id'])
    );
    return activeRuleIds.size;
  }, [episodesForCounts]);

  return {
    counts: {
      ...episodeCounts,
      totalRules: allRulesData?.total ?? 0,
      enabledRules: enabledRulesData?.total ?? 0,
      firingRules,
    },
    isLoading: isLoadingEpisodes || isLoadingAllRules || isLoadingEnabledRules,
  };
};
