/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleLibraryEmptyState } from './rule_library_empty_state';

const mockGetUrlForApp = jest.fn(() => '/app/integrations');

jest.mock('@kbn/core-di-browser', () => ({
  useService: () => ({
    getUrlForApp: mockGetUrlForApp,
  }),
  CoreStart: (key: string) => key,
}));

describe('RuleLibraryEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the action-policy-style empty state with an Integrations button and docs placeholder', () => {
    render(
      <IntlProvider locale="en">
        <RuleLibraryEmptyState />
      </IntlProvider>
    );

    expect(screen.getByTestId('ruleLibraryEmptyPrompt')).toBeInTheDocument();
    expect(screen.getByTestId('ruleLibraryEmptyIllustration')).toBeInTheDocument();
    expect(screen.getByText('Get started with rule templates')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Rule templates are provided by Fleet integrations. Update or install integrations to view available rule templates.'
      )
    ).toBeInTheDocument();

    const integrationsButton = screen.getByTestId('ruleLibraryEmptyStateIntegrationsButton');
    expect(integrationsButton).toHaveTextContent('Go to Integrations');
    expect(integrationsButton).toHaveAttribute('href', '/app/integrations');
    expect(mockGetUrlForApp).toHaveBeenCalledWith('integrations');

    expect(screen.getByText('Need help?')).toBeInTheDocument();
    expect(screen.getByTestId('ruleLibraryEmptyStateDocLink')).toHaveAttribute('href', '#');
    expect(screen.getByTestId('ruleLibraryEmptyStateDocLink')).toHaveTextContent(
      'Read documentation'
    );
  });
});
