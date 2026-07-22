/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiTitleSize } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { AlertEpisodeStatusBadges } from '../status/status_badges';
import { AlertEpisodeSeverityBadge } from '../severity/episode_severity_badge';
import { isSupportedEpisodeSeverity } from '../severity/severity_utils';
import type { EpisodeActionState, AlertEpisodeGroupAction } from '../../types/action';
import { isRuleLoaded, isRuleLoading, type RuleState } from '../../types/rule_state';
import * as i18n from './translations';

export interface AlertEpisodeDetailsHeaderProps {
  isLoadingEpisode: boolean;
  ruleState: RuleState;
  status: AlertEpisodeStatus | undefined;
  severity: string | undefined | null;
  episodeAction: EpisodeActionState | undefined;
  groupAction: AlertEpisodeGroupAction | undefined;
  isFlapping?: boolean;
  titleSize?: EuiTitleSize;
}

export const AlertEpisodeDetailsHeader = ({
  isLoadingEpisode,
  ruleState,
  status,
  severity,
  episodeAction,
  groupAction,
  isFlapping = false,
  titleSize = 'l',
}: AlertEpisodeDetailsHeaderProps) => {
  const { euiTheme } = useEuiTheme();
  const isLoading = isLoadingEpisode || isRuleLoading(ruleState);
  const titleContent = isLoading
    ? i18n.HEADER_LOADING_TITLE
    : isRuleLoaded(ruleState)
    ? ruleState.rule.metadata.name
    : i18n.HEADER_EPISODE_TITLE_FALLBACK;
  const description = isRuleLoaded(ruleState) ? ruleState.rule.metadata.description : undefined;
  const showBadgeRow = Boolean(status) || isSupportedEpisodeSeverity(severity);

  return (
    <>
      {/* Single wrapping row (not a fixed title-row + badges-row split) so the badges naturally
          drop to a second line only when the title doesn't leave room for them, instead of
          always reserving a dedicated row for badges even when they'd fit next to the title.
          The badges are grouped into one flex item (wrap={false} inside) so they jump down
          together as a unit rather than wrapping individually mid-cluster. */}
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiTitle size={titleSize}>
            <h2 data-test-subj="alertingV2EpisodeDetailsHeaderTitle">{titleContent}</h2>
          </EuiTitle>
        </EuiFlexItem>
        {showBadgeRow ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
              {status ? (
                <EuiFlexItem grow={false}>
                  <AlertEpisodeStatusBadges
                    status={status}
                    episodeAction={episodeAction}
                    groupAction={groupAction}
                    isFlapping={isFlapping}
                  />
                </EuiFlexItem>
              ) : null}
              {isSupportedEpisodeSeverity(severity) ? (
                <EuiFlexItem grow={false}>
                  <AlertEpisodeSeverityBadge severity={severity} />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {description ? (
        <>
          <EuiSpacer size="s" />
          {/* EuiText has no font-weight prop, so a lighter-than-bold weight for the
              description has to be set via css instead of a design-token size/color prop. */}
          <EuiText
            size="s"
            color="subdued"
            css={css`
              font-weight: ${euiTheme.font.weight.medium};
            `}
          >
            {description}
          </EuiText>
        </>
      ) : null}
    </>
  );
};
