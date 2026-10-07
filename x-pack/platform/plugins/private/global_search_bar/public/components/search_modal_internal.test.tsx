/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applicationServiceMock, coreMock } from '@kbn/core/public/mocks';
import { globalSearchPluginMock } from '@kbn/global-search-plugin/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { of, throwError } from 'rxjs';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import { SEARCH_MODAL_SELECTOR_PREFIX } from './types';
import { EventReporter } from '../telemetry';
import { SearchModalInternal } from './search_modal_internal';

jest.mock(
  'react-virtualized-auto-sizer',
  () =>
    ({ children }: any) =>
      children({ height: 600, width: 600 })
);

const SMALL_SEARCH_CHAR_LIMIT = 2;

describe('SearchModalInternal', () => {
  const usageCollection = usageCollectionPluginMock.createSetupContract();
  const core = coreMock.createStart();
  let searchService: ReturnType<typeof globalSearchPluginMock.createStartContract>;
  let applications: ReturnType<typeof applicationServiceMock.createStartContract>;
  let eventReporter: EventReporter;

  beforeAll(() => {
    jest.useFakeTimers();
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    applications = applicationServiceMock.createStartContract();
    searchService = globalSearchPluginMock.createStartContract();

    (searchService.getSearchableTypes as jest.Mock).mockResolvedValue(['application']);
    (searchService.find as jest.Mock).mockReturnValue(of({ results: [] }));

    eventReporter = new EventReporter({ analytics: core.analytics, usageCollection });
    jest.clearAllMocks();
  });

  const renderModal = (searchCharLimit = 1000) =>
    render(
      <IntlProvider locale="en">
        <SearchModalInternal
          globalSearch={{ ...searchService, searchCharLimit }}
          navigateToUrl={applications.navigateToUrl}
          reportEvent={eventReporter}
          onClose={jest.fn()}
        />
      </IntlProvider>
    );

  const runDebouncedSearch = async () => {
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      jest.advanceTimersByTime(350);
    });
  };

  it('renders the search input and footer', async () => {
    renderModal();
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('nav-search-input')).toBeInTheDocument();
    expect(screen.getByTestId(`${SEARCH_MODAL_SELECTOR_PREFIX}Footer`)).toBeInTheDocument();
  });

  it('reports searchFocus on mount and searchBlur on unmount', () => {
    const focusSpy = jest.spyOn(eventReporter, 'searchFocus');
    const blurSpy = jest.spyOn(eventReporter, 'searchBlur');

    const { unmount } = renderModal();

    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(blurSpy).not.toHaveBeenCalled();

    unmount();

    expect(blurSpy).toHaveBeenCalledTimes(1);
  });

  it('renders the error state when the search fails', async () => {
    (searchService.find as jest.Mock).mockReturnValue(
      throwError(() => new Error('invalid license'))
    );

    renderModal();

    await runDebouncedSearch();

    expect(screen.getAllByTestId('nav-search-error').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('nav-search-no-results')).not.toBeInTheDocument();
  });

  it('replaces the error state with the character limit message when the input exceeds the limit', async () => {
    (searchService.find as jest.Mock).mockReturnValue(
      throwError(() => new Error('invalid license'))
    );

    renderModal(SMALL_SEARCH_CHAR_LIMIT);

    await runDebouncedSearch();

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByTestId('nav-search-input'));
    await user.paste('abc');

    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(screen.getAllByTestId('searchCharLimitExceededMessageHeading').length).toBeGreaterThan(
      0
    );
    expect(screen.queryByTestId('nav-search-error')).not.toBeInTheDocument();
  });
});
