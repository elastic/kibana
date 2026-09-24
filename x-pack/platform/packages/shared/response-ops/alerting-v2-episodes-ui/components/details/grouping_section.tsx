/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiSkeletonRectangle, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { getRootEsqlQuery } from '@kbn/alerting-v2-schemas';
import { parseEpisodeDataJson } from '@kbn/alerting-v2-utils';
import { useFetchEpisodeQuery } from '../../hooks/use_fetch_episode_query';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { useAlertingEpisodeSourceDataView } from '../../hooks/use_alerting_episode_source_data_view';
import {
  isRuleError,
  isRuleForbidden,
  isRuleLoaded,
  isRuleLoading,
  isRuleNotFound,
} from '../../types/rule_state';
import { getNonEmptyGroupingFields } from '../../utils/episode_grouping_data';
import { AlertingEpisodeGroupingTags } from '../grouping/alerting_episode_grouping_tags';
import { getPanelTitleSize } from './panel_title_sizes';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

export interface AlertEpisodeGroupingSectionProps {
  episodeId: string;
  services: Pick<
    AlertEpisodeDetailsServices,
    'data' | 'http' | 'expressions' | 'spaces' | 'dataViews'
  >;
  /** Renders the title one step smaller, for narrow hosts like the details flyout. */
  compressed?: boolean;
}

/**
 * Renders the episode's grouping field badges in a bordered panel, using the same
 * badges as the episodes table rule cell.
 */
export const AlertEpisodeGroupingSection = ({
  episodeId,
  services,
  compressed,
}: AlertEpisodeGroupingSectionProps) => {
  const { data: episode, isLoading, isError } = useFetchEpisodeQuery({ episodeId, services });

  const ruleId = episode?.['rule.id'];
  const { ruleState } = useFetchRule({ id: ruleId, http: services.http });

  const sourceQuery =
    isRuleLoaded(ruleState) && ruleState.rule.query
      ? getRootEsqlQuery(ruleState.rule.query)
      : undefined;
  const { value: sourceDataView } = useAlertingEpisodeSourceDataView({
    query: sourceQuery,
    dataViews: services.dataViews,
    http: services.http,
  });

  if (isLoading || isRuleLoading(ruleState)) {
    return (
      <EuiPanel hasBorder paddingSize="m" data-test-subj="alertingV2EpisodeGroupingSectionLoading">
        <EuiSkeletonRectangle width="100%" height={20} />
      </EuiPanel>
    );
  }

  if (isError) {
    return (
      <EuiText size="s" color="danger" data-test-subj="alertingV2EpisodeGroupingSectionError">
        {i18n.METADATA_LIST_GROUPING_ERROR}
      </EuiText>
    );
  }

  // Without the rule there is no grouping definition to show at all, so the panel
  // is dropped rather than rendered empty.
  if (isRuleForbidden(ruleState) || isRuleNotFound(ruleState)) {
    return null;
  }

  if (isRuleError(ruleState)) {
    return (
      <EuiText size="s" color="danger" data-test-subj="alertingV2EpisodeGroupingSectionError">
        {i18n.METADATA_LIST_GROUPING_ERROR}
      </EuiText>
    );
  }

  const groupingFields = isRuleLoaded(ruleState) ? ruleState.rule.grouping?.fields ?? [] : [];
  const groupingData = parseEpisodeDataJson(episode?.episode_data);

  // The badges render nothing when no grouping field holds a value, which would
  // leave an empty bordered panel behind.
  if (getNonEmptyGroupingFields(groupingFields, groupingData, sourceDataView).length === 0) {
    return null;
  }

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="alertingV2EpisodeGroupingSection">
      <EuiTitle size={getPanelTitleSize(compressed)}>
        <h4>{i18n.METADATA_LIST_GROUPING_LABEL}</h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <AlertingEpisodeGroupingTags
        fields={groupingFields}
        data={groupingData}
        dataView={sourceDataView}
        data-test-subj="alertingV2EpisodeGroupingSectionTags"
      />
    </EuiPanel>
  );
};
