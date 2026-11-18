/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EDIT_EPISODE_ASSIGNEE_ACTION_ID } from '@kbn/alerting-v2-episodes-ui/actions/edit_assignee';
import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions/types';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { RuleState } from '@kbn/alerting-v2-episodes-ui/types/rule_state';
import { useEpisodeDetailsHeaderData } from '@kbn/alerting-v2-episodes-ui/hooks/use_episode_details_header_data';
import {
  createMockServices,
  createQueryClientWrapper,
  createTestQueryClient,
} from '@kbn/alerting-v2-episodes-ui/hooks/test_utils';
import { EpisodeDocViewerHeader } from './episode_doc_viewer_header';

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_episode_details_header_data');

const mockUseEpisodeDetailsHeaderData = jest.mocked(useEpisodeDetailsHeaderData);
const mockServices = createMockServices();
const QueryClientWrapper = createQueryClientWrapper(createTestQueryClient());
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>
    <QueryClientWrapper>{children}</QueryClientWrapper>
  </I18nProvider>
);

const mockEpisode = {
  'episode.id': 'ep-1',
  group_hash: 'gh-1',
  duration: 60_000,
} as AlertEpisode;

const mockRenderInlineControl = jest.fn(() => <div data-test-subj="assigneeInlineControlStub" />);
const mockEditAssigneeAction = {
  id: EDIT_EPISODE_ASSIGNEE_ACTION_ID,
  order: 50,
  displayName: 'Edit assignee',
  iconType: 'user',
  isCompatible: () => true,
  execute: jest.fn(),
  renderInlineControl: mockRenderInlineControl,
} as unknown as EpisodeAction;

const mockOnActionSuccess = jest.fn();

describe('EpisodeDocViewerHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEpisodeDetailsHeaderData.mockReturnValue({
      isLoading: false,
      ruleState: { status: 'loading' } as unknown as RuleState,
      episode: mockEpisode,
      status: 'active',
      severity: null,
      episodeAction: { tags: ['db'] } as never,
      groupAction: undefined,
      isActionStateLoaded: true,
      isFlapping: false,
    });
  });

  it('renders the alerts page header badges and info blocks', () => {
    render(
      <EpisodeDocViewerHeader
        episodeId="ep-1"
        groupHash="gh-1"
        services={mockServices}
        onActionSuccess={mockOnActionSuccess}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('db')).toBeInTheDocument();
    expect(screen.getByText('Alert ID')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Assignee')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(mockUseEpisodeDetailsHeaderData).toHaveBeenCalledWith(
      expect.objectContaining({ episodeId: 'ep-1', groupHash: 'gh-1' })
    );
  });

  it('hosts the assignee picker and passes the success callback to it', () => {
    render(
      <EpisodeDocViewerHeader
        episodeId="ep-1"
        groupHash="gh-1"
        services={mockServices}
        actions={[mockEditAssigneeAction]}
        onActionSuccess={mockOnActionSuccess}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId('assigneeInlineControlStub')).toBeInTheDocument();
    expect(mockRenderInlineControl).toHaveBeenCalledWith(
      expect.objectContaining({ episodes: [mockEpisode], onSuccess: mockOnActionSuccess })
    );
  });
});
