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

const makeStats = (bytesPerDay: number, perDayDocs: number = 100) => ({
  bytesPerDoc: 10,
  bytesPerDay,
  perDayDocs,
});

// Helper to ensure react-intl context is available
const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('IngestionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('daily period', () => {
    it('renders daily average with stats and privileges', () => {
      renderWithI18n(<IngestionCard period="daily" hasPrivileges={true} stats={makeStats(1000)} />);

      expect(screen.getByTestId('failureStoreIngestion-daily-metric')).toHaveTextContent('1.0 KB');

      // There should be no warning icon when user has privileges
      expect(
        screen.queryByTestId('streamsInsufficientPrivileges-ingestionDaily')
      ).not.toBeInTheDocument();
    });

    it('shows dash when stats missing', () => {
      renderWithI18n(<IngestionCard period="daily" hasPrivileges={true} />);

      expect(screen.getByTestId('failureStoreIngestion-daily-metric')).toHaveTextContent('-');
    });

    it('shows dash when statsError present even if stats provided', () => {
      renderWithI18n(
        <IngestionCard
          period="daily"
          hasPrivileges
          stats={makeStats(2048)}
          statsError={new Error('boom')}
        />
      );

      expect(screen.getByTestId('failureStoreIngestion-daily-metric')).toHaveTextContent('-');
    });

    it('shows dash when stats provided but bytesPerDay missing', () => {
      renderWithI18n(
        <IngestionCard period="daily" hasPrivileges stats={{ someOther: 1 } as any} />
      );

      expect(screen.getByTestId('failureStoreIngestion-daily-metric')).toHaveTextContent('-');
    });

    it('renders a warning tooltip when lacking privileges', () => {
      renderWithI18n(<IngestionCard period="daily" hasPrivileges={false} stats={makeStats(500)} />);

      // Should show warning icon when lacking privileges
      expect(
        screen.getByTestId('streamsInsufficientPrivileges-ingestionDaily')
      ).toBeInTheDocument();
    });
  });

  describe('monthly period', () => {
    it('renders monthly average with stats and privileges', () => {
      renderWithI18n(<IngestionCard period="monthly" hasPrivileges stats={makeStats(1000)} />);

      // 1000B * 30 = 30000B = 30.0KB
      expect(screen.getByTestId('failureStoreIngestion-monthly-metric')).toHaveTextContent(
        '30.0 KB'
      );

      // There should be no warning icon when user has privileges
      expect(
        screen.queryByTestId('streamsInsufficientPrivileges-ingestionMonthly')
      ).not.toBeInTheDocument();
    });

    it('shows dash when stats missing', () => {
      renderWithI18n(<IngestionCard period="monthly" hasPrivileges />);

      expect(screen.getByTestId('failureStoreIngestion-monthly-metric')).toHaveTextContent('-');
    });

    it('shows dash when statsError present even if stats provided', () => {
      renderWithI18n(
        <IngestionCard
          period="monthly"
          hasPrivileges
          stats={makeStats(2048)}
          statsError={new Error('boom')}
        />
      );

      expect(screen.getByTestId('failureStoreIngestion-monthly-metric')).toHaveTextContent('-');
    });

    it('renders a warning tooltip when lacking privileges', () => {
      renderWithI18n(
        <IngestionCard period="monthly" hasPrivileges={false} stats={makeStats(500)} />
      );

      // Should show warning icon when lacking privileges
      expect(
        screen.getByTestId('streamsInsufficientPrivileges-ingestionMonthly')
      ).toBeInTheDocument();
    });
  });
});
