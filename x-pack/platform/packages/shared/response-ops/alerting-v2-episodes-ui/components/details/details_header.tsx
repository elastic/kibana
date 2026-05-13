/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { AlertEpisodeStatusBadges } from '../status/status_badges';
import { AlertEpisodeTags } from '../actions/tags';
import type { EpisodeActionState, AlertEpisodeGroupAction } from '../../types/action';
import * as i18n from './translations';

export interface AlertEpisodeDetailsHeaderProps {
  title: string | undefined;
  description: string | undefined;
  tags: string[];
  status: AlertEpisodeStatus | undefined;
  episodeAction: EpisodeActionState | undefined;
  groupAction: AlertEpisodeGroupAction | undefined;
}

export const AlertEpisodeDetailsHeader = ({
  title,
  description,
  tags,
  status,
  episodeAction,
  groupAction,
}: AlertEpisodeDetailsHeaderProps) => {
  const showTags = tags.length > 0;
  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1
              data-test-subj={
                title
                  ? 'alertingV2EpisodeDetailsRuleTitle'
                  : 'alertingV2EpisodeDetailsHeaderLoadingTitle'
              }
            >
              {title ?? i18n.HEADER_LOADING_TITLE}
            </h1>
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
