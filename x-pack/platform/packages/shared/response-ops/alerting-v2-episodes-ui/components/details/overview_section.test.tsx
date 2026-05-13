/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { AlertEpisodeOverviewSection } from './overview_section';
import type { AlertEpisodeDetailsServices } from './types';

jest.mock('./metadata_details_list_section', () => ({
  AlertEpisodeMetadataDetailsListSection: jest.fn(() => (
    <div data-test-subj="metadataDetailsListSectionStub" />
  )),
}));

jest.mock('./actions_overview_section', () => ({
  AlertEpisodeActionsOverviewSection: jest.fn(() => (
    <div data-test-subj="actionsOverviewSectionStub" />
  )),
}));

jest.mock('./lifecycle_heatmap_section', () => ({
  AlertEpisodeLifecycleHeatmapSection: jest.fn(() => (
    <div data-test-subj="lifecycleHeatmapSectionStub" />
  )),
}));

jest.mock('./rule_overview_panel_section', () => ({
  AlertEpisodeRuleOverviewPanelSection: jest.fn(() => (
    <div data-test-subj="ruleOverviewPanelSectionStub" />
  )),
}));

const { AlertEpisodeRuleOverviewPanelSection } = jest.requireMock(
  './rule_overview_panel_section'
) as {
  AlertEpisodeRuleOverviewPanelSection: jest.Mock;
};

const mockServices: AlertEpisodeDetailsServices = {
  data: dataPluginMock.createStartContract(),
  http: httpServiceMock.createStartContract(),
  expressions: {} as ExpressionsStart,
  userProfile: {} as UserProfileService,
};

const getRuleDetailsHref = (ruleId: string) => `/rules/${ruleId}`;

describe('AlertEpisodeOverviewSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stacks all four sub-sections', () => {
    render(
      <AlertEpisodeOverviewSection
        episodeId="ep-1"
        services={mockServices}
        getRuleDetailsHref={getRuleDetailsHref}
      />
    );

    expect(screen.getByTestId('metadataDetailsListSectionStub')).toBeInTheDocument();
    expect(screen.getByTestId('actionsOverviewSectionStub')).toBeInTheDocument();
    expect(screen.getByTestId('lifecycleHeatmapSectionStub')).toBeInTheDocument();
    expect(screen.getByTestId('ruleOverviewPanelSectionStub')).toBeInTheDocument();
  });

  it('passes collapsible=true to the rule overview panel section', () => {
    render(
      <AlertEpisodeOverviewSection
        episodeId="ep-1"
        services={mockServices}
        getRuleDetailsHref={getRuleDetailsHref}
      />
    );

    expect(AlertEpisodeRuleOverviewPanelSection).toHaveBeenCalledWith(
      expect.objectContaining({
        collapsible: true,
        episodeId: 'ep-1',
        getRuleDetailsHref,
      }),
      expect.anything()
    );
  });
});
