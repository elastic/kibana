/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiTitleSize } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { AlertEpisodeStatus, RuleResponse } from '@kbn/alerting-v2-schemas';
import { AlertEpisodeStatusBadges } from '../status/status_badges';
import { AlertEpisodeTags } from '../actions/tags';
import type { EpisodeActionState, AlertEpisodeGroupAction } from '../../types/action';
import * as i18n from './translations';

export interface AlertEpisodeDetailsHeaderProps {
  isLoadingEpisode: boolean;
  isRuleLoading: boolean;
  isRuleNotFound: boolean;
  ruleId: string | undefined;
  rule: RuleResponse | undefined;
  tags: string[];
  status: AlertEpisodeStatus | undefined;
  episodeAction: EpisodeActionState | undefined;
  groupAction: AlertEpisodeGroupAction | undefined;
  titleSize?: EuiTitleSize;
}

export const AlertEpisodeDetailsHeader = ({
  isLoadingEpisode,
  isRuleLoading,
  isRuleNotFound,
  ruleId,
  rule,
  tags,
  status,
  episodeAction,
  groupAction,
  titleSize = 'l',
}: AlertEpisodeDetailsHeaderProps) => {
  const isLoading = isLoadingEpisode || (Boolean(ruleId) && isRuleLoading);
  const titleContent = isLoading
    ? i18n.HEADER_LOADING_TITLE
    : isRuleNotFound
    ? i18n.HEADER_DELETED_RULE_TITLE
    : rule?.metadata.name ?? i18n.HEADER_EPISODE_TITLE_FALLBACK;
  const description = rule?.metadata.description;
  const showTags = tags.length > 0;

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size={titleSize}>
            <h1 data-test-subj="alertingV2EpisodeDetailsHeaderTitle">{titleContent}</h1>
          </EuiTitle>
        </EuiFlexItem>
        {status ? (
          <EuiFlexItem grow={false}>
            <AlertEpisodeStatusBadges
              status={status}
              episodeAction={episodeAction}
              groupAction={groupAction}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {isRuleNotFound && ruleId ? (
        <>
          <EuiSpacer size="xs" />
          <EuiText
            size="xs"
            color="subdued"
            data-test-subj="alertingV2EpisodeDetailsHeaderDeletedRuleId"
          >
            {ruleId}
          </EuiText>
        </>
      ) : null}
      {description ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {description}
          </EuiText>
        </>
      ) : null}
      {showTags ? (
        <>
          <EuiSpacer size="s" />
          <div data-test-subj="alertingV2EpisodeDetailsHeaderTags">
            <AlertEpisodeTags tags={tags} />
          </div>
        </>
      ) : null}
    </>
  );
};
