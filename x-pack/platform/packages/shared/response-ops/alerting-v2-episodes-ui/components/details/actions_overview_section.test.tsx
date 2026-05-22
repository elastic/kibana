/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { fetchEpisodeActions } from '../../apis/fetch_episode_actions';
import { fetchGroupActions } from '../../apis/fetch_group_actions';
import {
  createMockSpaces,
  createQueryClientWrapper,
  createTestQueryClient,
} from '../../hooks/test_utils';
import { AlertEpisodeActionsOverviewSection } from './actions_overview_section';
import type { AlertEpisodeDetailsServices } from './types';

jest.mock('../../apis/fetch_episode_actions');
jest.mock('../../apis/fetch_group_actions');

const fetchEpisodeActionsMock = jest.mocked(fetchEpisodeActions);
const fetchGroupActionsMock = jest.mocked(fetchGroupActions);

const mockData = dataPluginMock.createStartContract();
const mockHttp = httpServiceMock.createStartContract();
const mockExpressions = {} as ExpressionsStart;
const mockUserProfile = {} as UserProfileService;
const mockSpaces = createMockSpaces();

const mockServices: AlertEpisodeDetailsServices = {
  data: mockData,
  http: mockHttp,
  expressions: mockExpressions,
  userProfile: mockUserProfile,
  spaces: mockSpaces,
};

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('AlertEpisodeActionsOverviewSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('renders the empty state when no actions exist', async () => {
    fetchEpisodeActionsMock.mockResolvedValue([]);
    fetchGroupActionsMock.mockResolvedValue([]);

    render(
      <I18nProvider>
        <AlertEpisodeActionsOverviewSection
          episodeId="ep-1"
          groupHash="gh-1"
          services={mockServices}
        />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeDetailsActionsOverviewEmpty')).toBeInTheDocument()
    );
  });

  it('renders the loading state while actions are loading', () => {
    fetchEpisodeActionsMock.mockImplementation(() => new Promise(() => {}));
    fetchGroupActionsMock.mockImplementation(() => new Promise(() => {}));

    render(
      <I18nProvider>
        <AlertEpisodeActionsOverviewSection
          episodeId="ep-1"
          groupHash="gh-1"
          services={mockServices}
        />
      </I18nProvider>,
      { wrapper }
    );

    expect(
      screen.getByTestId('alertingV2EpisodeActionsOverviewSectionLoading')
    ).toBeInTheDocument();
  });

  it('does not wait on group actions when groupHash is undefined', async () => {
    fetchEpisodeActionsMock.mockResolvedValue([]);
    fetchGroupActionsMock.mockImplementation(() => new Promise(() => {}));

    render(
      <I18nProvider>
        <AlertEpisodeActionsOverviewSection
          episodeId="ep-1"
          groupHash={undefined}
          services={mockServices}
        />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeDetailsActionsOverviewEmpty')).toBeInTheDocument()
    );
    expect(fetchGroupActionsMock).not.toHaveBeenCalled();
  });

  it('renders the error state when episode actions fail to load', async () => {
    fetchEpisodeActionsMock.mockRejectedValue(new Error('boom'));
    fetchGroupActionsMock.mockResolvedValue([]);

    render(
      <I18nProvider>
        <AlertEpisodeActionsOverviewSection
          episodeId="ep-1"
          groupHash="gh-1"
          services={mockServices}
        />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeActionsOverviewSectionError')).toBeInTheDocument()
    );
  });

  it('renders the error state when group actions fail to load', async () => {
    fetchEpisodeActionsMock.mockResolvedValue([]);
    fetchGroupActionsMock.mockRejectedValue(new Error('boom'));

    render(
      <I18nProvider>
        <AlertEpisodeActionsOverviewSection
          episodeId="ep-1"
          groupHash="gh-1"
          services={mockServices}
        />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeActionsOverviewSectionError')).toBeInTheDocument()
    );
  });
});
