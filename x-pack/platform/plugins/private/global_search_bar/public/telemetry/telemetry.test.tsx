/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeStyle } from '@kbn/core-chrome-browser';
import { applicationServiceMock, coreMock } from '@kbn/core/public/mocks';
import { GlobalSearchBatchedResults, GlobalSearchResult } from '@kbn/global-search-plugin/public';
import { globalSearchPluginMock } from '@kbn/global-search-plugin/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import React from 'react';
import { of, throwError } from 'rxjs';
import { EventReporter } from '.';
import { SearchBar } from '../components/search_bar';

jest.mock(
  'react-virtualized-auto-sizer',
  () =>
    ({ children }: any) =>
      children({ height: 600, width: 600 })
);

type Result = { id: string; type: string } | string;

const createResult = (result: Result): GlobalSearchResult => {
  const id = typeof result === 'string' ? result : result.id;
  const type = typeof result === 'string' ? 'application' : result.type;
  const meta = type === 'application' ? { categoryLabel: 'Kibana' } : { categoryLabel: null };

  return {
    id,
    type,
    title: id,
    url: `/app/test/${id}`,
    score: 42,
    meta,
  };
};

const createBatch = (...results: Result[]): GlobalSearchBatchedResults => ({
  results: results.map(createResult),
});

const searchCharLimit = 1000;

describe('SearchBar', () => {
  const usageCollection = usageCollectionPluginMock.createSetupContract();
  const core = coreMock.createStart();
  const basePathUrl = '/plugins/globalSearchBar/assets/';
  let user: UserEvent;
  let searchService: ReturnType<typeof globalSearchPluginMock.createStartContract>;
  let applications: ReturnType<typeof applicationServiceMock.createStartContract>;
  let mockReportUiCounter: typeof usageCollection.reportUiCounter;
  let mockReportEvent: typeof core.analytics.reportEvent;
  let eventReporter: EventReporter;
  let chromeStyle$ = of<ChromeStyle>('classic');

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    applications = applicationServiceMock.createStartContract();
    searchService = globalSearchPluginMock.createStartContract();

    mockReportUiCounter = jest.fn();
    usageCollection.reportUiCounter = mockReportUiCounter;

    mockReportEvent = jest.fn();
    core.analytics.reportEvent = mockReportEvent;

    eventReporter = new EventReporter({ analytics: core.analytics, usageCollection });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const focusAndUpdate = async () => {
    await act(async () => {
      (await screen.findByTestId('nav-search-input')).focus();
      jest.runAllTimers();
    });
  };

  const simulateTypeChar = (text: string) => {
    fireEvent.input(screen.getByTestId('nav-search-input'), { target: { value: text } });
    act(() => {
      jest.runAllTimers();
    });
  };

  describe('chromeStyle: classic', () => {
    it('calling results', async () => {
      searchService.find
        .mockReturnValueOnce(
          of(
            createBatch('Discover', 'Canvas'),
            createBatch({ id: 'Visualize', type: 'test' }, 'Graph')
          )
        )
        .mockReturnValueOnce(of(createBatch('Discover', { id: 'My Dashboard', type: 'test' })));

      render(
        <IntlProvider locale="en">
          <SearchBar
            globalSearch={{ ...searchService, searchCharLimit }}
            navigateToUrl={applications.navigateToUrl}
            basePathUrl={basePathUrl}
            chromeStyle$={chromeStyle$}
            reportEvent={eventReporter}
          />
        </IntlProvider>
      );

      await focusAndUpdate();

      simulateTypeChar('d');

      expect(mockReportUiCounter).nthCalledWith(1, 'global_search_bar', 'count', 'search_focus');
      expect(mockReportUiCounter).nthCalledWith(2, 'global_search_bar', 'count', 'search_request');
      expect(mockReportUiCounter).toHaveBeenCalledTimes(2);
    });

    it('keyboard shortcut', async () => {
      render(
        <IntlProvider locale="en">
          <SearchBar
            globalSearch={{ ...searchService, searchCharLimit }}
            navigateToUrl={applications.navigateToUrl}
            basePathUrl={basePathUrl}
            chromeStyle$={chromeStyle$}
            reportEvent={eventReporter}
          />
        </IntlProvider>
      );

      await act(async () => {
        fireEvent.keyDown(window, { key: '/', ctrlKey: true, metaKey: true });
        expect(await screen.findByTestId('nav-search-input')).toEqual(document.activeElement);
      });

      expect(mockReportUiCounter).nthCalledWith(1, 'global_search_bar', 'count', 'shortcut_used');
      expect(mockReportUiCounter).nthCalledWith(2, 'global_search_bar', 'count', 'search_focus');
      expect(mockReportUiCounter).toHaveBeenCalledTimes(2);
    });

    it('tracks the application navigated to', async () => {
      searchService.find.mockReturnValueOnce(
        of(createBatch('Discover', { id: 'My Dashboard', type: 'test' }))
      );

      render(
        <IntlProvider locale="en">
          <SearchBar
            globalSearch={{ ...searchService, searchCharLimit }}
            navigateToUrl={applications.navigateToUrl}
            basePathUrl={basePathUrl}
            chromeStyle$={chromeStyle$}
            reportEvent={eventReporter}
          />
        </IntlProvider>
      );

      jest.spyOn(Date, 'now').mockReturnValue(1000);

      await focusAndUpdate();

      jest.spyOn(Date, 'now').mockReturnValue(2000);

      fireEvent.click(await screen.findByTestId('nav-search-option'));

      expect(mockReportEvent).nthCalledWith(1, 'global_search_bar_click_application', {
        selected_rank: 1,
        selected_label: 'Discover',
        application: 'discover',
        terms: '',
      });
      expect(mockReportEvent).nthCalledWith(2, 'global_search_bar_blur', {
        focus_time_ms: 1000,
      });
      expect(mockReportEvent).toHaveBeenCalledTimes(2);
    });

    it(`tracks the user's search term`, async () => {
      searchService.find.mockReturnValue(of(createBatch('Discover')));

      render(
        <IntlProvider locale="en">
          <SearchBar
            globalSearch={{ ...searchService, searchCharLimit }}
            navigateToUrl={applications.navigateToUrl}
            basePathUrl={basePathUrl}
            chromeStyle$={chromeStyle$}
            reportEvent={eventReporter}
          />
        </IntlProvider>
      );

      jest.spyOn(Date, 'now').mockReturnValue(1000);

      await focusAndUpdate();
      await user.type(await screen.findByTestId('nav-search-input'), 'Ahoy!');

      jest.spyOn(Date, 'now').mockReturnValue(2000);

      fireEvent.click(await screen.findByTestId('nav-search-option'));

      expect(mockReportEvent).nthCalledWith(1, 'global_search_bar_click_application', {
        selected_rank: 1,
        selected_label: 'Discover',
        application: 'discover',
        terms: 'Ahoy!',
      });
      expect(mockReportEvent).nthCalledWith(2, 'global_search_bar_blur', {
        focus_time_ms: 1000,
      });
      expect(mockReportEvent).toHaveBeenCalledTimes(2);
    });

    it('errors', async () => {
      searchService.find.mockReturnValueOnce(throwError(() => new Error('service unavailable :(')));

      render(
        <IntlProvider locale="en">
          <SearchBar
            globalSearch={{ ...searchService, searchCharLimit }}
            navigateToUrl={applications.navigateToUrl}
            basePathUrl={basePathUrl}
            chromeStyle$={chromeStyle$}
            reportEvent={eventReporter}
          />
        </IntlProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('nav-search-input')).toBeInTheDocument();
      });

      await user.type(screen.getByTestId('nav-search-input'), 'Ahoy!');

      await focusAndUpdate();

      expect(mockReportEvent).nthCalledWith(1, 'global_search_bar_error', {
        error_message: 'Error: service unavailable :(',
        terms: 'Ahoy!',
      });
      expect(mockReportEvent).toHaveBeenCalledTimes(1);
    });

    describe('chromeStyle: project', () => {
      beforeEach(() => {
        chromeStyle$ = of<ChromeStyle>('project');
      });

      it('keyboard shortcut expsoses the component and focuses the text input', async () => {
        render(
          <IntlProvider locale="en">
            <SearchBar
              globalSearch={{ ...searchService, searchCharLimit }}
              navigateToUrl={applications.navigateToUrl}
              basePathUrl={basePathUrl}
              chromeStyle$={chromeStyle$}
              reportEvent={eventReporter}
            />
          </IntlProvider>
        );

        act(() => {
          fireEvent.keyDown(window, { key: '/', ctrlKey: true, metaKey: true });
        });

        const inputElement = await screen.findByTestId('nav-search-input');

        expect(document.activeElement).toEqual(inputElement);

        fireEvent.click(await screen.findByTestId('nav-search-conceal'));
        expect(screen.queryAllByTestId('nav-search-input')).toHaveLength(0);

        expect(mockReportUiCounter).nthCalledWith(1, 'global_search_bar', 'count', 'shortcut_used');
        expect(mockReportUiCounter).nthCalledWith(2, 'global_search_bar', 'count', 'search_focus');
        expect(mockReportUiCounter).toHaveBeenCalledTimes(2);
      });

      it('show/hide', async () => {
        render(
          <IntlProvider locale="en">
            <SearchBar
              globalSearch={{ ...searchService, searchCharLimit }}
              navigateToUrl={applications.navigateToUrl}
              basePathUrl={basePathUrl}
              chromeStyle$={chromeStyle$}
              reportEvent={eventReporter}
            />
          </IntlProvider>
        );

        jest.spyOn(Date, 'now').mockReturnValue(1000);

        fireEvent.click(await screen.findByTestId('nav-search-reveal'));
        expect(await screen.findByTestId('nav-search-input')).toBeVisible();

        jest.spyOn(Date, 'now').mockReturnValue(2000);

        fireEvent.click(await screen.findByTestId('nav-search-conceal'));
        expect(screen.queryAllByTestId('nav-search-input')).toHaveLength(0);

        expect(mockReportUiCounter).nthCalledWith(1, 'global_search_bar', 'count', 'search_focus');
        expect(mockReportUiCounter).toHaveBeenCalledTimes(1);

        expect(mockReportEvent).nthCalledWith(1, 'global_search_bar_blur', {
          focus_time_ms: 1000,
        });
        expect(mockReportEvent).toHaveBeenCalledTimes(1);
      });
    });
  });
});
