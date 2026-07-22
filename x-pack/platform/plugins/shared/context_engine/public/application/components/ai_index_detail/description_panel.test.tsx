/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { DescriptionPanel } from './description_panel';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

const EMPTY_FALLBACK = /No sources yet/;

describe('DescriptionPanel', () => {
  it('renders the provided description when not loading', () => {
    renderWithProviders(<DescriptionPanel isLoading={false} description="My custom description" />);

    expect(screen.getByText('My custom description')).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_FALLBACK)).not.toBeInTheDocument();
  });

  it('renders the empty fallback when no description is provided', () => {
    renderWithProviders(<DescriptionPanel isLoading={false} />);

    expect(screen.getByText(EMPTY_FALLBACK)).toBeInTheDocument();
  });

  it('does not render the description text while loading', () => {
    renderWithProviders(<DescriptionPanel isLoading description="My custom description" />);

    expect(screen.queryByText('My custom description')).not.toBeInTheDocument();
    expect(screen.queryByText(EMPTY_FALLBACK)).not.toBeInTheDocument();
  });
});
