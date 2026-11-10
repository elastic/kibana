/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  NewAlertingExperienceBanner,
  NEW_ALERTING_EXPERIENCE_BANNER_DISMISSED_STORAGE_KEY,
} from './new_alerting_experience_banner';

const mockToursIsEnabled = jest.fn(() => true);

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    const services: Record<string, unknown> = {
      notifications: { tours: { isEnabled: mockToursIsEnabled } },
    };
    return services[token as string] ?? {};
  },
  CoreStart: (key: string) => key,
}));

const renderBanner = () =>
  render(
    <IntlProvider locale="en">
      <NewAlertingExperienceBanner />
    </IntlProvider>
  );

describe('NewAlertingExperienceBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToursIsEnabled.mockReturnValue(true);
    window.localStorage.clear();
  });

  it('renders title and description', () => {
    renderBanner();

    expect(screen.getByText('Introducing a new alerts experience')).toBeInTheDocument();
    expect(screen.getByText(/triage them in one place/)).toBeInTheDocument();
  });

  it('renders the illustration', () => {
    renderBanner();

    expect(
      screen.getByRole('img', { name: 'New alerts experience illustration' })
    ).toBeInTheDocument();
  });

  it('is hidden when tours.isEnabled() returns false', () => {
    mockToursIsEnabled.mockReturnValue(false);
    renderBanner();

    expect(screen.queryByTestId('newAlertingExperienceBanner')).not.toBeInTheDocument();
  });

  it('dismiss hides the banner and persists the dismissed state to localStorage', () => {
    renderBanner();

    expect(screen.getByTestId('newAlertingExperienceBanner')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('newAlertingExperienceBannerDismiss'));

    expect(screen.queryByTestId('newAlertingExperienceBanner')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(NEW_ALERTING_EXPERIENCE_BANNER_DISMISSED_STORAGE_KEY)).toBe(
      'true'
    );
  });

  it('does not write to localStorage before dismissal', () => {
    renderBanner();

    expect(
      window.localStorage.getItem(NEW_ALERTING_EXPERIENCE_BANNER_DISMISSED_STORAGE_KEY)
    ).toBeNull();
  });

  it('stays hidden after a remount once dismissed', () => {
    const { unmount } = renderBanner();

    fireEvent.click(screen.getByTestId('newAlertingExperienceBannerDismiss'));
    unmount();
    renderBanner();

    expect(screen.queryByTestId('newAlertingExperienceBanner')).not.toBeInTheDocument();
  });

  it('is hidden when the dismissed key is already set in localStorage', () => {
    window.localStorage.setItem(NEW_ALERTING_EXPERIENCE_BANNER_DISMISSED_STORAGE_KEY, 'true');
    renderBanner();

    expect(screen.queryByTestId('newAlertingExperienceBanner')).not.toBeInTheDocument();
  });

  it('still renders when localStorage contains a malformed value', () => {
    window.localStorage.setItem(
      NEW_ALERTING_EXPERIENCE_BANNER_DISMISSED_STORAGE_KEY,
      'not-valid-json'
    );
    renderBanner();

    expect(screen.getByTestId('newAlertingExperienceBanner')).toBeInTheDocument();
  });
});
