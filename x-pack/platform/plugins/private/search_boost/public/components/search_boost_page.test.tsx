/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createMemoryHistory } from 'history';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { contentListQueryClient } from '@kbn/content-list-provider';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Router } from '@kbn/shared-ux-router';
import { PROFILES_API_PATH, RULES_API_PATH } from '../../common/constants';
import { mockProfiles, mockRules } from './test_utils/mock_boost_data';
import { SearchBoostPage } from './search_boost_page';

const createHttp = () => {
  const http = httpServiceMock.createStartContract();
  http.get.mockImplementation(async (path: unknown) =>
    path === PROFILES_API_PATH ? { profiles: mockProfiles } : { rules: mockRules }
  );
  return http;
};

// Failed queries are expected here, so react-query doesn't need to log them.
const createQueryClient = () =>
  new QueryClient({ logger: { log: () => {}, warn: () => {}, error: () => {} } });

const renderPage = (http = createHttp(), initialPath = '/') => {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const { unmount } = render(
    <MockAppHeaderProvider>
      <I18nProvider>
        <QueryClientProvider client={createQueryClient()}>
          <Router history={history}>
            <SearchBoostPage http={http} canEdit={false} />
          </Router>
        </QueryClientProvider>
      </I18nProvider>
    </MockAppHeaderProvider>
  );
  return { http, history, unmount };
};

const fetchError = (body: object) => Object.assign(new Error('Request failed'), { body });

describe('SearchBoostPage', () => {
  afterEach(() => {
    contentListQueryClient.clear();
  });

  it('shows the title and description', () => {
    renderPage();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Search boost');
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.description)).toHaveTextContent(
      'Project-wide defaults determine the search resources allocated to your indices and data streams. Create boost rules to override those defaults with a different boost profile for specific indices or data streams.'
    );
  });

  it('opens the boost rules tab by default once profiles and rules load', async () => {
    const { http, history } = renderPage();

    expect(screen.getByTestId('searchBoostLoading')).toBeInTheDocument();
    expect(await screen.findByTestId('searchBoostRulesTable')).toBeInTheDocument();
    expect(history.location.pathname).toBe('/rules');
    expect(screen.getByTestId('searchBoostTab-rules')).toHaveAttribute('aria-selected', 'true');
    expect(http.get).toHaveBeenCalledWith(PROFILES_API_PATH, { signal: expect.any(AbortSignal) });
    expect(http.get).toHaveBeenCalledWith(RULES_API_PATH, { signal: expect.any(AbortSignal) });
  });

  it('cancels the requests when leaving the page', async () => {
    const signals: Array<AbortSignal | null | undefined> = [];
    const http = createHttp();
    http.get.mockImplementation((_path: unknown, options?: { signal?: AbortSignal | null }) => {
      signals.push(options?.signal);
      return new Promise(() => {});
    });
    const { unmount } = renderPage(http);
    await waitFor(() => expect(signals).toHaveLength(2));

    unmount();

    expect(signals.map((signal) => signal?.aborted)).toEqual([true, true]);
  });

  it('stays on the page when a rule or profile name is clicked', async () => {
    const { history } = renderPage(createHttp(), '/profiles');

    await userEvent.click(await screen.findByRole('link', { name: 'catalog-fast' }));
    expect(history.location.pathname).toBe('/profiles');

    await userEvent.click(screen.getByTestId('searchBoostTab-rules'));
    await userEvent.click(await screen.findByRole('link', { name: 'catalog' }));
    expect(history.location.pathname).toBe('/rules');
  });

  it('switches tabs through the URL', async () => {
    const { history } = renderPage(createHttp(), '/profiles');

    expect(await screen.findByTestId('searchBoostProfilesTable')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('searchBoostTab-rules'));

    expect(history.location.pathname).toBe('/rules');
    expect(await screen.findByTestId('searchBoostRulesTable')).toBeInTheDocument();
  });

  it('keeps the profile filter when the current tab is selected again', async () => {
    const { history } = renderPage(createHttp(), '/rules?profile=catalog-fast');

    expect(await screen.findByTestId('searchBoostRulesCount')).toHaveTextContent(
      'Showing 1 of 1 boost rule'
    );
    await userEvent.click(screen.getByTestId('searchBoostTab-rules'));

    expect(history.location.search).toBe('?profile=catalog-fast');
    expect(screen.getByTestId('searchBoostRulesCount')).toHaveTextContent(
      'Showing 1 of 1 boost rule'
    );
  });

  it('opens the boost rules filtered by a profile from its rules using count', async () => {
    const { history } = renderPage(createHttp(), '/profiles');

    const row = (await screen.findByRole('link', { name: 'catalog-fast' })).closest('tr')!;
    await userEvent.click(within(row).getByTestId('searchBoostProfileRulesLink'));

    expect(history.location.pathname).toBe('/rules');
    expect(history.location.search).toBe('?profile=catalog-fast');
    expect(await screen.findByText('catalog')).toBeInTheDocument();
    expect(screen.getByTestId('searchBoostRulesCount')).toHaveTextContent(
      'Showing 1 of 1 boost rule'
    );
  });

  it('shows the error in place of the page and loads again on Try again', async () => {
    const http = createHttp();
    http.get.mockRejectedValueOnce(fetchError({ statusCode: 500, message: 'Something broke' }));
    renderPage(http);

    const error = await screen.findByTestId('searchBoostLoadError');
    expect(error).toHaveTextContent('Unable to load boost settings');
    expect(error).toHaveTextContent('Something broke');
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.title)).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('searchBoostLoadRetry'));

    expect(await screen.findByTestId('searchBoostRulesTable')).toBeInTheDocument();
  });

  it('shows the same error when Elasticsearch has the boost API turned off', async () => {
    const http = createHttp();
    http.get.mockRejectedValue(
      fetchError({ statusCode: 410, message: 'boost profile API is not enabled' })
    );
    renderPage(http);

    const error = await screen.findByTestId('searchBoostLoadError');
    expect(error).toHaveTextContent('Unable to load boost settings');
    expect(error).toHaveTextContent('boost profile API is not enabled');
  });
});
