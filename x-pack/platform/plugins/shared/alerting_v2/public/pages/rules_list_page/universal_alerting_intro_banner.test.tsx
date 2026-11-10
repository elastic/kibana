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
  UniversalAlertingIntroBanner,
  UNIVERSAL_ALERTING_INTRO_BANNER_DISMISSED_STORAGE_KEY,
} from './universal_alerting_intro_banner';

const mockToursIsEnabled = jest.fn(() => true);
const COMPARE_ALERTING_SYSTEMS_DOC_URL =
  'https://www.elastic.co/docs/explore-analyze/alerting/compare-alerting-systems';

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    const services: Record<string, unknown> = {
      notifications: { tours: { isEnabled: mockToursIsEnabled } },
      docLinks: {
        links: {
          alerting: {
            compareAlertingSystems: COMPARE_ALERTING_SYSTEMS_DOC_URL,
          },
        },
      },
    };
    return services[token as string] ?? {};
  },
  CoreStart: (key: string) => key,
}));

const renderBanner = () =>
  render(
    <IntlProvider locale="en">
      <UniversalAlertingIntroBanner />
    </IntlProvider>
  );

describe('UniversalAlertingIntroBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToursIsEnabled.mockReturnValue(true);
    window.localStorage.clear();
  });

  it('renders title and description', () => {
    renderBanner();

    expect(screen.getByText('Introducing Kibana Universal Alerting')).toBeInTheDocument();
    expect(
      screen.getByText(
        "Bring your alerting needs together in one open, universal system. Detect the signals that matter, work with alerts as data, combine alerts across different sources and use cases, and control how they're managed, routed, and acted on."
      )
    ).toBeInTheDocument();
  });

  it('renders the illustration', () => {
    renderBanner();

    expect(
      screen.getByRole('img', { name: 'Kibana Universal Alerting illustration' })
    ).toBeInTheDocument();
  });

  it('renders a Learn more button that links to the compare alerting systems docs', () => {
    renderBanner();

    const learnMore = screen.getByTestId('universalAlertingIntroBannerLearnMore');
    expect(learnMore).toHaveTextContent('Learn more');
    expect(learnMore).toHaveAttribute('href', COMPARE_ALERTING_SYSTEMS_DOC_URL);
    expect(learnMore).toHaveAttribute('target', '_blank');
  });

  it('dismiss hides the banner and persists the dismissed state to localStorage', () => {
    renderBanner();

    expect(screen.getByTestId('universalAlertingIntroBanner')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('universalAlertingIntroBannerDismiss'));

    expect(screen.queryByTestId('universalAlertingIntroBanner')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(UNIVERSAL_ALERTING_INTRO_BANNER_DISMISSED_STORAGE_KEY)).toBe(
      'true'
    );
  });

  it('is hidden when the dismissed key is already set in localStorage', () => {
    window.localStorage.setItem(UNIVERSAL_ALERTING_INTRO_BANNER_DISMISSED_STORAGE_KEY, 'true');
    renderBanner();

    expect(screen.queryByTestId('universalAlertingIntroBanner')).not.toBeInTheDocument();
  });

  it('does not show the banner when hideAnnouncements is enabled', () => {
    mockToursIsEnabled.mockReturnValue(false);
    renderBanner();

    expect(screen.queryByTestId('universalAlertingIntroBanner')).not.toBeInTheDocument();
  });
});
