/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AlertEpisodeMetadataDetailsListSection } from './metadata_details_list_section';
import { AlertEpisodeActionsOverviewSection } from './actions_overview_section';
import { AlertEpisodeLifecycleHeatmapSection } from './lifecycle_heatmap_section';
import { AlertEpisodeRuleOverviewPanelSection } from './rule_overview_panel_section';
import type { AlertEpisodeDetailsServices } from './types';

export interface AlertEpisodeOverviewSectionProps {
  episodeId: string;
  services: AlertEpisodeDetailsServices;
  getRuleDetailsHref: (ruleId: string) => string;
}

export const AlertEpisodeOverviewSection = ({
  episodeId,
  services,
  getRuleDetailsHref,
}: AlertEpisodeOverviewSectionProps) => (
  <>
    <AlertEpisodeMetadataDetailsListSection episodeId={episodeId} services={services} />
    <EuiSpacer size="l" />
    <AlertEpisodeActionsOverviewSection episodeId={episodeId} services={services} />
    <EuiSpacer size="l" />
    <AlertEpisodeLifecycleHeatmapSection episodeId={episodeId} services={services} />
    <EuiSpacer size="l" />
    <AlertEpisodeRuleOverviewPanelSection
      episodeId={episodeId}
      services={services}
      collapsible
      getRuleDetailsHref={getRuleDetailsHref}
    />
  </>
);
