/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { useFetchEpisodeQuery } from '../../hooks/use_fetch_episode_query';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { AlertEpisodeRunbook } from './runbook';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

export interface AlertEpisodeRunbookSectionProps {
  episodeId: string;
  services: Pick<AlertEpisodeDetailsServices, 'data' | 'http' | 'spaces'>;
}

export const AlertEpisodeRunbookSection = ({
  episodeId,
  services,
}: AlertEpisodeRunbookSectionProps) => {
  const {
    data: episode,
    isLoading: isLoadingEpisode,
    isError: isEpisodeError,
  } = useFetchEpisodeQuery({ episodeId, services });

  const ruleId = episode?.['rule.id'];

  const { rule, isRuleLoading, isRuleNotFound, isRuleError } = useFetchRule({
    id: ruleId,
    http: services.http,
  });

  if (isLoadingEpisode || (ruleId && isRuleLoading)) {
    return <EuiLoadingSpinner size="m" data-test-subj="alertingV2EpisodeRunbookSectionLoading" />;
  }

  if (isEpisodeError || isRuleError) {
    return (
      <EuiText size="s" color="danger" data-test-subj="alertingV2EpisodeRunbookSectionError">
        {i18n.RUNBOOK_SECTION_LOAD_ERROR}
      </EuiText>
    );
  }

  if (isRuleNotFound) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="alertingV2EpisodeRunbookSectionRuleDeleted">
        {i18n.RUNBOOK_SECTION_RULE_DELETED}
      </EuiText>
    );
  }

  const runbookContent = rule?.artifacts?.find((a) => a.type === 'runbook')?.value;

  return <AlertEpisodeRunbook content={runbookContent} />;
};
