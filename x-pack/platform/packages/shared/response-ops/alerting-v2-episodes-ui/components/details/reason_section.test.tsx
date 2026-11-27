/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { runEsqlAsyncSearch } from '../../utils/run_esql_async_search';
import {
  createMockServices,
  createQueryClientWrapper,
  createTestQueryClient,
} from '../../hooks/test_utils';
import { AlertEpisodeReasonSection } from './reason_section';

jest.mock('../../utils/run_esql_async_search');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const mockServices = createMockServices();

/** Episode row, the way `buildEpisodeQuery` returns it. */
const mockEpisodeSearchResult = (reason: string | null) => ({
  columns: [
    { name: '@timestamp', type: 'date' },
    { name: 'episode.status', type: 'keyword' },
    { name: 'rule.id', type: 'keyword' },
    { name: 'group_hash', type: 'keyword' },
    { name: 'reason', type: 'keyword' },
  ],
  values: [['2024-01-01T00:00:00.000Z', ALERT_EPISODE_STATUS.ACTIVE, 'rule-1', 'gh-1', reason]],
});

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

const renderSection = (props: { compressed?: boolean } = {}) =>
  render(
    <I18nProvider>
      <AlertEpisodeReasonSection episodeId="ep-1" services={mockServices} {...props} />
    </I18nProvider>,
    { wrapper }
  );

describe('AlertEpisodeReasonSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('renders the reason in a bordered panel', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue(
      mockEpisodeSearchResult('Carrier ES-Air averaged 41.6 min of delay')
    );

    renderSection();

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeReasonSection')).toBeInTheDocument()
    );
    expect(screen.getByText('Reason')).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2EpisodeReasonSectionText')).toHaveTextContent(
      'Carrier ES-Air averaged 41.6 min of delay'
    );
  });

  it('renders markup in the reason as text, never as HTML', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue(
      mockEpisodeSearchResult('<img src=x onerror=alert(1)> <b>bold</b>')
    );

    renderSection();

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeReasonSectionText')).toBeInTheDocument()
    );
    expect(screen.getByTestId('alertingV2EpisodeReasonSectionText')).toHaveTextContent(
      '<img src=x onerror=alert(1)> <b>bold</b>'
    );
    expect(screen.getByTestId('alertingV2EpisodeReasonSection').querySelector('img')).toBeNull();
  });

  it('wraps long unbroken values', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue(mockEpisodeSearchResult('b'.repeat(1000)));

    renderSection();

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeReasonSectionText')).toBeInTheDocument()
    );
    expect(screen.getByTestId('alertingV2EpisodeReasonSectionText')).toHaveStyleRule(
      'overflow-wrap',
      expect.stringContaining('break-word')
    );
  });

  it('scales the title down when compressed', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue(mockEpisodeSearchResult('Some reason'));

    const { unmount } = renderSection();
    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeReasonSection')).toBeInTheDocument()
    );
    const normalTitle = screen.getByText('Reason').className;
    unmount();
    queryClient.clear();

    renderSection({ compressed: true });
    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeReasonSection')).toBeInTheDocument()
    );

    // EuiTitle encodes its size in the emotion class, so compressed must differ.
    expect(screen.getByText('Reason').className).not.toBe(normalTitle);
  });

  it('renders nothing when the episode has no reason', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue(mockEpisodeSearchResult(null));

    renderSection();

    await waitFor(() => expect(runEsqlAsyncSearchMock).toHaveBeenCalled());
    expect(screen.queryByTestId('alertingV2EpisodeReasonSection')).not.toBeInTheDocument();
  });

  it('renders nothing while the episode is loading', () => {
    runEsqlAsyncSearchMock.mockImplementation(() => new Promise(() => {}));

    renderSection();

    expect(screen.queryByTestId('alertingV2EpisodeReasonSection')).not.toBeInTheDocument();
  });

  it('renders nothing when the episode query fails', async () => {
    runEsqlAsyncSearchMock.mockRejectedValue(new Error('boom'));

    renderSection();

    await waitFor(() => expect(runEsqlAsyncSearchMock).toHaveBeenCalled());
    expect(screen.queryByTestId('alertingV2EpisodeReasonSection')).not.toBeInTheDocument();
  });
});
