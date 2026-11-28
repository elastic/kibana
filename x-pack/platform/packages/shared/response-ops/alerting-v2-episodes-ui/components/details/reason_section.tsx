/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { useFetchEpisodeQuery } from '../../hooks/use_fetch_episode_query';
import { getPanelTextSize, getPanelTitleSize } from './panel_title_sizes';
import { EpisodeReasonText } from './reason_text';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

export interface AlertEpisodeReasonSectionProps {
  episodeId: string;
  services: Pick<AlertEpisodeDetailsServices, 'data' | 'spaces'>;
  /** Renders the title one step smaller, for narrow hosts like the details flyout. */
  compressed?: boolean;
}

/**
 * Renders the rule reason of the episode in a bordered panel. Most episodes have none (signals,
 * external alerts, rules without a reason), so the panel is dropped while loading, on error and
 * when there is nothing to show rather than rendered empty.
 */
export const AlertEpisodeReasonSection = ({
  episodeId,
  services,
  compressed,
}: AlertEpisodeReasonSectionProps) => {
  const { data: episode } = useFetchEpisodeQuery({ episodeId, services });
  const reason = episode?.reason;

  if (!reason) {
    return null;
  }

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="alertingV2EpisodeReasonSection">
      <EuiTitle size={getPanelTitleSize(compressed)}>
        <h4>{i18n.METADATA_LIST_REASON_LABEL}</h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EpisodeReasonText
        reason={reason}
        size={getPanelTextSize(compressed)}
        data-test-subj="alertingV2EpisodeReasonSectionText"
      />
    </EuiPanel>
  );
};
