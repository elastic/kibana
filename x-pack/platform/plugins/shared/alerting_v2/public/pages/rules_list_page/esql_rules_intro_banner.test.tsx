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
  EsqlRulesIntroBanner,
  ESQL_RULES_INTRO_BANNER_DISMISSED_STORAGE_KEY,
} from './esql_rules_intro_banner';

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
      <EsqlRulesIntroBanner />
    </IntlProvider>
  );

describe('EsqlRulesIntroBanner', () => {
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

    expect(screen.getByAltText('Kibana Universal Alerting illustration')).toBeInTheDocument();
  });

  it('dismiss hides the banner and persists the dismissed state to localStorage', () => {
    renderBanner();

    expect(screen.getByTestId('esqlRulesIntroBanner')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('esqlRulesIntroBannerDismiss'));

    expect(screen.queryByTestId('esqlRulesIntroBanner')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(ESQL_RULES_INTRO_BANNER_DISMISSED_STORAGE_KEY)).toBe(
      'true'
    );
  });

  it('is hidden when the dismissed key is already set in localStorage', () => {
    window.localStorage.setItem(ESQL_RULES_INTRO_BANNER_DISMISSED_STORAGE_KEY, 'true');
    renderBanner();

    expect(screen.queryByTestId('esqlRulesIntroBanner')).not.toBeInTheDocument();
  });

  it('does not show the banner when hideAnnouncements is enabled', () => {
    mockToursIsEnabled.mockReturnValue(false);
    renderBanner();

    expect(screen.queryByTestId('esqlRulesIntroBanner')).not.toBeInTheDocument();
  });
});
