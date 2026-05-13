/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { useFetchEpisodeEventsQuery } from '../../hooks/use_fetch_episode_events_query';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { getRuleIdFromEpisodeRows } from '../../utils/episode_series_derived';
import { AlertEpisodeRuleOverviewPanel } from './rule_overview_panel';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

export interface AlertEpisodeRuleOverviewPanelSectionProps {
  episodeId: string;
  services: AlertEpisodeDetailsServices;
  collapsible?: boolean;
  getRuleDetailsHref: (ruleId: string) => string;
}

export const AlertEpisodeRuleOverviewPanelSection = ({
  episodeId,
  services,
  collapsible,
  getRuleDetailsHref,
}: AlertEpisodeRuleOverviewPanelSectionProps) => {
  const {
    data: eventRows,
    isLoading: isLoadingEvents,
    isError: isEventsError,
  } = useFetchEpisodeEventsQuery({ episodeId, data: services.data });
  const rows = eventRows ?? [];

  const ruleId = getRuleIdFromEpisodeRows(rows);

  const {
    data: rule,
    isLoading: isLoadingRule,
    isError: isRuleError,
  } = useFetchRule({ id: ruleId, http: services.http });

  if (isLoadingEvents || (ruleId && isLoadingRule)) {
    return (
      <EuiLoadingSpinner
        size="m"
        data-test-subj="alertingV2EpisodeRuleOverviewPanelSectionLoading"
      />
    );
  }

  if (isEventsError || isRuleError || !ruleId || !rule) {
    return (
      <EuiEmptyPrompt
        data-test-subj="alertingV2EpisodeRuleOverviewPanelSectionError"
        iconType="alert"
        color="danger"
        titleSize="xs"
        title={<h3>{i18n.RULE_OVERVIEW_PANEL_SECTION_ERROR_TITLE}</h3>}
      />
    );
  }

  return (
    <AlertEpisodeRuleOverviewPanel
      rule={rule}
      collapsible={collapsible ?? false}
      getRuleDetailsHref={getRuleDetailsHref}
    />
  );
};
