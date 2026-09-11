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

const renderBanner = () =>
  render(
    <IntlProvider locale="en">
      <InboxAnnouncementBanner />
    </IntlProvider>
  );

describe('InboxAnnouncementBanner', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders title and description', () => {
    renderBanner();

    expect(
      screen.getByText('Introducing Inbox: every alert in one place')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "We've improved the alerts experience to work across alerting frameworks. Inbox includes alerts from v1, v2, and external sources so you can triage them in one place."
      )
    ).toBeInTheDocument();
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
