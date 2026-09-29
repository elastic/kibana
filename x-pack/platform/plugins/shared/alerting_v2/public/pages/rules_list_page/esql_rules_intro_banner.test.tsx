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
  ESQL_RULES_INTRO_DOC_URL,
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

    expect(screen.getByText('Introducing ES|QL rules')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Build rules with native ES|QL queries. ES|QL rules are the newer alternative to Standard rules, with a dedicated rules list, a shared alerts inbox, and centralized action policies for notifications.'
      )
    ).toBeInTheDocument();
  });

  it('renders the illustration', () => {
    renderBanner();

    expect(screen.getByAltText('ES|QL rules illustration')).toBeInTheDocument();
  });

  it('Learn more CTA has the placeholder docs href', () => {
    renderBanner();

    expect(screen.getByTestId('esqlRulesIntroBannerLearnMore')).toHaveAttribute(
      'href',
      ESQL_RULES_INTRO_DOC_URL
    );
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
