/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { runEsqlAsyncSearch } from '../../utils/run_esql_async_search';
import {
  createMockServices,
  createQueryClientWrapper,
  createTestQueryClient,
} from '../../hooks/test_utils';
import { AlertEpisodeGroupingSection } from './grouping_section';

jest.mock('../../utils/run_esql_async_search');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const mockHttp = httpServiceMock.createStartContract();
const mockServices = createMockServices({ http: mockHttp });

const mockRule = {
  id: 'rule-1',
  metadata: { name: 'My rule' },
  grouping: { fields: ['service.name', 'host.name'] },
} as unknown as RuleResponse;

/** Episode row carrying grouping values in `episode_data`. */
const mockEpisodeSearchResult = (episodeData: Record<string, unknown> | null) => ({
  columns: [
    { name: '@timestamp', type: 'date' },
    { name: 'episode.status', type: 'keyword' },
    { name: 'rule.id', type: 'keyword' },
    { name: 'group_hash', type: 'keyword' },
    { name: 'episode_data', type: 'keyword' },
  ],
  values: [
    [
      '2024-01-01T00:00:00.000Z',
      ALERT_EPISODE_STATUS.ACTIVE,
      'rule-1',
      'gh-1',
      episodeData === null ? null : JSON.stringify(episodeData),
    ],
  ],
});

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

const renderSection = () =>
  render(
    <I18nProvider>
      <AlertEpisodeGroupingSection episodeId="ep-1" services={mockServices} />
    </I18nProvider>,
    { wrapper }
  );

describe('AlertEpisodeGroupingSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('renders the grouping badges in a bordered panel', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue(
      mockEpisodeSearchResult({ 'service.name': 'checkout', 'host.name': 'host-a' })
    );
    mockHttp.get.mockResolvedValueOnce(mockRule);

    renderSection();

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeGroupingSection')).toBeInTheDocument()
    );

    expect(screen.getByTestId('alertingV2EpisodeGroupingSectionTags')).toBeInTheDocument();
    expect(screen.getByText('Grouping')).toBeInTheDocument();
  });

  it('scales the title down when compressed', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue(
      mockEpisodeSearchResult({ 'service.name': 'checkout' })
    );
    mockHttp.get.mockResolvedValue(mockRule);

    const { unmount } = renderSection();
    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeGroupingSection')).toBeInTheDocument()
    );
    const normalTitle = screen.getByText('Grouping').className;
    unmount();
    queryClient.clear();

    render(
      <I18nProvider>
        <AlertEpisodeGroupingSection episodeId="ep-1" services={mockServices} compressed />
      </I18nProvider>,
      { wrapper }
    );
    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeGroupingSection')).toBeInTheDocument()
    );

    // EuiTitle encodes its size in the emotion class, so compressed must differ.
    expect(screen.getByText('Grouping').className).not.toBe(normalTitle);
  });

  it('renders a loading panel while the episode is loading', () => {
    runEsqlAsyncSearchMock.mockImplementation(() => new Promise(() => {}));

    renderSection();

    expect(screen.getByTestId('alertingV2EpisodeGroupingSectionLoading')).toBeInTheDocument();
  });

  it('keeps the loading panel while the rule is loading', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue(
      mockEpisodeSearchResult({ 'service.name': 'checkout' })
    );
    mockHttp.get.mockImplementation(() => new Promise(() => {}));

    renderSection();

    await waitFor(() => expect(mockHttp.get).toHaveBeenCalled());
    expect(screen.getByTestId('alertingV2EpisodeGroupingSectionLoading')).toBeInTheDocument();
  });

  it('renders an error when the episode query fails', async () => {
    runEsqlAsyncSearchMock.mockRejectedValue(new Error('boom'));

    renderSection();

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeGroupingSectionError')).toBeInTheDocument()
    );
  });

  it('renders nothing when no grouping field holds a value', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue(mockEpisodeSearchResult(null));
    mockHttp.get.mockResolvedValueOnce(mockRule);

    renderSection();

    await waitFor(() => expect(mockHttp.get).toHaveBeenCalled());

    expect(screen.queryByTestId('alertingV2EpisodeGroupingSection')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertingV2EpisodeGroupingSectionTags')).not.toBeInTheDocument();
  });

  it('renders nothing when the rule has no grouping fields', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue(
      mockEpisodeSearchResult({ 'service.name': 'checkout' })
    );
    mockHttp.get.mockResolvedValueOnce({ ...mockRule, grouping: undefined } as RuleResponse);

    renderSection();

    await waitFor(() => expect(mockHttp.get).toHaveBeenCalled());

    expect(screen.queryByTestId('alertingV2EpisodeGroupingSection')).not.toBeInTheDocument();
  });
});
