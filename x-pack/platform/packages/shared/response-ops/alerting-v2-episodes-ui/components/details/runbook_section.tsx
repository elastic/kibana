/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { useFetchEpisodeEventsQuery } from '../../hooks/use_fetch_episode_events_query';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { getRuleIdFromEpisodeRows } from '../../utils/episode_series_derived';
import { AlertEpisodeRunbook } from './runbook';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

export interface AlertEpisodeRunbookSectionProps {
  episodeId: string;
  services: AlertEpisodeDetailsServices;
}

export const AlertEpisodeRunbookSection = ({
  episodeId,
  services,
}: AlertEpisodeRunbookSectionProps) => {
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
    return <EuiLoadingSpinner size="m" data-test-subj="alertingV2EpisodeRunbookSectionLoading" />;
  }

  if (isEventsError || isRuleError) {
    return (
      <EuiText size="s" color="danger" data-test-subj="alertingV2EpisodeRunbookSectionError">
        {i18n.RUNBOOK_SECTION_LOAD_ERROR}
      </EuiText>
    );
  }

  const runbookContent = rule?.artifacts?.find((a) => a.type === 'runbook')?.value;

  return <AlertEpisodeRunbook content={runbookContent} />;
};
