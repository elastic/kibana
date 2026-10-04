/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { applicationServiceMock, coreMock } from '@kbn/core/public/mocks';
import { createMockServices } from '@kbn/alerting-v2-episodes-ui/hooks/test_utils';
import { useFetchEpisodeTagOptions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_tag_options';
import { useBulkGetProfiles } from '@kbn/alerting-v2-episodes-ui/hooks/use_bulk_get_profiles';
import { fetchRulesSearch } from '@kbn/alerting-v2-episodes-ui/apis/fetch_rules_search';
import { TestProviders } from '../../../test_utils/test_providers';
import { EpisodesFilterBar } from './episodes_filter_bar';

const mockUseDebounce = jest.fn();
const mockEpisodesKqlInput = jest.fn((_props: Record<string, unknown>) => (
  <div data-test-subj="episodesFilterBar-search" />
));

jest.mock('react-use/lib/useDebounce', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseDebounce(...args),
}));
jest.mock('./episodes_kql_input', () => ({
  EpisodesKqlInput: (props: Record<string, unknown>) => mockEpisodesKqlInput(props),
}));

const mockUseEuiContainerQuery = jest.fn();

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiContainerQuery: (condition: string) => ({
    ref: { current: null },
    matches: mockUseEuiContainerQuery(condition),
  }),
}));

jest.mock('@kbn/alerting-v2-browser-shared', () => ({
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
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_tag_options', () => ({
  useFetchEpisodeTagOptions: jest.fn(),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/apis/fetch_rules_search', () => ({
  fetchRulesSearch: jest.fn(),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_bulk_get_profiles', () => ({
  useBulkGetProfiles: jest.fn(),
}));

const mockUseFetchEpisodeTagOptions = jest.mocked(useFetchEpisodeTagOptions);
const mockFetchRulesSearch = jest.mocked(fetchRulesSearch);
const mockUseBulkGetProfiles = jest.mocked(useBulkGetProfiles);

const mockEpisodeServices = createMockServices();
const mockNotifications = notificationServiceMock.createStartContract();

const defaultProps = {
  filterState: { status: ['active'] },
  onFilterChange: jest.fn(),
  timeRange: { from: 'now-24h', to: 'now' },
  onTimeChange: jest.fn(),
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

const getLatestEpisodesKqlInputProps = () => {
  const props = mockEpisodesKqlInput.mock.calls.at(-1)?.[0];
  if (!props) {
    throw new Error('EpisodesKqlInput was not rendered');
  }
  return props as { onChange: (value: string, isValid: boolean) => void };
};

describe('EpisodesFilterBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('does not apply an invalid KQL query', () => {
    renderFilterBar();
    defaultProps.onFilterChange.mockClear();

    act(() => {
      const { onChange } = getLatestEpisodesKqlInputProps();
      onChange('severity:', false);
    });
    act(() => {
      const debounceCallback = mockUseDebounce.mock.calls.at(-1)?.[0] as () => void;
      debounceCallback();
    });

    expect(defaultProps.onFilterChange).not.toHaveBeenCalled();
  });

  it('applies a valid KQL query', () => {
    renderFilterBar();
    defaultProps.onFilterChange.mockClear();

    act(() => {
      const { onChange } = getLatestEpisodesKqlInputProps();
      onChange('severity: high', true);
    });
    act(() => {
      const debounceCallback = mockUseDebounce.mock.calls.at(-1)?.[0] as () => void;
      debounceCallback();
    });

    const updateFilter = defaultProps.onFilterChange.mock.calls[0][0];
    expect(updateFilter({ status: ['active'] })).toEqual({
      status: ['active'],
      queryString: 'severity: high',
    });
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
