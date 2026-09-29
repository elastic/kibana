/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { applicationServiceMock, coreMock } from '@kbn/core/public/mocks';
import { createMockServices } from '@kbn/alerting-v2-episodes-ui/hooks/test_utils';
import { useFetchEpisodeTagOptions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_tag_options';
import { useBulkGetProfiles } from '@kbn/alerting-v2-episodes-ui/hooks/use_bulk_get_profiles';
import { fetchRulesSearch } from '@kbn/alerting-v2-episodes-ui/apis/fetch_rules_search';
import { TestProviders } from '../../../test_utils/test_providers';
import { EpisodesFilterBar } from './episodes_filter_bar';

vi.mock('react-use/lib/useDebounce', () => vi.fn());

const mockUseEuiContainerQuery = vi.fn();

vi.mock('@elastic/eui', async () => {
      const mocked = {
      ...(await vi.importActual('@elastic/eui')),
      useEuiContainerQuery: (condition: string) => ({
        ref: { current: null },
        matches: mockUseEuiContainerQuery(condition),
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/alerting-v2-browser-shared', () => {
      const mocked = {
      AlertingDateRangePicker: ({
        collapsed,
        showTimeWindowButtons,
        'data-test-subj': dataTestSubj,
      }: {
        collapsed?: boolean;
        showTimeWindowButtons?: boolean;
        'data-test-subj'?: string;
      }) => (
        <div
          data-test-subj={dataTestSubj}
          data-collapsed={collapsed}
          data-show-time-window-buttons={showTimeWindowButtons}
        />
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_tag_options', () => {
      const mocked = {
      useFetchEpisodeTagOptions: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/alerting-v2-episodes-ui/apis/fetch_rules_search', () => {
      const mocked = {
      fetchRulesSearch: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/alerting-v2-episodes-ui/hooks/use_bulk_get_profiles', () => {
      const mocked = {
      useBulkGetProfiles: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockUseFetchEpisodeTagOptions = vi.mocked(useFetchEpisodeTagOptions);
const mockFetchRulesSearch = vi.mocked(fetchRulesSearch);
const mockUseBulkGetProfiles = vi.mocked(useBulkGetProfiles);

const mockEpisodeServices = createMockServices();
const mockNotifications = notificationServiceMock.createStartContract();

const defaultProps = {
  filterState: { status: ['active'] },
  onFilterChange: vi.fn(),
  timeRange: { from: 'now-24h', to: 'now' },
  onTimeChange: vi.fn(),
  ruleOptions: [],
  assigneeUids: [],
  services: {
    http: mockEpisodeServices.http,
    expressions: mockEpisodeServices.expressions,
    spaces: mockEpisodeServices.spaces,
    data: mockEpisodeServices.data,
    notifications: mockNotifications,
    application: applicationServiceMock.createStartContract(),
    uiSettings: mockEpisodeServices.uiSettings,
    featureFlags: coreMock.createStart().featureFlags,
  },
};

const renderFilterBar = () =>
  render(
    <TestProviders>
      <EpisodesFilterBar {...defaultProps} />
    </TestProviders>
  );

describe('EpisodesFilterBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEuiContainerQuery.mockReturnValue(false);
    mockUseFetchEpisodeTagOptions.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useFetchEpisodeTagOptions>);
    mockFetchRulesSearch.mockResolvedValue([]);
    mockUseBulkGetProfiles.mockReturnValue({
      data: [],
      isFetching: false,
    } as unknown as ReturnType<typeof useBulkGetProfiles>);
  });

  it('renders search and all episode filters', () => {
    renderFilterBar();

    expect(screen.getByRole('search', { name: 'Filter alert episodes' })).toBeInTheDocument();
    expect(screen.getByTestId('episodesFilterBar-search')).toBeInTheDocument();
    expect(screen.getByTestId('episodesFilterBar-status-button')).toBeInTheDocument();
    expect(screen.getByTestId('episodesFilterBar-severity-button')).toBeInTheDocument();
    expect(screen.getByTestId('episodesFilterBar-rule-button')).toBeInTheDocument();
    expect(screen.getByTestId('episodesFilterBar-tags-button')).toBeInTheDocument();
    expect(screen.getByTestId('episodesFilterBar-assignee-button')).toBeInTheDocument();
    expect(screen.getByTestId('episodesFilterBar-datePicker')).toBeInTheDocument();
  });

  it('collapses the date picker and hides time window buttons in a narrow container', () => {
    mockUseEuiContainerQuery.mockReturnValue(true);

    renderFilterBar();

    expect(screen.getByTestId('episodesFilterBar-datePicker')).toHaveAttribute(
      'data-collapsed',
      'true'
    );
    expect(screen.getByTestId('episodesFilterBar-datePicker')).toHaveAttribute(
      'data-show-time-window-buttons',
      'false'
    );
  });
});
