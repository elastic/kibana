/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ContextLandingPage } from './context_landing_page';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </EuiProvider>
    </I18nProvider>
  );

describe('ContextLandingPage', () => {
  it('renders the landing page with create button and skeleton cards', () => {
    renderWithProviders(<ContextLandingPage />);

    expect(screen.getByTestId('contextLandingPage')).toBeInTheDocument();

    const createButton = screen.getByTestId('contextCreateAiIndexButton');
    expect(createButton).toBeInTheDocument();
    expect(createButton).toHaveTextContent('Create AI Index');

    expect(screen.getAllByTestId('contextAiIndexCard')).toHaveLength(3);
  });
});
