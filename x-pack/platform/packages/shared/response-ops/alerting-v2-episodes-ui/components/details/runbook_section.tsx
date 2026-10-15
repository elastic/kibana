/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { getRunbookContent } from '@kbn/alerting-v2-rule-form';
import { useFetchEpisodeQuery } from '../../hooks/use_fetch_episode_query';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { isRuleError, isRuleLoaded, isRuleLoading } from '../../types/rule_state';
import { AlertEpisodeRunbook } from './runbook';
import { getPanelTextSize, getPanelTitleSize } from './panel_title_sizes';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

export interface AlertEpisodeRunbookSectionProps {
  episodeId: string;
  services: Pick<AlertEpisodeDetailsServices, 'data' | 'http' | 'spaces'>;
  /** Renders the heading and markdown one size down, for narrow hosts like the flyout. */
  compressed?: boolean;
  /** Renders a "Runbook" heading above the content. */
  showTitle?: boolean;
  /**
   * Clamps the content to a faded preview and renders a link to the full guide.
   * Without a handler there is nowhere to send the user, so the preview is not clamped.
   */
  onShowFullGuide?: () => void;
}

export const AlertEpisodeRunbookSection = ({
  episodeId,
  services,
  compressed,
  showTitle = false,
  onShowFullGuide,
}: AlertEpisodeRunbookSectionProps) => {
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
    return <EuiSkeletonText lines={4} data-test-subj="alertingV2EpisodeRunbookSectionLoading" />;
  }

  if (isEpisodeError || isRuleError(ruleState)) {
    return (
      <EuiText size="s" color="danger" data-test-subj="alertingV2EpisodeRunbookSectionError">
        {i18n.RUNBOOK_SECTION_LOAD_ERROR}
      </EuiText>
    );
  }

  if (!isRuleLoaded(ruleState)) {
    return null;
  }

  const runbookArtifact = ruleState.rule.artifacts?.find((a) => a.type === 'runbook');
  const runbookContent = runbookArtifact ? getRunbookContent(runbookArtifact) : undefined;
  const hasContent = Boolean(runbookContent && runbookContent.length > 0);
  const isPreview = Boolean(onShowFullGuide) && hasContent;

  return (
    <>
      {(showTitle || isPreview) && (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {showTitle && (
              <EuiFlexItem grow={false}>
                <EuiTitle size={getPanelTitleSize(compressed)}>
                  <h4 data-test-subj="alertingV2EpisodeRunbookSectionTitle">
                    {i18n.RUNBOOK_TITLE}
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
            )}
            {/* Pushes the link to the right edge of the row. */}
            <EuiFlexItem />
            {isPreview && (
              <EuiFlexItem grow={false}>
                <EuiText size={getPanelTextSize(compressed)}>
                  <EuiLink
                    onClick={onShowFullGuide}
                    data-test-subj="alertingV2EpisodeRunbookShowFullGuide"
                  >
                    {i18n.RUNBOOK_SHOW_FULL_GUIDE}
                  </EuiLink>
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      )}
      <AlertEpisodeRunbook content={runbookContent} compressed={compressed} preview={isPreview} />
    </>
  );
};
