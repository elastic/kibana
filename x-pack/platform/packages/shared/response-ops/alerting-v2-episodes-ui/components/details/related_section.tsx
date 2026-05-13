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
import {
  getGroupHashFromEpisodeRows,
  getRuleIdFromEpisodeRows,
} from '../../utils/episode_series_derived';
import { AlertEpisodesRelated } from './related/related';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

export interface AlertEpisodesRelatedSectionProps {
  episodeId: string;
  services: AlertEpisodeDetailsServices;
  getEpisodeDetailsHref: (episodeId: string) => string;
  showHeading?: boolean;
  flush?: boolean;
}

export const AlertEpisodesRelatedSection = ({
  episodeId,
  services,
  getEpisodeDetailsHref,
  showHeading,
  flush,
}: AlertEpisodesRelatedSectionProps) => {
  const {
    data: eventRows,
    isLoading: isLoadingEvents,
    isError: isEventsError,
  } = useFetchEpisodeEventsQuery({ episodeId, data: services.data });
  const rows = eventRows ?? [];

  const ruleId = getRuleIdFromEpisodeRows(rows);
  const groupHash = getGroupHashFromEpisodeRows(rows);

  const {
    data: rule,
    isLoading: isLoadingRule,
    isError: isRuleError,
  } = useFetchRule({ id: ruleId, http: services.http });

  if (isLoadingEvents || (ruleId && isLoadingRule)) {
    return <EuiLoadingSpinner size="m" data-test-subj="alertingV2EpisodesRelatedSectionLoading" />;
  }

  if (isEventsError || isRuleError || !rule) {
    return (
      <EuiText size="s" color="danger" data-test-subj="alertingV2EpisodesRelatedSectionError">
        {i18n.RELATED_SECTION_LOAD_ERROR}
      </EuiText>
    );
  }

  return (
    <AlertEpisodesRelated
      currentEpisodeId={episodeId}
      groupHash={groupHash}
      rule={rule}
      ruleId={ruleId}
      getEpisodeDetailsHref={getEpisodeDetailsHref}
      showHeading={showHeading}
      flush={flush}
    />
  );
};
