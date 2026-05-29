/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applicationServiceMock, coreMock } from '@kbn/core/public/mocks';
import { globalSearchPluginMock } from '@kbn/global-search-plugin/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { of } from 'rxjs';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import { EventReporter } from '../telemetry';
import { SearchModalInternal } from './search_modal_internal';

jest.mock(
  'react-virtualized-auto-sizer',
  () =>
    ({ children }: any) =>
      children({ height: 600, width: 600 })
);

jest.useFakeTimers({ legacyFakeTimers: true });

describe('SearchModalInternal', () => {
  const usageCollection = usageCollectionPluginMock.createSetupContract();
  const core = coreMock.createStart();
  const basePathUrl = '/plugins/globalSearchBar/assets/';
  let searchService: ReturnType<typeof globalSearchPluginMock.createStartContract>;
  let applications: ReturnType<typeof applicationServiceMock.createStartContract>;
  let eventReporter: EventReporter;

  beforeEach(() => {
    applications = applicationServiceMock.createStartContract();
    searchService = globalSearchPluginMock.createStartContract();

    (searchService.getSearchableTypes as jest.Mock).mockResolvedValue(['application']);
    (searchService.find as jest.Mock).mockReturnValue(of({ results: [] }));

    eventReporter = new EventReporter({ analytics: core.analytics, usageCollection });
    jest.clearAllMocks();
  });

  it('renders the search input and footer', () => {
    render(
      <IntlProvider locale="en">
        <SearchModalInternal
          globalSearch={{ ...searchService, searchCharLimit: 1000 }}
          navigateToUrl={applications.navigateToUrl}
          basePathUrl={basePathUrl}
          reportEvent={eventReporter}
          onClose={jest.fn()}
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('chromeProjectNextSearchModalInput')).toBeInTheDocument();
    expect(screen.getByTestId('chromeProjectNextSearchModalFooter')).toBeInTheDocument();
  });

  it('reports searchFocus on mount and searchBlur on unmount', () => {
    const focusSpy = jest.spyOn(eventReporter, 'searchFocus');
    const blurSpy = jest.spyOn(eventReporter, 'searchBlur');

    const { unmount } = render(
      <IntlProvider locale="en">
        <SearchModalInternal
          globalSearch={{ ...searchService, searchCharLimit: 1000 }}
          navigateToUrl={applications.navigateToUrl}
          basePathUrl={basePathUrl}
          reportEvent={eventReporter}
          onClose={jest.fn()}
        />
      </IntlProvider>
    );

    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(blurSpy).not.toHaveBeenCalled();

    unmount();

    expect(blurSpy).toHaveBeenCalledTimes(1);
  });
});
