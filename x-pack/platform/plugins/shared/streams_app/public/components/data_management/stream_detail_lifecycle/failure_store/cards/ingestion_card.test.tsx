/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { IngestionCard } from './ingestion_card';

const makeStats = (bytesPerDay: number) => ({
  bytesPerDoc: 10,
  bytesPerDay,
});

// Helper to ensure react-intl context is available
const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('IngestionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders daily & monthly averages with stats and privileges', () => {
    renderWithI18n(<IngestionCard hasPrivileges={true} stats={makeStats(1000)} />);

    expect(screen.getByTestId('failureStoreIngestionDaily-metric')).toHaveTextContent('1.0 KB');
    expect(screen.getByTestId('failureStoreIngestionMonthly-metric')).toHaveTextContent('30.0 KB'); // 1000B * 30 = 30000B = 30.0KB

    // There should be no warning icon when user has privileges
    expect(
      screen.queryByTestId('streamsInsufficientPrivileges-ingestionDaily')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('streamsInsufficientPrivileges-ingestionMonthly')
    ).not.toBeInTheDocument();
  });

  it('shows dash for both metrics when stats missing', () => {
    renderWithI18n(<IngestionCard hasPrivileges={true} />);

    expect(screen.getByTestId('failureStoreIngestionDaily-metric')).toHaveTextContent('-');
    expect(screen.getByTestId('failureStoreIngestionMonthly-metric')).toHaveTextContent('-');
  });

  it('shows dash when statsError present even if stats provided', () => {
    renderWithI18n(
      <IngestionCard hasPrivileges={true} stats={makeStats(2048)} statsError={new Error('boom')} />
    );

    expect(screen.getByTestId('failureStoreIngestionDaily-metric')).toHaveTextContent('-');
    expect(screen.getByTestId('failureStoreIngestionMonthly-metric')).toHaveTextContent('-');
  });

  it('shows dash when stats provided but bytesPerDay missing', () => {
    renderWithI18n(<IngestionCard hasPrivileges={true} stats={{ someOther: 1 } as any} />);

    expect(screen.getByTestId('failureStoreIngestionDaily-metric')).toHaveTextContent('-');
    expect(screen.getByTestId('failureStoreIngestionMonthly-metric')).toHaveTextContent('-');
  });

  it('renders a warning tooltip when lacking privileges', () => {
    renderWithI18n(<IngestionCard hasPrivileges={false} stats={makeStats(500)} />);

    // Should show warning icons when lacking privileges
    expect(screen.getByTestId('streamsInsufficientPrivileges-ingestionDaily')).toBeInTheDocument();
    expect(
      screen.getByTestId('streamsInsufficientPrivileges-ingestionMonthly')
    ).toBeInTheDocument();
  });
});
