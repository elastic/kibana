/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
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
import { AlertEpisodeRunbookSection } from './runbook_section';

jest.mock('../../utils/run_esql_async_search');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const mockHttp = httpServiceMock.createStartContract();
const mockServices = createMockServices({ http: mockHttp });

const mockRuleWithRunbook = {
  id: 'rule-1',
  metadata: { name: 'My rule' },
  artifacts: [
    { id: 'a1', type: 'runbook', value: '# Runbook content' },
    { id: 'a2', type: 'something', value: 'other' },
  ],
} as unknown as RuleResponse;

const mockRuleWithoutRunbook = {
  id: 'rule-1',
  metadata: { name: 'My rule' },
  artifacts: [],
} as unknown as RuleResponse;

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('AlertEpisodeRunbookSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  const eventsResponse = {
    columns: [
      { name: '@timestamp', type: 'date' },
      { name: 'episode.status', type: 'keyword' },
      { name: 'rule.id', type: 'keyword' },
      { name: 'group_hash', type: 'keyword' },
    ],
    values: [['2024-01-01T00:00:00.000Z', ALERT_EPISODE_STATUS.ACTIVE, 'rule-1', 'gh-1']],
  };

  it('renders runbook content from the rule artifact', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue(eventsResponse);
    mockHttp.get.mockResolvedValueOnce(mockRuleWithRunbook);

    render(
      <I18nProvider>
        <AlertEpisodeRunbookSection episodeId="ep-1" services={mockServices} />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeDetailsRunbookContent')).toBeInTheDocument()
    );
  });

  it('renders the empty state when the rule has no runbook artifact', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue(eventsResponse);
    mockHttp.get.mockResolvedValueOnce(mockRuleWithoutRunbook);

    render(
      <I18nProvider>
        <AlertEpisodeRunbookSection episodeId="ep-1" services={mockServices} />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeDetailsRunbookEmpty')).toBeInTheDocument()
    );
  });

  it('renders the loading state while events are loading', async () => {
    let resolveSearch!: (value: typeof eventsResponse) => void;
    runEsqlAsyncSearchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSearch = resolve;
        })
    );

    render(
      <I18nProvider>
        <AlertEpisodeRunbookSection episodeId="ep-1" services={mockServices} />
      </I18nProvider>,
      { wrapper }
    );

    expect(screen.getByTestId('alertingV2EpisodeRunbookSectionLoading')).toBeInTheDocument();

    act(() => {
      resolveSearch(eventsResponse);
    });
  });

  it('renders the error state when the rule fails to load', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue(eventsResponse);
    mockHttp.get.mockRejectedValueOnce(new Error('boom'));

    render(
      <I18nProvider>
        <AlertEpisodeRunbookSection episodeId="ep-1" services={mockServices} />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeRunbookSectionError')).toBeInTheDocument()
    );
  });
});
