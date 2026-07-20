/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { getRootEsqlQuery } from '@kbn/alerting-v2-schemas';
import { useFetchEpisodeQuery } from '../../hooks/use_fetch_episode_query';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { isRuleError, isRuleForbidden, isRuleLoaded, isRuleNotFound } from '../../types/rule_state';
import { useFetchEpisodeActions } from '../../hooks/use_fetch_episode_actions';
import { useFetchGroupActions } from '../../hooks/use_fetch_group_actions';
import { useAlertingEpisodeSourceDataView } from '../../hooks/use_alerting_episode_source_data_view';
import { parseEpisodeDataJson } from '../../utils/episode_grouping_data';
import { AlertEpisodeOverviewList, type GroupingRowStatus } from './overview_list';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

export interface AlertEpisodeOverviewListSectionProps {
  episodeId: string;
  groupHash: string | undefined;
  services: Pick<
    AlertEpisodeDetailsServices,
    'data' | 'http' | 'expressions' | 'spaces' | 'uiSettings' | 'userProfile' | 'dataViews'
  >;
}

export const AlertEpisodeOverviewListSection = ({
  episodeId,
  groupHash,
  services,
}: AlertEpisodeOverviewListSectionProps) => {
  const {
    data: episode,
    isLoading: isLoadingEpisode,
    isError: isEpisodeError,
  } = useFetchEpisodeQuery({ episodeId, services });

  const ruleId = episode?.['rule.id'];
  const triggeredAt = episode?.triggered_at;
  const durationMs = episode?.duration;

  const { ruleState } = useFetchRule({ id: ruleId, http: services.http });

  const {
    data: episodeActionsMap,
    isLoading: isLoadingEpisodeActions,
    isError: isEpisodeActionsError,
  } = useFetchEpisodeActions({ episodeIds: [episodeId], services });

  const {
    data: groupActionsMap,
    isLoading: isLoadingGroupActions,
    isError: isGroupActionsError,
  } = useFetchGroupActions({
    groupHashes: groupHash ? [groupHash] : [],
    services,
  });

  const sourceQuery =
    isRuleLoaded(ruleState) && ruleState.rule.query
      ? getRootEsqlQuery(ruleState.rule.query)
      : undefined;
  const { value: sourceDataView } = useAlertingEpisodeSourceDataView({
    query: sourceQuery,
    dataViews: services.dataViews,
    http: services.http,
  });
  if (isEpisodeError || isEpisodeActionsError || isGroupActionsError) {
    return (
      <EuiText size="s" color="danger" data-test-subj="alertingV2EpisodeOverviewListSectionError">
        {i18n.OVERVIEW_LIST_SECTION_LOAD_ERROR}
      </EuiText>
    );
  }

  if (isLoadingEpisode || isLoadingEpisodeActions || (groupHash && isLoadingGroupActions)) {
    return (
      <EuiLoadingSpinner size="m" data-test-subj="alertingV2EpisodeOverviewListSectionLoading" />
    );
  }

  const groupingFields = isRuleLoaded(ruleState) ? ruleState.rule.grouping?.fields ?? [] : [];
  const groupingStatus: GroupingRowStatus =
    isRuleForbidden(ruleState) || isRuleNotFound(ruleState)
      ? 'hidden'
      : isRuleError(ruleState)
      ? 'error'
      : 'visible';
  const groupingData = parseEpisodeDataJson(episode?.episode_data);
  const assigneeUid = episode?.last_assignee_uid ?? undefined;
  const episodeAction = episodeActionsMap?.get(episodeId);
  const groupAction = groupHash ? groupActionsMap?.get(groupHash) : undefined;

  return (
    <AlertEpisodeOverviewList
      groupingFields={groupingFields}
      groupingData={groupingData}
      groupingDataView={sourceDataView}
      groupingStatus={groupingStatus}
      triggeredAt={triggeredAt}
      durationMs={durationMs}
      assigneeUid={assigneeUid}
      episodeAction={episodeAction}
      groupAction={groupAction}
      userProfile={services.userProfile}
      dateFormat={services.uiSettings.get('dateFormat') ?? undefined}
    />
  );
};
