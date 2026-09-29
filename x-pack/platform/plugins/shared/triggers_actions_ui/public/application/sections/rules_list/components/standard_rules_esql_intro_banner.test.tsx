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
  StandardRulesEsqlIntroBanner,
  STANDARD_RULES_ESQL_INTRO_BANNER_DISMISSED_STORAGE_KEY,
  STANDARD_RULES_ESQL_INTRO_DOC_URL,
} from './standard_rules_esql_intro_banner';

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      http: {
        basePath: {
          prepend: (path: string) => `/mock${path}`,
        },
      },
    },
  }),
}));

const renderBanner = () =>
  render(
    <IntlProvider locale="en">
      <StandardRulesEsqlIntroBanner />
    </IntlProvider>
  );

describe('StandardRulesEsqlIntroBanner', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders title, ES|QL rules link, and learn more link', () => {
    renderBanner();

    expect(screen.getByText('Introducing ES|QL rules')).toBeInTheDocument();
    expect(screen.getByTestId('standardRulesEsqlIntroBannerEsqlLink')).toHaveAttribute(
      'href',
      '/mock/app/management/alertingV2/rules'
    );
    expect(screen.getByTestId('standardRulesEsqlIntroBannerLearnMoreLink')).toHaveAttribute(
      'href',
      STANDARD_RULES_ESQL_INTRO_DOC_URL
    );
  });

  it('dismiss hides the banner and persists the dismissed state', () => {
    renderBanner();

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(screen.queryByTestId('standardRulesEsqlIntroBanner')).not.toBeInTheDocument();
    expect(
      window.localStorage.getItem(STANDARD_RULES_ESQL_INTRO_BANNER_DISMISSED_STORAGE_KEY)
    ).toBe('true');
  });

  it('is hidden when already dismissed', () => {
    window.localStorage.setItem(STANDARD_RULES_ESQL_INTRO_BANNER_DISMISSED_STORAGE_KEY, 'true');
    renderBanner();

    expect(screen.queryByTestId('standardRulesEsqlIntroBanner')).not.toBeInTheDocument();
  });
});
