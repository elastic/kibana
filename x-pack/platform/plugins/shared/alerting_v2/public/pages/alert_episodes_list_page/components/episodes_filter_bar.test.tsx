/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { applicationServiceMock, coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClientProvider } from '@kbn/react-query';
import {
  createMockServices,
  createTestQueryClient,
} from '@kbn/alerting-v2-episodes-ui/hooks/test_utils';
import { useBulkGetProfiles } from '@kbn/alerting-v2-episodes-ui/hooks/use_bulk_get_profiles';
import { fetchRulesSearch } from '@kbn/alerting-v2-episodes-ui/apis/fetch_rules_search';
import { EpisodesFilterBar } from './episodes_filter_bar';

jest.mock('react-use/lib/useDebounce', () => jest.fn());

jest.mock('@kbn/alerting-v2-browser-shared', () => ({
  AlertingDateRangePicker: ({ 'data-test-subj': dataTestSubj }: { 'data-test-subj'?: string }) => (
    <div data-test-subj={dataTestSubj} />
  ),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/apis/fetch_rules_search', () => ({
  fetchRulesSearch: jest.fn(),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_bulk_get_profiles', () => ({
  useBulkGetProfiles: jest.fn(),
}));

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
  tagOptions: ['tag-1', 'tag-2'],
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
    <KibanaContextProvider services={defaultProps.services}>
      <I18nProvider>
        <QueryClientProvider client={createTestQueryClient()}>
          <EpisodesFilterBar {...defaultProps} />
        </QueryClientProvider>
      </I18nProvider>
    </KibanaContextProvider>
  );

describe('EpisodesFilterBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchRulesSearch.mockResolvedValue([]);
    mockUseBulkGetProfiles.mockReturnValue({
      data: [],
      isFetching: false,
    } as unknown as ReturnType<typeof useBulkGetProfiles>);
  });

  it('renders search and all episode filters', () => {
    renderFilterBar();

    expect(screen.getByTestId('episodesFilterBar-search')).toBeInTheDocument();
    expect(screen.getByTestId('episodesFilterBar-status-button')).toBeInTheDocument();
    expect(screen.getByTestId('episodesFilterBar-severity-button')).toBeInTheDocument();
    expect(screen.getByTestId('episodesFilterBar-rule-button')).toBeInTheDocument();
    expect(screen.getByTestId('episodesFilterBar-tags-button')).toBeInTheDocument();
    expect(screen.getByTestId('episodesFilterBar-assignee-button')).toBeInTheDocument();
    expect(screen.getByTestId('episodesFilterBar-datePicker')).toBeInTheDocument();
  });
});
