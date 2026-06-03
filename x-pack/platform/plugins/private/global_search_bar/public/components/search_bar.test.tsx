/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeStyle } from '@kbn/core-chrome-browser';
import { applicationServiceMock, coreMock } from '@kbn/core/public/mocks';
import { globalSearchPluginMock } from '@kbn/global-search-plugin/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { of } from 'rxjs';
import { EventReporter } from '../telemetry';
import { SearchBar } from './search_bar';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';

jest.mock(
  'react-virtualized-auto-sizer',
  () =>
    ({ children }: any) =>
      children({ height: 600, width: 600 })
);

jest.useFakeTimers({ legacyFakeTimers: true });

describe('SearchBar (UI wiring)', () => {
  const usageCollection = usageCollectionPluginMock.createSetupContract();
  const core = coreMock.createStart();
  const basePathUrl = '/plugins/globalSearchBar/assets/';
  let searchService: ReturnType<typeof globalSearchPluginMock.createStartContract>;
  let applications: ReturnType<typeof applicationServiceMock.createStartContract>;
  let eventReporter: EventReporter;

  beforeEach(() => {
    applications = applicationServiceMock.createStartContract();
    searchService = globalSearchPluginMock.createStartContract();

    // Keep the component stable when focus triggers initial load/search
    (searchService.getSearchableTypes as jest.Mock).mockResolvedValue(['application']);
    (searchService.find as jest.Mock).mockReturnValue(of({ results: [] }));

    eventReporter = new EventReporter({ analytics: core.analytics, usageCollection });
    jest.clearAllMocks();
  });

  it('classic: keyboard shortcut focuses the input', async () => {
    const shortcutUsedSpy = jest.spyOn(eventReporter, 'shortcutUsed');
    render(
      <IntlProvider locale="en">
        <SearchBar
          globalSearch={{ ...searchService, searchCharLimit: 1000 }}
          navigateToUrl={applications.navigateToUrl}
          basePathUrl={basePathUrl}
          chromeStyle$={of<ChromeStyle>('classic')}
          reportEvent={eventReporter}
        />
      </IntlProvider>
    );

    act(() => {
      fireEvent.keyDown(window, { key: '/', ctrlKey: true, metaKey: true });
    });
    const input = await screen.findByTestId('nav-search-input');
    expect(document.activeElement).toEqual(input);
    expect(shortcutUsedSpy).toHaveBeenCalledTimes(1);
  });

  it('project: starts collapsed and can be revealed/hidden via buttons', async () => {
    render(
      <IntlProvider locale="en">
        <SearchBar
          globalSearch={{ ...searchService, searchCharLimit: 1000 }}
          navigateToUrl={applications.navigateToUrl}
          basePathUrl={basePathUrl}
          chromeStyle$={of<ChromeStyle>('project')}
          reportEvent={eventReporter}
        />
      </IntlProvider>
    );

    // collapsed state
    expect(await screen.findByTestId('nav-search-reveal')).toBeInTheDocument();
    expect(screen.queryByTestId('nav-search-input')).not.toBeInTheDocument();
    // reveal
    fireEvent.click(await screen.findByTestId('nav-search-reveal'));
    expect(await screen.findByTestId('nav-search-input')).toBeInTheDocument();
    // hide
    fireEvent.click(await screen.findByTestId('nav-search-conceal'));
    expect(screen.queryByTestId('nav-search-input')).not.toBeInTheDocument();
  });

  it('project: keyboard shortcut reveals and focuses the input when collapsed', async () => {
    const shortcutUsedSpy = jest.spyOn(eventReporter, 'shortcutUsed');
    render(
      <IntlProvider locale="en">
        <SearchBar
          globalSearch={{ ...searchService, searchCharLimit: 1000 }}
          navigateToUrl={applications.navigateToUrl}
          basePathUrl={basePathUrl}
          chromeStyle$={of<ChromeStyle>('project')}
          reportEvent={eventReporter}
        />
      </IntlProvider>
    );

    expect(await screen.findByTestId('nav-search-reveal')).toBeInTheDocument();
    act(() => {
      fireEvent.keyDown(window, { key: '/', ctrlKey: true, metaKey: true });
    });
    const input = await screen.findByTestId('nav-search-input');
    expect(document.activeElement).toEqual(input);
    expect(shortcutUsedSpy).toHaveBeenCalledTimes(1);
  });
});
