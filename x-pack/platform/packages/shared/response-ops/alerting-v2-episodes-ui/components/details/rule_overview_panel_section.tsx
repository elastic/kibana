/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiToolTip,
  EuiPanel,
  EuiSkeletonText,
  EuiSkeletonTitle,
  EuiSpacer,
} from '@elastic/eui';
import { useFetchEpisodeQuery } from '../../hooks/use_fetch_episode_query';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import {
  getRuleIdFromRuleState,
  isRuleError,
  isRuleLoaded,
  isRuleLoading,
} from '../../types/rule_state';
import { AlertEpisodeRuleOverviewPanel } from './rule_overview_panel';
import type { AlertEpisodeDetailsServices } from './types';
import { CopyableShortId } from '../copyable_short_id';
import { getPanelTextSize } from './panel_title_sizes';
import * as cellI18n from '../translations';
import * as i18n from './translations';

export interface AlertEpisodeRuleOverviewPanelSectionProps {
  episodeId: string;
  services: Pick<AlertEpisodeDetailsServices, 'data' | 'http' | 'spaces'>;
  getRuleDetailsHref: (ruleId: string) => string;
  /** Renders the "Rule overview" heading above the panel. Defaults to true. */
  showTitle?: boolean;
  /** Renders the rule name and link one step smaller, for narrow hosts like the details flyout. */
  compressed?: boolean;
}

export const AlertEpisodeRuleOverviewPanelSection = ({
  episodeId,
  services,
  getRuleDetailsHref,
  showTitle,
  compressed,
}: AlertEpisodeRuleOverviewPanelSectionProps) => {
  const {
    data: episode,
    isLoading: isLoadingEpisode,
    isError: isEpisodeError,
  } = useFetchEpisodeQuery({ episodeId, services });

  const ruleId = episode?.['rule.id'];

  const { ruleState } = useFetchRule({
    id: ruleId,
    http: services.http,
  });

  if (isLoadingEpisode || (ruleId && isRuleLoading(ruleState))) {
    return (
      <EuiPanel
        hasBorder
        paddingSize="m"
        data-test-subj="alertingV2EpisodeRuleOverviewPanelSectionLoading"
      >
        <EuiSkeletonTitle size="xs" />
        <EuiSpacer size="s" />
        <EuiSkeletonText lines={3} size="s" />
      </EuiPanel>
    );
  }
  if (isEpisodeError || isRuleError(ruleState)) {
    return (
      <EuiEmptyPrompt
        data-test-subj="alertingV2EpisodeRuleOverviewPanelSectionError"
        iconType="warning"
        color="danger"
        titleSize="xs"
        title={<h3>{i18n.RULE_OVERVIEW_PANEL_SECTION_ERROR_TITLE}</h3>}
      />
    );
  }

  // The rule is gone or not visible to us. Same treatment as the episodes table rule cell,
  // so the id is still there to copy.
  if (!isRuleLoaded(ruleState)) {
    return (
      <EuiPanel hasBorder paddingSize="m" data-test-subj="alertingV2EpisodeRuleUnavailable">
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={cellI18n.RULE_CELL_MISSING_RULE_TOOLTIP}>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} tabIndex={0}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="linkSlash" size="s" color="subdued" aria-hidden={true} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size={getPanelTextSize(compressed)} color="subdued">
                    {cellI18n.RULE_CELL_MISSING_RULE_LABEL}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiToolTip>
          </EuiFlexItem>
          {ruleId && (
            <EuiFlexItem grow={false}>
              <CopyableShortId
                id={ruleId}
                copyTooltip={cellI18n.getRuleCellCopyRuleIdTooltip(ruleId)}
                copiedTooltip={cellI18n.RULE_CELL_RULE_ID_COPIED}
                data-test-subj="alertingV2EpisodeRuleUnavailableId"
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  const resolvedRuleId = getRuleIdFromRuleState(ruleState);

  if (!resolvedRuleId) {
    return null;
  }

  return (
    <AlertEpisodeRuleOverviewPanel
      rule={ruleState.rule}
      ruleDetailsHref={getRuleDetailsHref(resolvedRuleId)}
      showTitle={showTitle}
      compressed={compressed}
    />
  );
};
