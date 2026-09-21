/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { I18nProvider } from '@kbn/i18n-react';
import { useKibana } from '../../hooks/use_kibana';
import { useSignificantEventsAvailability } from '../../hooks/use_significant_events_availability';
import { SettingsPage } from './page';

jest.mock('../../hooks/use_kibana');
jest.mock('../../hooks/use_significant_events_availability');
jest.mock('../significant_events/components/settings/tab', () => ({
  SettingsTab: () => null,
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSignificantEventsAvailability =
  useSignificantEventsAvailability as jest.MockedFunction<typeof useSignificantEventsAvailability>;

const getUrlForApp = jest.fn().mockReturnValue('/app/nightshift');
const navigateToApp = jest.fn();
const setBreadcrumbs = jest.fn();

const setCapabilities = (canConfigure: boolean) => {
  mockUseKibana.mockReturnValue({
    core: {
      application: {
        capabilities: { nightshift: { configure: canConfigure } },
        getUrlForApp,
        navigateToApp,
      },
      chrome: { setBreadcrumbs },
    },
  } as never);
};

const renderPage = () =>
  render(
    <I18nProvider>
      <SettingsPage />
    </I18nProvider>
  );

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setCapabilities(true);
    mockUseSignificantEventsAvailability.mockReturnValue({
      availability: { available: true },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSignificantEventsAvailability>);
  });

  it('redirects users without configure permission to Nightshift', async () => {
    setCapabilities(false);

    renderPage();

    await waitFor(() => {
      expect(navigateToApp).toHaveBeenCalledWith(NIGHTSHIFT_APP_ID);
    });
  });

  it('renders the loading and unavailable states', () => {
    mockUseSignificantEventsAvailability.mockReturnValue({
      availability: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useSignificantEventsAvailability>);
    const { rerender } = renderPage();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    mockUseSignificantEventsAvailability.mockReturnValue({
      availability: { available: false, reason: 'license' },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSignificantEventsAvailability>);
    rerender(
      <I18nProvider>
        <SettingsPage />
      </I18nProvider>
    );

    expect(screen.getByTestId('significantEventsNotEnabledPrompt')).toBeInTheDocument();
  });
});
