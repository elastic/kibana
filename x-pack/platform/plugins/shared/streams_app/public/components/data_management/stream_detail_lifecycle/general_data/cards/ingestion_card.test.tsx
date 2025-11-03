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
import type { EnhancedDataStreamStats } from '../../hooks/use_data_stream_stats';

const createMockStats = (bytesPerDay: number): EnhancedDataStreamStats => ({
  name: 'test-stream',
  userPrivileges: {
    canMonitor: true,
    canReadFailureStore: true,
    canManageFailureStore: false,
  },
  totalDocs: 1000,
  sizeBytes: 1000000,
  creationDate: 1672531200000,
  bytesPerDoc: 1000,
  bytesPerDay,
  size: '1.0 MB',
  hasFailureStore: true,
});

// Helper to ensure react-intl context is available
const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('IngestionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders daily & monthly averages with stats and privileges', () => {
    renderWithI18n(<IngestionCard hasMonitorPrivileges={true} stats={createMockStats(1048576)} />); // 1MB per day ;

    expect(screen.getByTestId('ingestionCard-title')).toBeInTheDocument();
    expect(screen.getByTestId('ingestion-daily-metric')).toHaveTextContent(/1(\.0)?\s?MB/);
    expect(screen.getByTestId('ingestion-monthly-metric')).toHaveTextContent(/3[01](\.\d)?\s?MB/);
    expect(screen.getByTestId('ingestion-daily-metric-subtitle')).toHaveTextContent(
      'Daily average'
    );
    expect(screen.getByTestId('ingestion-monthly-metric-subtitle')).toHaveTextContent(
      'Monthly average'
    );
  });

  it('shows dash for both metrics when stats missing', () => {
    renderWithI18n(<IngestionCard hasMonitorPrivileges={true} />);

    expect(screen.getByTestId('ingestion-daily-metric')).toHaveTextContent('-');
    expect(screen.getByTestId('ingestion-monthly-metric')).toHaveTextContent('-');
  });

  it('shows dash when statsError present even if stats provided', () => {
    renderWithI18n(
      <IngestionCard
        hasMonitorPrivileges={true}
        stats={createMockStats(2048)}
        statsError={new Error('boom')}
      />
    );

    expect(screen.getByTestId('ingestion-daily-metric')).toHaveTextContent('-');
    expect(screen.getByTestId('ingestion-monthly-metric')).toHaveTextContent('-');
  });

  it('shows dash when stats provided but bytesPerDay missing', () => {
    renderWithI18n(<IngestionCard hasMonitorPrivileges={true} stats={{ someOther: 1 } as any} />);

    expect(screen.getByTestId('ingestion-daily-metric')).toHaveTextContent('-');
    expect(screen.getByTestId('ingestion-monthly-metric')).toHaveTextContent('-');
  });

  it('renders zero when daily bytes is zero', () => {
    renderWithI18n(<IngestionCard hasMonitorPrivileges={true} stats={createMockStats(0)} />);

    expect(screen.getByTestId('ingestion-daily-metric')).toHaveTextContent('0.0 B');
    expect(screen.getByTestId('ingestion-monthly-metric')).toHaveTextContent('0.0 B');
  });

  it('formats large ingestion rates (GB scale)', () => {
    renderWithI18n(
      <IngestionCard hasMonitorPrivileges={true} stats={createMockStats(1073741824)} />
    ); // 1GB per day

    expect(screen.getByTestId('ingestion-daily-metric')).toHaveTextContent(/1(\.0)?\s?GB/);
    expect(screen.getByTestId('ingestion-monthly-metric')).toHaveTextContent(/3[12](\.\d)?\s?GB/);
  });

  it('shows warning icon without monitor privilege', () => {
    renderWithI18n(<IngestionCard hasMonitorPrivileges={false} stats={createMockStats(1000)} />);

    // Should show warning icons when lacking privileges
    expect(screen.getByTestId('streamsInsufficientPrivileges-ingestionDaily')).toBeInTheDocument();
    expect(
      screen.getByTestId('streamsInsufficientPrivileges-ingestionMonthly')
    ).toBeInTheDocument();
  });
});
