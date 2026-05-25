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
import { createMockSpaces } from '../../hooks/test_utils';
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

const { AlertEpisodeActionsOverviewSection } = jest.requireMock('./actions_overview_section') as {
  AlertEpisodeActionsOverviewSection: jest.Mock;
};

const mockServices: AlertEpisodeDetailsServices = {
  data: dataPluginMock.createStartContract(),
  http: httpServiceMock.createStartContract(),
  expressions: {} as ExpressionsStart,
  userProfile: {} as UserProfileService,
  spaces: createMockSpaces(),
};

describe('AlertEpisodeOverviewSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stacks all four sub-sections', () => {
    render(
      <AlertEpisodeOverviewSection episodeId="ep-1" groupHash="gh-1" services={mockServices} />
    );

    expect(screen.getByTestId('metadataDetailsListSectionStub')).toBeInTheDocument();
    expect(screen.getByTestId('actionsOverviewSectionStub')).toBeInTheDocument();
    expect(screen.getByTestId('lifecycleHeatmapSectionStub')).toBeInTheDocument();
    expect(screen.getByTestId('ruleOverviewPanelSectionStub')).toBeInTheDocument();
  });

  it('forwards groupHash to the actions overview section', () => {
    render(
      <AlertEpisodeOverviewSection episodeId="ep-1" groupHash="gh-1" services={mockServices} />
    );

    expect(AlertEpisodeActionsOverviewSection).toHaveBeenCalledWith(
      expect.objectContaining({ episodeId: 'ep-1', groupHash: 'gh-1' }),
      expect.anything()
    );
  });

  it('passes collapsible=true to the rule overview panel section', () => {
    render(
      <AlertEpisodeOverviewSection episodeId="ep-1" groupHash="gh-1" services={mockServices} />
    );

    expect(AlertEpisodeRuleOverviewPanelSection).toHaveBeenCalledWith(
      expect.objectContaining({
        collapsible: true,
        episodeId: 'ep-1',
      }),
      expect.anything()
    );
  });
});
