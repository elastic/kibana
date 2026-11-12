/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { RuleState } from '@kbn/alerting-v2-episodes-ui/types/rule_state';
import { RuleStateStatus } from '@kbn/alerting-v2-episodes-ui/types/rule_state';
import { AlertEpisodeOverviewTab } from '@kbn/alerting-v2-episodes-ui/components/details/overview_tab';
import { AlertEpisodeRunbookFlyout } from '@kbn/alerting-v2-episodes-ui/components/details/runbook_flyout';
import { useEpisodeDetailsHeaderData } from '@kbn/alerting-v2-episodes-ui/hooks/use_episode_details_header_data';
import { createMockServices } from '@kbn/alerting-v2-episodes-ui/hooks/test_utils';
import { EpisodeOverviewDocView } from './episode_overview_doc_view';

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_episode_details_header_data');
jest.mock('@kbn/alerting-v2-episodes-ui/components/details/overview_tab', () => ({
  AlertEpisodeOverviewTab: jest.fn(({ onShowFullGuide }: { onShowFullGuide: () => void }) => (
    <button onClick={onShowFullGuide}>full guide</button>
  )),
}));
jest.mock('@kbn/alerting-v2-episodes-ui/components/details/runbook_flyout', () => ({
  AlertEpisodeRunbookFlyout: jest.fn(({ onClose }: { onClose: () => void }) => (
    <button onClick={onClose}>close runbook</button>
  )),
}));

const mockUseEpisodeDetailsHeaderData = jest.mocked(useEpisodeDetailsHeaderData);
const mockOverviewTab = jest.mocked(AlertEpisodeOverviewTab);
const mockRunbookFlyout = jest.mocked(AlertEpisodeRunbookFlyout);
const mockServices = createMockServices();
const mockEpisode = { 'episode.id': 'ep-1', 'rule.id': 'rule-1' } as AlertEpisode;
const mockRuleState = {
  status: RuleStateStatus.loaded,
  ruleId: 'rule-1',
  rule: { id: 'rule-1', metadata: { name: 'Rule A' } },
} as unknown as RuleState;
const mockGetRuleDetailsHref = (ruleId: string) => `/rules/${ruleId}`;
const mockGetEpisodeDetailsHref = (episodeId: string) => `/alerts/${episodeId}`;

const renderDocView = () =>
  render(
    <EpisodeOverviewDocView
      episodeId="ep-1"
      groupHash="gh-1"
      services={mockServices}
      getRuleDetailsHref={mockGetRuleDetailsHref}
      getEpisodeDetailsHref={mockGetEpisodeDetailsHref}
    />
  );

describe('EpisodeOverviewDocView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEpisodeDetailsHeaderData.mockReturnValue({
      isLoading: false,
      ruleState: mockRuleState,
      episode: mockEpisode,
      status: undefined,
      severity: null,
      episodeAction: undefined,
      groupAction: undefined,
      isActionStateLoaded: true,
      isFlapping: false,
    });
  });

  it('renders the alerts page overview for the episode', () => {
    renderDocView();

    expect(mockOverviewTab).toHaveBeenCalledWith(
      expect.objectContaining({
        episodeId: 'ep-1',
        episode: mockEpisode,
        ruleState: mockRuleState,
        getRuleDetailsHref: mockGetRuleDetailsHref,
        getEpisodeDetailsHref: mockGetEpisodeDetailsHref,
      }),
      expect.anything()
    );
  });

  it('opens the full runbook in the document viewer history', () => {
    renderDocView();
    expect(mockRunbookFlyout).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('full guide'));

    expect(mockRunbookFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        episodeId: 'ep-1',
        ruleName: 'Rule A',
        historyKey: DOC_VIEWER_FLYOUT_HISTORY_KEY,
      }),
      expect.anything()
    );
  });

  it('closes the full runbook', () => {
    renderDocView();
    fireEvent.click(screen.getByText('full guide'));

    fireEvent.click(screen.getByText('close runbook'));

    expect(screen.queryByText('close runbook')).not.toBeInTheDocument();
  });
});
