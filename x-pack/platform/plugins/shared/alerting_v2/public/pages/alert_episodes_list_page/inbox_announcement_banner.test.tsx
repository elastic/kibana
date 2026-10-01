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
  InboxAnnouncementBanner,
  INBOX_ANNOUNCEMENT_BANNER_DISMISSED_STORAGE_KEY,
} from './inbox_announcement_banner';

const mockGlobalClientGet = jest.fn(() => false);
const mockGetUrlForApp = jest.fn(
  (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path ?? ''}`
);

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    const services: Record<string, unknown> = {
      settings: { globalClient: { get: mockGlobalClientGet, set: jest.fn() } },
      application: { getUrlForApp: mockGetUrlForApp },
      notifications: { toasts: { addError: jest.fn() } },
    };
    return services[token as string] ?? {};
  },
  CoreStart: (key: string) => key,
}));

const renderBanner = () =>
  render(
    <IntlProvider locale="en">
      <InboxAnnouncementBanner />
    </IntlProvider>
  );

describe('InboxAnnouncementBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGlobalClientGet.mockReturnValue(false);
    window.localStorage.clear();
  });

  it('renders title and description', () => {
    renderBanner();

    expect(screen.getByText('Introducing a new alerts experience')).toBeInTheDocument();
    expect(
      screen.getByText(/We've improved the alerts experience to work across alerting frameworks/)
    ).toBeInTheDocument();
  });

  it('renders the Enable standard view link when Standard Alerts is disabled', () => {
    renderBanner();

    expect(screen.getByTestId('inboxAnnouncementBannerStandardLink')).toHaveTextContent(
      'Enable standard view'
    );
  });

  it('opens the confirm modal with Advanced Settings path and Enabled standard view CTA', () => {
    renderBanner();

    fireEvent.click(screen.getByTestId('inboxAnnouncementBannerStandardLink'));

    expect(screen.getByTestId('inboxAnnouncementBannerStandardConfirmModal')).toBeInTheDocument();
    expect(screen.getByTestId('confirmModalConfirmButton')).toHaveTextContent(
      'Enabled standard view'
    );
    expect(screen.getByTestId('inboxAnnouncementBannerAdvancedSettingsLink')).toHaveAttribute(
      'href',
      `/app/management/kibana/settings?query=${encodeURIComponent('Standard alerts experience')}`
    );
    expect(screen.getByText(/Alerting → Standard alerts experience/)).toBeInTheDocument();
  });

  it('renders the medium announcement illustration', () => {
    renderBanner();

    expect(screen.getByTestId('inboxAnnouncementBannerIllustration')).toBeInTheDocument();
  });

  it('dismiss hides the banner and persists the dismissed state to localStorage', () => {
    renderBanner();

    expect(screen.getByTestId('inboxAnnouncementBanner')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('inboxAnnouncementBannerDismiss'));

    expect(screen.queryByTestId('inboxAnnouncementBanner')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(INBOX_ANNOUNCEMENT_BANNER_DISMISSED_STORAGE_KEY)).toBe(
      'true'
    );
  });

  it('is hidden when the dismissed key is already set in localStorage', () => {
    window.localStorage.setItem(INBOX_ANNOUNCEMENT_BANNER_DISMISSED_STORAGE_KEY, 'true');
    renderBanner();

    expect(screen.queryByTestId('inboxAnnouncementBanner')).not.toBeInTheDocument();
  });
});
