/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiSkeletonTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { InfoBlocks } from '@kbn/flyout-info-blocks';
import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions/types';
import type { AlertEpisodeDetailsServices } from '@kbn/alerting-v2-episodes-ui/components/details/types';
import { useEpisodeDetailsHeaderData } from '@kbn/alerting-v2-episodes-ui/hooks/use_episode_details_header_data';
import { useEpisodeDetailsHeaderParts } from '@kbn/alerting-v2-episodes-ui/components/details/use_episode_details_header_parts';
import { HEADER_EPISODE_TITLE_FALLBACK } from '@kbn/alerting-v2-episodes-ui/components/details/translations';
import { isRuleLoaded } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_rule';

export interface EpisodeDocViewerHeaderProps {
  episodeId: string;
  groupHash: string | undefined;
  services: Pick<
    AlertEpisodeDetailsServices,
    'data' | 'http' | 'expressions' | 'spaces' | 'uiSettings' | 'userProfile'
  >;
  actions?: EpisodeAction[];
  onActionSuccess: () => void;
}

/**
 * Renders the title, badges and info blocks of the alerts page flyout header in the Discover
 * document viewer, which has no flyout template header yet.
 */
export const EpisodeDocViewerHeader = ({
  episodeId,
  groupHash,
  services,
  actions,
  onActionSuccess,
}: EpisodeDocViewerHeaderProps) => {
  const headerData = useEpisodeDetailsHeaderData({ episodeId, groupHash, services });
  const { description, badges, infoBlocks } = useEpisodeDetailsHeaderParts({
    episodeId,
    headerData,
    services,
    actions,
    onActionSuccess,
  });

  const { isLoading, ruleState } = headerData;
  const ruleName = isRuleLoaded(ruleState) ? ruleState.rule.metadata.name : undefined;

  return (
    <div data-test-subj="alertingV2EpisodeDocViewerHeader">
      {isLoading ? (
        <EuiSkeletonTitle size="xs" />
      ) : (
        <EuiTitle size="s">
          <h3 data-test-subj="alertingV2EpisodeDocViewerHeaderTitle">
            {ruleName ?? HEADER_EPISODE_TITLE_FALLBACK}
          </h3>
        </EuiTitle>
      )}
      {description && (
        <EuiText size="s" color="subdued">
          {description}
        </EuiText>
      )}
      {badges.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiBadgeGroup gutterSize="s">
            {badges.map(({ id, label, color, iconType }) => (
              <EuiBadge key={id} color={color} iconType={iconType}>
                {label}
              </EuiBadge>
            ))}
          </EuiBadgeGroup>
        </>
      )}
      <EuiSpacer size="m" />
      <InfoBlocks items={infoBlocks} />
    </div>
  );
};
